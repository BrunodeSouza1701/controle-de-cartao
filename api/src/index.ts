import * as jose from "jose";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  /** Usuário autorizado a usar a API */
  AUTH_USERNAME: string;
  /** Senha do usuário autorizado */
  AUTH_PASSWORD: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

const LEGACY_DOC = "sync/state";
const DATA_FIELD = "payload";

const JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

type AppState = {
  compras: unknown[];
  orcamentos: unknown[];
  fechamentosCartao: {
    global?: Record<string, { inicio: number }>;
    mensal?: Record<string, Record<string, { inicio: number }>>;
  };
};

const emptyState = (): AppState => ({
  compras: [],
  orcamentos: [],
  fechamentosCartao: { global: {}, mensal: {} },
});

let cachedAccess: { token: string; exp: number } | null = null;

function corsHeaders(env: Env, req: Request): HeadersInit {
  const configured = env.ALLOWED_ORIGIN?.trim();
  const originHeader = req.headers.get("Origin") || "";

  let allowOrigin: string;
  if (configured && configured !== "") {
    if (configured === "*") {
      allowOrigin = originHeader || "*";
    } else {
      allowOrigin = configured;
    }
  } else {
    allowOrigin = originHeader || "*";
  }

  const headers: HeadersInit = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (allowOrigin !== "*") {
    // Permitir credenciais quando a origem for específica
    (headers as any)["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

function json(data: unknown, env: Env, req: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env, req) },
  });
}

function unauthorized(env: Env, req: Request, reason = "unauthorized"): Response {
  return json({ error: reason }, env, req, 401);
}

function verifyBasicAuth(req: Request, env: Env): boolean {
  const auth = req.headers.get("Authorization") || "";
  
  if (!auth.startsWith("Basic ")) {
    return false;
  }
  
  const base64 = auth.slice(6).trim();
  let decoded = "";
  
  try {
    decoded = atob(base64);
  } catch {
    return false;
  }
  
  const [username, password] = decoded.split(":");
  
  const validUsername = env.AUTH_USERNAME?.trim() || "";
  const validPassword = env.AUTH_PASSWORD?.trim() || "";
  
  if (!validUsername || !validPassword) return false;
  
  return username === validUsername && password === validPassword;
}

function maskSecret(s?: string | null): string | null {
  if (!s) return null;
  if (s.length <= 2) return '*'.repeat(s.length);
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
}

// UID fixo para o usuário único
const FIXED_UID = "admin-user-001";

async function getGoogleAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccess && cachedAccess.exp > now + 60) return cachedAccess.token;

  if (!env.FIREBASE_PRIVATE_KEY) {
    throw new Error("FIREBASE_PRIVATE_KEY not configured");
  }
  
  const pem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const key = await jose.importPKCS8(pem, "RS256");
  const jwt = await new jose.SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oauth2 token failed: ${res.status} ${t}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const exp = now + (data.expires_in ?? 3500);
  cachedAccess = { token: data.access_token, exp };
  return data.access_token;
}

