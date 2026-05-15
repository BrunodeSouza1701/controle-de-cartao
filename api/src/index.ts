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

function corsHeaders(env: Env, _req: Request): HeadersInit {
  const allowed = env.ALLOWED_ORIGIN?.trim() || "*";
  return {
    "Access-Control-Allow-Origin": allowed === "" ? "*" : allowed,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
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

// UID fixo para o usuário único
const FIXED_UID = "admin-user-001";

async function getGoogleAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccess && cachedAccess.exp > now + 60) return cachedAccess.token;

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
    headers: { Authorization: `Bearer ${accessToken}` },
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

async function readState(env: Env): Promise<AppState> {
  const accessToken = await getGoogleAccessToken(env);
  const userPath = `userdata/${FIXED_UID}`;

  const userDoc = await fetchUserDocument(env, accessToken, userPath);
  if (userDoc.exists) {
    return userDoc.state ?? emptyState();
  }

  const legacy = await fetchUserDocument(env, accessToken, LEGACY_DOC);
  if (legacy.exists && legacy.state) {
    return legacy.state;
  }

  return emptyState();
}

async function writeState(env: Env, state: AppState): Promise<void> {
  const pid = env.FIREBASE_PROJECT_ID?.trim();
  if (!pid) throw new Error("FIREBASE_PROJECT_ID ausente");

  const accessToken = await getGoogleAccessToken(env);
  const relativePath = `userdata/${FIXED_UID}`;
  const stringValue = JSON.stringify(state);
  const body = {
    fields: {
      [DATA_FIELD]: { stringValue: stringValue },
    },
  };

  const url = `${docUrl(pid, relativePath)}?updateMask.fieldPaths=${encodeURIComponent(DATA_FIELD)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`firestore patch ${res.status}: ${t}`);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, req) });
    }

    if (!verifyBasicAuth(req, env)) {
      return unauthorized(env, req, "invalid_credentials");
    }

    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/$/, "");

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

      return json({ error: "not_found" }, env, req, 404);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      return json({ error: "server_error", message: msg }, env, req, 500);
    }
  },
};
