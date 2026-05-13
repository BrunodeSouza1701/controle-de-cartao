import * as jose from "jose";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  /** E-mail único autorizado a usar a API (ex.: controle.cartao2026@gmail.com) */
  ALLOWED_EMAIL: string;
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
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
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

async function verifyFirebaseIdToken(
  idToken: string,
  env: Env,
): Promise<{ uid: string; email: string } | null> {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const allowed = env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!projectId || !allowed) return null;

  try {
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email || email !== allowed) return null;

    if (payload.email_verified === false) return null;

    const uid = typeof payload.sub === "string" ? payload.sub : "";
    if (!uid) return null;

    return { uid, email };
  } catch {
    return null;
  }
}

function bearerIdToken(req: Request): string {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

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

async function readState(env: Env, uid: string): Promise<AppState> {
  const accessToken = await getGoogleAccessToken(env);
  const userPath = `userdata/${uid}`;

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

async function writeState(env: Env, uid: string, state: AppState): Promise<void> {
  const pid = env.FIREBASE_PROJECT_ID?.trim();
  if (!pid) throw new Error("FIREBASE_PROJECT_ID ausente");

  const accessToken = await getGoogleAccessToken(env);
  const relativePath = `userdata/${uid}`;
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

    const idToken = bearerIdToken(req);
    if (!idToken) {
      return unauthorized(env, req, "missing_id_token");
    }

    const session = await verifyFirebaseIdToken(idToken, env);
    if (!session) {
      return unauthorized(env, req, "invalid_or_forbidden");
    }

    const url = new URL(req.url);
    if (url.pathname.replace(/\/$/, "") !== "/state") {
      return json({ error: "not_found" }, env, req, 404);
    }

    try {
      if (req.method === "GET") {
        const state = await readState(env, session.uid);
        return json(state, env, req);
      }

      if (req.method === "PUT") {
        const body = (await req.json()) as Partial<AppState>;
        const state: AppState = {
          compras: Array.isArray(body.compras) ? body.compras : [],
          orcamentos: Array.isArray(body.orcamentos) ? body.orcamentos : [],
          fechamentosCartao:
            body.fechamentosCartao && typeof body.fechamentosCartao === "object"
              ? (body.fechamentosCartao as AppState["fechamentosCartao"])
              : { global: {}, mensal: {} },
        };
        await writeState(env, session.uid, state);
        return json({ ok: true }, env, req);
      }

      return json({ error: "method_not_allowed" }, env, req, 405);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      return json({ error: "server_error", message: msg }, env, req, 500);
    }
  },
};