function docUrl(projectId: string, relativePath: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${relativePath}`;
}

function parseFirestorePayload(doc: { fields?: { [k: string]: { stringValue?: string } } }): AppState | null {
  const raw = doc.fields?.[DATA_FIELD]?.stringValue;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      compras: Array.isArray(parsed.compras) ? parsed.compras : [],
      orcamentos: Array.isArray(parsed.orcamentos) ? parsed.orcamentos : [],
      fechamentosCartao:
        parsed.fechamentosCartao && typeof parsed.fechamentosCartao === "object"
          ? parsed.fechamentosCartao
          : { global: {}, mensal: {} },
    };
  } catch {
    return null;
  }
}

async function fetchUserDocument(
  env: Env,
  accessToken: string,
  relativePath: string,
): Promise<{ exists: boolean; state: AppState | null }> {
  const pid = env.FIREBASE_PROJECT_ID?.trim();
  if (!pid) throw new Error("FIREBASE_PROJECT_ID ausente");

  const res = await fetch(docUrl(pid, relativePath), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return { exists: false, state: null };

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`firestore get ${res.status}: ${t}`);
  }

  const doc = (await res.json()) as { fields?: { [k: string]: { stringValue?: string } } };
  const parsed = parseFirestorePayload(doc);
  return { exists: true, state: parsed ?? emptyState() };
}

// Armazenamento temporário em memória (será perdido ao reiniciar o Worker)
// TODO: Migrar para Cloudflare KV ou Durable Objects para persistência
let inMemoryState: AppState = emptyState();

async function readState(env: Env): Promise<AppState> {
  try {
    const token = await getGoogleAccessToken(env);
    const { exists, state } = await fetchUserDocument(env, token, LEGACY_DOC);
    if (!exists) {
      // Se não existir no Firestore, inicializa com estado vazio e grava
      const init = emptyState();
      await writeState(env, init);
      return init;
    }
    const final = state ?? emptyState();
    inMemoryState = final;
    return final;
  } catch (error) {
    console.error("readState failed, using in-memory fallback", error);
    return inMemoryState;
  }
}

async function writeState(env: Env, state: AppState): Promise<void> {
  // Atualiza armazenamento em memória imediatamente
  inMemoryState = state;

  const pid = env.FIREBASE_PROJECT_ID?.trim();
  if (!pid) throw new Error("FIREBASE_PROJECT_ID ausente");

  const token = await getGoogleAccessToken(env);
  const url = docUrl(pid, LEGACY_DOC);
  const body = JSON.stringify({ fields: { [DATA_FIELD]: { stringValue: JSON.stringify(state) } } });

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body,
  });

  if (res.status === 404) {
    // Documento não existe — tentar criar no collection parent
    const parts = LEGACY_DOC.split("/");
    const docId = parts.pop() as string;
    const parent = parts.join("/");
    const createUrl = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/${parent}?documentId=${encodeURIComponent(
      docId,
    )}`;

    const res2 = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res2.ok) {
      const t = await res2.text();
      throw new Error(`firestore create ${res2.status}: ${t}`);
    }
    return;
  }

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`firestore write ${res.status}: ${t}`);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, req) });
    }

    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/$/, "");

    if (pathname === "/debug-firestore" && req.method === "GET") {
      try {
        const token = await getGoogleAccessToken(env);
        const { exists } = await fetchUserDocument(env, token, LEGACY_DOC);

        let created = false;
        if (!exists) {
          await writeState(env, emptyState());
          created = true;
        }

        return json(
          {
            firestore_ok: true,
            document_exists: true,
            created,
            firebase_project_id: env.FIREBASE_PROJECT_ID ?? null,
            firebase_client_email: !!env.FIREBASE_CLIENT_EMAIL,
            allowed_origin: env.ALLOWED_ORIGIN ?? null,
          },
          env,
          req,
        );
      } catch (error) {
        return json(
          {
            firestore_ok: false,
            error: error instanceof Error ? error.message : String(error),
            firebase_project_id: env.FIREBASE_PROJECT_ID ?? null,
            firebase_client_email: !!env.FIREBASE_CLIENT_EMAIL,
            allowed_origin: env.ALLOWED_ORIGIN ?? null,
          },
          env,
          req,
        );
      }
    }

    if (!verifyBasicAuth(req, env)) {
      return unauthorized(env, req, "invalid_credentials");
    }

    try {
      // Endpoint: GET /state - Buscar estado completo
      if (pathname === "/state" && req.method === "GET") {
        const state = await readState(env);
        return json(state, env, req);
      }

      // Endpoint: PUT /state - Substituir estado completo
      if (pathname === "/state" && req.method === "PUT") {
        const body = (await req.json()) as Partial<AppState>;
        const state: AppState = {
          compras: Array.isArray(body.compras) ? body.compras : [],
          orcamentos: Array.isArray(body.orcamentos) ? body.orcamentos : [],
          fechamentosCartao:
            body.fechamentosCartao && typeof body.fechamentosCartao === "object"
              ? (body.fechamentosCartao as AppState["fechamentosCartao"])
              : { global: {}, mensal: {} },
        };
        await writeState(env, state);
        return json({ ok: true }, env, req);
      }

      // Endpoint: POST /compra - Adicionar uma compra (para automação)
      if (pathname === "/compra" && req.method === "POST") {
        const body = (await req.json()) as {
          data: string;
          valor: number;
          descricao: string;
          tipo: string;
          cartao: string;
          tipoCompra: string;
          parcelas?: number;
          parcelaAtual?: number;
        };

        // Validar campos obrigatórios
        if (!body.data || !body.valor || !body.descricao || !body.cartao) {
          return json({ error: "campos_obrigatorios", message: "data, valor, descricao e cartao são obrigatórios" }, env, req, 400);
        }

        // Buscar estado atual
        const state = await readState(env);

        // Criar nova compra
        const novaCompra = {
          id: Date.now(),
          data: body.data,
          valor: body.valor,
          descricao: body.descricao,
          tipo: body.tipo || "Outros",
          cartao: body.cartao,
          tipoCompra: body.tipoCompra || "avista",
          parcelas: body.parcelas || 1,
          parcelaAtual: body.parcelaAtual || 1,
        };

        // Adicionar à lista de compras
        state.compras.push(novaCompra);

        // Salvar estado atualizado
        await writeState(env, state);

        return json({ ok: true, compra: novaCompra }, env, req, 201);
      }

      // Endpoint: GET /debug - Verifica se as variáveis de ambiente estão carregadas (senha mascarada)
      if (pathname === "/debug" && req.method === "GET") {
        return json(
          {
            auth_username_present: !!env.AUTH_USERNAME?.trim(),
            auth_username_masked: maskSecret(env.AUTH_USERNAME ?? null),
            has_password: !!env.AUTH_PASSWORD?.trim(),
            allowed_origin: env.ALLOWED_ORIGIN ?? null,
          },
          env,
          req,
        );
      }

      return json({ error: "not_found" }, env, req, 404);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      return json({ error: "server_error", message: msg }, env, req, 500);
    }
  },
};
