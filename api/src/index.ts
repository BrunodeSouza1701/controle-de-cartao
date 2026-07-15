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
  PLUGGY_CLIENT_ID?: string;
  PLUGGY_CLIENT_SECRET?: string;
  PLUGGY_ITAU_ITEM_ID?: string;
}

const LEGACY_DOC = "sync/state";
const DATA_FIELD = "payload";

const JWKS = jose.createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

type AppState = {
  compras: unknown[];
  orcamentos: unknown[];
  regrasCategoria: Record<string, string>;
  fechamentosCartao: {
    global?: Record<string, { inicio: number }>;
    mensal?: Record<string, Record<string, { inicio: number }>>;
  };
};

type CompraRecord = Record<string, unknown>;

type SyncCompraInput = Record<string, unknown>;

type NormalizedSyncCompra = {
  data: string;
  hora: string;
  valor: number;
  valorCentavos: number;
  descricao: string;
  descricaoOriginal: string;
  estabelecimentoKey: string;
  cartao: string;
  banco: string;
  tipoCompra: string;
  parcelas: number;
  parcelaAtual: number;
  idOrigem: string;
  fingerprintBase: string;
  fingerprintBaseSemHora: string;
  raw: SyncCompraInput;
};

type SyncItemError = {
  index: number;
  error: string;
  message: string;
  raw?: unknown;
};

type DuplicateCandidate = {
  data: string;
  valorCentavos: number;
  cartaoKey: string;
  estabelecimentoKey: string;
};

type PluggyAccount = Record<string, unknown>;

type PluggyTransaction = Record<string, unknown>;

const emptyState = (): AppState => ({
  compras: [],
  orcamentos: [],
  regrasCategoria: {},
  fechamentosCartao: { global: {}, mensal: {} },
});

const MAX_SYNC_ITEMS = 500;

let cachedAccess: { token: string; exp: number } | null = null;
let cachedPluggyKey: { apiKey: string; exp: number } | null = null;

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
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env, req),
    },
  });
}

function unauthorized(
  env: Env,
  req: Request,
  reason = "unauthorized",
): Response {
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
  if (s.length <= 2) return "*".repeat(s.length);
  return s[0] + "*".repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
}

function parseMoneyBR(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function formatDescription(texto: string): string {
  const smallWords = new Set([
    "a",
    "as",
    "ao",
    "aos",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "na",
    "nas",
    "no",
    "nos",
    "o",
    "os",
  ]);
  const acronyms = new Set(["BR", "SA", "S/A", "LTDA", "MEI", "ME", "EPP"]);
  const normalized = texto
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

  return normalized
    .split(" ")
    .map((word, index) => {
      const clean = word.replace(/[.,;:]+$/g, "").toLocaleUpperCase("pt-BR");
      if (index > 0 && smallWords.has(word)) return word;
      if (acronyms.has(clean)) return clean;

      return word.replace(/^\p{L}/u, (letter) =>
        letter.toLocaleUpperCase("pt-BR"),
      );
    })
    .join(" ");
}

function parseItauNotification(texto: string): {
  data: string;
  valor: number;
  descricao: string;
  tipo: string;
  cartao: string;
  tipoCompra: string;
  debug: Record<string, unknown>;
} {
  const raw = texto.replace(/\s+/g, " ").trim();
  const valorMatch = raw.match(/(?:valor\s*)?R(?:\$|S)\s*([\d.]+,\d{2})/i);
  const dataMatch = raw.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
  const oldFormatDescMatch =
    raw.match(
      /final\s+\d+\s*-\s*(.*?)\s*(?:-\s*)?(?:valor\s*)?R(?:\$|S)\s*/i,
    ) || raw.match(/final\s+\d+\s*-\s*(.*?)\s+em\s+\d{2}\/\d{2}(?:\/\d{4})?/i);
  const newFormatDescMatch = raw.match(
    /compra\s+aprovada\s+de\s+R(?:\$|S)\s*[\d.]+,\d{2}\s+em\s+(.+?)\s+no\s+dia\s+\d{2}\/\d{2}(?:\/\d{4})?/i,
  );
  const descMatch = oldFormatDescMatch || newFormatDescMatch;
  const ano = dataMatch?.[3] || String(new Date().getUTCFullYear());

  const debug = {
    parser: "itau",
    recebeuTexto: raw,
    achouValor: !!valorMatch,
    achouData: !!dataMatch,
    achouDescricao: !!descMatch,
    formatoDescricao: oldFormatDescMatch
      ? "itau-antigo"
      : newFormatDescMatch
        ? "itau-novo-push"
        : "nao-reconhecido",
  };

  return {
    data: dataMatch ? `${ano}-${dataMatch[2]}-${dataMatch[1]}` : "",
    valor: valorMatch ? parseMoneyBR(valorMatch[1]) : 0,
    descricao: descMatch ? formatDescription(descMatch[1]) : "",
    tipo: "Outros",
    cartao: "Itaú",
    tipoCompra: "avista",
    debug,
  };
}

function normalizeKey(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(
  descricao: string,
  regrasCategoria?: Record<string, string>,
): string {
  const descricaoKey = normalizeKey(descricao);
  const regras = Object.entries(regrasCategoria || {})
    .map(([key, tipo]) => [normalizeKey(key), tipo] as const)
    .filter(([key, tipo]) => key && tipo && normalizeKey(tipo) !== "outros")
    .sort((a, b) => b[0].length - a[0].length);

  const regra = regras.find(
    ([key]) =>
      descricaoKey === key ||
      descricaoKey.includes(key) ||
      key.includes(descricaoKey),
  );
  return regra?.[1] || "Outros";
}

function asText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeProvider(value: unknown, fallback = "itau"): string {
  const key = normalizeKey(asText(value) || fallback);
  if (key.includes("carrefour")) return "carrefour";
  if (key.includes("nubank")) return "nubank";
  if (key.includes("itau")) return "itau";
  return key || normalizeKey(fallback);
}

function displayCartao(value: unknown, provider: string): string {
  const key = normalizeKey(asText(value) || provider);
  if (key.includes("carrefour") || provider === "carrefour") return "Carrefour";
  if (key.includes("nubank") || provider === "nubank") return "Nubank";
  if (key.includes("itau") || provider === "itau") return "Itaú";
  return formatDescription(asText(value) || provider || "Cartão");
}

function normalizeDateInput(value: unknown, now = new Date()): string {
  const text = asText(value).replace(/\s+/g, " ");
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = text.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
  if (!br) return "";

  const day = br[1].padStart(2, "0");
  const month = br[2].padStart(2, "0");
  let year = br[3] || String(now.getUTCFullYear());
  if (year.length === 2) year = `20${year}`;

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function normalizeTimeInput(value: unknown): string {
  const text = asText(value);
  if (!text) return "";

  const match = text.match(/(\d{1,2})\s*(?::|h)\s*(\d{2})/i);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeMoneyInput(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }

  const text = asText(value).replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return 0;

  let normalized = text;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function normalizeMerchantForFingerprint(text: string): string {
  return normalizeKey(text)
    .replace(/\b(ltda|eireli|mei|me|epp|s a|sa|s\/a)\b/g, " ")
    .replace(/\b(loja|filial|pagamento|pag|compra)\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");
}

function stringBigrams(text: string): Set<string> {
  const normalized = text.trim();
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);

  const bigrams = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index++) {
    bigrams.add(normalized.slice(index, index + 2));
  }
  return bigrams;
}

function merchantSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length >= 6 && right.length >= 6) {
    if (left.includes(right) || right.includes(left)) return 0.9;
  }

  const leftBigrams = stringBigrams(left);
  const rightBigrams = stringBigrams(right);
  if (!leftBigrams.size || !rightBigrams.size) return 0;

  let intersection = 0;
  leftBigrams.forEach((bigram) => {
    if (rightBigrams.has(bigram)) intersection++;
  });

  return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
}

function isLikelySameMerchant(left: string, right: string): boolean {
  const similarity = merchantSimilarity(left, right);
  return similarity >= 0.58;
}

function pickFirstText(item: SyncCompraInput, keys: string[]): string {
  for (const key of keys) {
    const value = asText(item[key]);
    if (value) return value;
  }
  return "";
}

function normalizeSyncCompra(
  rawItem: unknown,
  defaults: { provider: string; cartao: string },
  index: number,
): { compra?: NormalizedSyncCompra; error?: SyncItemError } {
  if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
    return {
      error: {
        index,
        error: "item_invalido",
        message: "cada compra precisa ser um objeto",
        raw: rawItem,
      },
    };
  }

  const item = rawItem as SyncCompraInput;
  const provider = normalizeProvider(
    item.banco ?? item.fonte ?? item.origem,
    defaults.provider,
  );
  const cartao = displayCartao(item.cartao, provider || defaults.cartao);
  const descricaoOriginal = pickFirstText(item, [
    "descricao",
    "estabelecimento",
    "lojista",
    "merchant",
    "nome",
  ]);
  const data = normalizeDateInput(item.data ?? item.date);
  const hora = normalizeTimeInput(item.hora ?? item.time ?? item.horario);
  const valor = normalizeMoneyInput(item.valor ?? item.value ?? item.amount);
  const valorCentavos = Math.round(valor * 100);
  const parcelas = Math.max(
    1,
    Math.floor(Number(item.parcelas ?? item.totalParcelas ?? 1)) || 1,
  );
  const parcelaAtual = Math.max(
    1,
    Math.floor(Number(item.parcelaAtual ?? item.parcela ?? 1)) || 1,
  );
  const idOrigem = pickFirstText(item, [
    "idOrigem",
    "idTransacao",
    "transactionId",
    "codigo",
    "codigoAutorizacao",
    "nsu",
  ]);
  const estabelecimentoKey = normalizeMerchantForFingerprint(descricaoOriginal);

  if (!data) {
    return {
      error: {
        index,
        error: "data_invalida",
        message: "data ausente ou inválida",
        raw: item,
      },
    };
  }

  if (!valor || valor <= 0) {
    return {
      error: {
        index,
        error: "valor_invalido",
        message: "valor ausente ou inválido",
        raw: item,
      },
    };
  }

  if (!descricaoOriginal || !estabelecimentoKey) {
    return {
      error: {
        index,
        error: "descricao_invalida",
        message: "descrição/estabelecimento ausente",
        raw: item,
      },
    };
  }

  const fingerprintBase = idOrigem
    ? [provider, normalizeKey(cartao), "id", normalizeKey(idOrigem)].join("|")
    : [
        provider,
        normalizeKey(cartao),
        data,
        hora || "sem-hora",
        valorCentavos,
        estabelecimentoKey,
      ].join("|");
  const fingerprintBaseSemHora = [
    provider,
    normalizeKey(cartao),
    data,
    "sem-hora",
    valorCentavos,
    estabelecimentoKey,
  ].join("|");

  return {
    compra: {
      data,
      hora,
      valor,
      valorCentavos,
      descricao: formatDescription(descricaoOriginal),
      descricaoOriginal,
      estabelecimentoKey,
      cartao,
      banco: provider,
      tipoCompra: asText(item.tipoCompra) || "avista",
      parcelas,
      parcelaAtual,
      idOrigem,
      fingerprintBase,
      fingerprintBaseSemHora,
      raw: item,
    },
  };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fingerprintCompra(
  compra: NormalizedSyncCompra,
): Promise<{ primary: string; noTime: string }> {
  const [primary, noTime] = await Promise.all([
    sha256Hex(compra.fingerprintBase),
    sha256Hex(compra.fingerprintBaseSemHora),
  ]);
  return { primary, noTime };
}

async function fingerprintsFromExistingCompra(
  compra: unknown,
): Promise<{ exact: string[]; legacyNoTime: string[] }> {
  if (!compra || typeof compra !== "object" || Array.isArray(compra)) {
    return { exact: [], legacyNoTime: [] };
  }

  const record = compra as CompraRecord;
  const exact: string[] = [];
  const legacyNoTime: string[] = [];
  const storedFingerprint = asText(record.syncFingerprint);

  if (storedFingerprint) {
    exact.push(storedFingerprint);
  }

  const normalized = normalizeSyncCompra(
    record,
    {
      provider: asText(record.banco) || asText(record.cartao) || "itau",
      cartao: asText(record.cartao) || "itau",
    },
    -1,
  );
  if (!normalized.compra) return { exact, legacyNoTime };

  const generated = await fingerprintCompra(normalized.compra);
  exact.push(generated.primary);
  exact.push(generated.noTime);
  legacyNoTime.push(generated.noTime);

  return { exact, legacyNoTime };
}

function duplicateCandidateFromExistingCompra(
  compra: unknown,
): DuplicateCandidate | null {
  if (!compra || typeof compra !== "object" || Array.isArray(compra)) {
    return null;
  }

  const record = compra as CompraRecord;
  const normalized = normalizeSyncCompra(
    record,
    {
      provider: asText(record.banco) || asText(record.cartao) || "itau",
      cartao: asText(record.cartao) || "itau",
    },
    -1,
  );

  return normalized.compra
    ? duplicateCandidateFromCompra(normalized.compra)
    : null;
}

function parseCarrefourSms(texto: string): {
  data: string;
  valor: number;
  descricao: string;
  tipo: string;
  cartao: string;
  tipoCompra: string;
  debug: Record<string, unknown>;
} {
  const raw = texto.replace(/\s+/g, " ").trim();
  const valorMatch = raw.match(/R(?:\$|S)\s*([\d.]+,\d{2})/i);
  const dataMatch = raw.match(/compra\s+aprovada\s+em\s+(\d{2})\/(\d{2})/i);
  const descMatch = raw.match(/\sno\s+(.+?)\.\s*cartao\s+final\s+\d+/i);
  const anoAtual = new Date().getUTCFullYear();

  const debug = {
    parser: "carrefour",
    recebeuTexto: raw,
    achouValor: !!valorMatch,
    achouData: !!dataMatch,
    achouDescricao: !!descMatch,
  };

  return {
    data: dataMatch ? `${anoAtual}-${dataMatch[2]}-${dataMatch[1]}` : "",
    valor: valorMatch ? parseMoneyBR(valorMatch[1]) : 0,
    descricao: descMatch ? formatDescription(descMatch[1]) : "",
    tipo: "Outros",
    cartao: "Carrefour",
    tipoCompra: "avista",
    debug,
  };
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

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const exp = now + (data.expires_in ?? 3500);
  cachedAccess = { token: data.access_token, exp };
  return data.access_token;
}

function docUrl(projectId: string, relativePath: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${relativePath}`;
}

function parseFirestorePayload(doc: {
  fields?: { [k: string]: { stringValue?: string } };
}): AppState | null {
  const raw = doc.fields?.[DATA_FIELD]?.stringValue;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      compras: Array.isArray(parsed.compras) ? parsed.compras : [],
      orcamentos: Array.isArray(parsed.orcamentos) ? parsed.orcamentos : [],
      regrasCategoria:
        parsed.regrasCategoria && typeof parsed.regrasCategoria === "object"
          ? (parsed.regrasCategoria as Record<string, string>)
          : {},
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

  const doc = (await res.json()) as {
    fields?: { [k: string]: { stringValue?: string } };
  };
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
  const body = JSON.stringify({
    fields: { [DATA_FIELD]: { stringValue: JSON.stringify(state) } },
  });

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

function getSyncItems(body: unknown): unknown[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const record = body as Record<string, unknown>;
  const candidate = record.compras ?? record.items ?? record.lancamentos;
  return Array.isArray(candidate) ? candidate : [];
}

function getSyncDefaults(body: unknown): {
  provider: string;
  cartao: string;
  origem: string;
} {
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const provider = normalizeProvider(
    record.banco ?? record.fonte ?? record.origem,
    "itau",
  );
  const cartao = displayCartao(record.cartao, provider);
  const origem =
    asText(record.origem) || asText(record.fonte) || "macrodroid-historico";
  return { provider, cartao, origem };
}

function getDryRun(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  return (
    record.dryRun === true ||
    record.testMode === true ||
    record.simular === true
  );
}

function duplicateBucketKey(
  compra: Pick<
    NormalizedSyncCompra,
    "banco" | "cartao" | "data" | "valorCentavos"
  >,
): string {
  return [
    normalizeProvider(compra.banco, "itau"),
    normalizeKey(compra.cartao),
    compra.data,
    compra.valorCentavos,
  ].join("|");
}

function duplicateBucketKeyFromCandidate(
  candidate: DuplicateCandidate,
): string {
  return [candidate.cartaoKey, candidate.data, candidate.valorCentavos].join(
    "|",
  );
}

function addDaysToDateOnly(dateOnlyValue: string, days: number): string {
  const match = dateOnlyValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateOnlyValue;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function duplicateBucketKeysWithDateTolerance(
  compra: NormalizedSyncCompra,
): string[] {
  return [-1, 0, 1].map((offset) =>
    duplicateBucketKey({
      banco: compra.banco,
      cartao: compra.cartao,
      data: addDaysToDateOnly(compra.data, offset),
      valorCentavos: compra.valorCentavos,
    }),
  );
}

function duplicateCandidateFromCompra(
  compra: NormalizedSyncCompra,
): DuplicateCandidate {
  return {
    data: compra.data,
    valorCentavos: compra.valorCentavos,
    cartaoKey: [
      normalizeProvider(compra.banco, "itau"),
      normalizeKey(compra.cartao),
    ].join("|"),
    estabelecimentoKey: compra.estabelecimentoKey,
  };
}

async function syncComprasFromHistory(
  env: Env,
  body: unknown,
): Promise<{
  ok: true;
  banco: string;
  cartao: string;
  origem: string;
  recebidas: number;
  validas: number;
  adicionadas: number;
  existentes: number;
  duplicadasNoLote: number;
  erros: number;
  detalhesErros: SyncItemError[];
  dryRun: boolean;
  comprasAdicionadas: Array<{
    id: number;
    data: string;
    hora?: string;
    valor: number;
    descricao: string;
    fingerprint: string;
  }>;
}> {
  const defaults = getSyncDefaults(body);
  const items = getSyncItems(body);
  const dryRun = getDryRun(body);

  if (!items.length) {
    return {
      ok: true,
      banco: defaults.provider,
      cartao: defaults.cartao,
      origem: defaults.origem,
      recebidas: 0,
      validas: 0,
      adicionadas: 0,
      existentes: 0,
      duplicadasNoLote: 0,
      erros: 0,
      detalhesErros: [],
      dryRun,
      comprasAdicionadas: [],
    };
  }

  if (items.length > MAX_SYNC_ITEMS) {
    throw new Error(`lote excede o limite de ${MAX_SYNC_ITEMS} compras`);
  }

  const normalized: NormalizedSyncCompra[] = [];
  const detalhesErros: SyncItemError[] = [];

  items.forEach((item, index) => {
    const result = normalizeSyncCompra(item, defaults, index);
    if (result.compra) normalized.push(result.compra);
    if (result.error) detalhesErros.push(result.error);
  });

  const state = await readState(env);
  const exactFingerprints = new Set<string>();
  const legacyNoTimeFingerprints = new Set<string>();
  const duplicateCandidatesByBucket = new Map<string, DuplicateCandidate[]>();

  const existingFingerprints = await Promise.all(
    state.compras.map(fingerprintsFromExistingCompra),
  );
  existingFingerprints.forEach(({ exact, legacyNoTime }) => {
    exact.forEach((fingerprint) => exactFingerprints.add(fingerprint));
    legacyNoTime.forEach((fingerprint) =>
      legacyNoTimeFingerprints.add(fingerprint),
    );
  });
  state.compras
    .map(duplicateCandidateFromExistingCompra)
    .filter((candidate): candidate is DuplicateCandidate => !!candidate)
    .forEach((candidate) => {
      const key = duplicateBucketKeyFromCandidate(candidate);
      const list = duplicateCandidatesByBucket.get(key) || [];
      list.push(candidate);
      duplicateCandidatesByBucket.set(key, list);
    });

  const batchFingerprints = new Set<string>();
  const comprasAdicionadas: Array<{
    id: number;
    data: string;
    hora?: string;
    valor: number;
    descricao: string;
    fingerprint: string;
  }> = [];
  let existentes = 0;
  let duplicadasNoLote = 0;

  for (const compra of normalized) {
    const fingerprints = await fingerprintCompra(compra);
    const candidateKeys = duplicateBucketKeysWithDateTolerance(compra);
    const duplicateBySimilarity = candidateKeys.some((candidateKey) =>
      (duplicateCandidatesByBucket.get(candidateKey) || []).some((candidate) =>
        isLikelySameMerchant(
          candidate.estabelecimentoKey,
          compra.estabelecimentoKey,
        ),
      ),
    );
    const duplicateInFirestore =
      exactFingerprints.has(fingerprints.primary) ||
      exactFingerprints.has(fingerprints.noTime) ||
      legacyNoTimeFingerprints.has(fingerprints.noTime) ||
      duplicateBySimilarity ||
      (compra.hora
        ? legacyNoTimeFingerprints.has(fingerprints.noTime)
        : exactFingerprints.has(fingerprints.noTime));

    if (duplicateInFirestore) {
      existentes++;
      continue;
    }

    if (
      batchFingerprints.has(fingerprints.primary) ||
      (!compra.hora && batchFingerprints.has(fingerprints.noTime))
    ) {
      duplicadasNoLote++;
      continue;
    }

    const tipo = inferCategory(compra.descricao, state.regrasCategoria);
    const id = Date.now() + comprasAdicionadas.length;
    const novaCompra = {
      id,
      data: compra.data,
      hora: compra.hora || undefined,
      valor: compra.valor,
      descricao: compra.descricao,
      descricaoOriginal: compra.descricaoOriginal,
      tipo,
      cartao: compra.cartao,
      tipoCompra: compra.tipoCompra,
      parcelas: compra.parcelas,
      parcelaAtual: compra.parcelaAtual,
      banco: compra.banco,
      origemSync: defaults.origem,
      syncFingerprint: fingerprints.primary,
      syncKey: compra.fingerprintBase,
      syncRecebidoEm: new Date().toISOString(),
      idOrigem: compra.idOrigem || undefined,
    };

    if (!dryRun) {
      state.compras.push(novaCompra);
    }
    exactFingerprints.add(fingerprints.primary);
    exactFingerprints.add(fingerprints.noTime);
    batchFingerprints.add(fingerprints.primary);
    batchFingerprints.add(fingerprints.noTime);
    const candidateKey = duplicateBucketKey(compra);
    const list = duplicateCandidatesByBucket.get(candidateKey) || [];
    list.push(duplicateCandidateFromCompra(compra));
    duplicateCandidatesByBucket.set(candidateKey, list);
    comprasAdicionadas.push({
      id,
      data: compra.data,
      hora: compra.hora || undefined,
      valor: compra.valor,
      descricao: compra.descricao,
      fingerprint: fingerprints.primary,
    });
  }

  if (!dryRun && comprasAdicionadas.length > 0) {
    await writeState(env, state);
  }

  return {
    ok: true,
    banco: defaults.provider,
    cartao: defaults.cartao,
    origem: defaults.origem,
    recebidas: items.length,
    validas: normalized.length,
    adicionadas: comprasAdicionadas.length,
    existentes,
    duplicadasNoLote,
    erros: detalhesErros.length,
    detalhesErros,
    dryRun,
    comprasAdicionadas,
  };
}

function requirePluggyConfig(env: Env): {
  clientId: string;
  clientSecret: string;
  itauItemId: string;
} {
  const clientId = env.PLUGGY_CLIENT_ID?.trim();
  const clientSecret = env.PLUGGY_CLIENT_SECRET?.trim();
  const itauItemId = env.PLUGGY_ITAU_ITEM_ID?.trim();

  if (!clientId || !clientSecret || !itauItemId) {
    throw new Error(
      "PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET e PLUGGY_ITAU_ITEM_ID precisam estar configurados",
    );
  }

  return { clientId, clientSecret, itauItemId };
}

async function getPluggyApiKey(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedPluggyKey && cachedPluggyKey.exp > now + 120)
    return cachedPluggyKey.apiKey;

  const { clientId, clientSecret } = requirePluggyConfig(env);
  const res = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pluggy auth ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { apiKey?: string };
  if (!data.apiKey) throw new Error("Pluggy não retornou apiKey");

  cachedPluggyKey = { apiKey: data.apiKey, exp: now + 60 * 110 };
  return data.apiKey;
}

async function pluggyFetch<T>(env: Env, path: string): Promise<T> {
  const apiKey = await getPluggyApiKey(env);
  const res = await fetch(`https://api.pluggy.ai${path}`, {
    headers: {
      Accept: "application/json",
      "X-API-KEY": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pluggy ${path} ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

function dateOnly(value: unknown): string {
  const text = asText(value);
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return normalizeDateInput(text);
}

function defaultDateFrom(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function pluggyMerchantName(transaction: PluggyTransaction): string {
  const merchant =
    transaction.merchant && typeof transaction.merchant === "object"
      ? (transaction.merchant as Record<string, unknown>)
      : {};

  return (
    asText(merchant.name) ||
    asText(merchant.businessName) ||
    asText(transaction.description) ||
    asText(transaction.descriptionRaw) ||
    "Compra Itaú"
  );
}

function pluggyTransactionPurchaseDate(
  transaction: PluggyTransaction,
  metadata: Record<string, unknown>,
): string {
  return (
    dateOnly(metadata.purchaseDate) ||
    dateOnly(metadata.originalDate) ||
    dateOnly(metadata.transactionDate) ||
    dateOnly(transaction.purchaseDate) ||
    dateOnly(transaction.originalDate) ||
    dateOnly(transaction.transactionDate) ||
    dateOnly(transaction.operationDate) ||
    dateOnly(transaction.date)
  );
}

function pluggyAccountName(account: PluggyAccount): string {
  return (
    asText(account.marketingName) ||
    asText(account.name) ||
    asText(account.number) ||
    "Itaú"
  );
}

function pluggyAccountLabel(account: PluggyAccount): string {
  const name = pluggyAccountName(account);
  const number = asText(account.number);
  return number && !name.includes(number) ? `${name} ${number}` : name;
}

function isPluggyCreditAccount(account: PluggyAccount): boolean {
  return (
    asText(account.type).toUpperCase() === "CREDIT" ||
    asText(account.subtype).toUpperCase() === "CREDIT_CARD"
  );
}

async function listPluggyCreditAccounts(
  env: Env,
  itemId: string,
): Promise<PluggyAccount[]> {
  const data = await pluggyFetch<{ results?: PluggyAccount[] }>(
    env,
    `/accounts?itemId=${encodeURIComponent(itemId)}&type=CREDIT`,
  );

  return (Array.isArray(data.results) ? data.results : []).filter(
    isPluggyCreditAccount,
  );
}

async function listPluggyTransactions(
  env: Env,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PluggyTransaction[]> {
  const transactions: PluggyTransaction[] = [];
  let path = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;

  for (let page = 0; page < 10; page++) {
    const data = await pluggyFetch<{
      results?: PluggyTransaction[];
      next?: string | null;
    }>(env, path);
    if (Array.isArray(data.results)) transactions.push(...data.results);
    if (!data.next) break;
    path = data.next.startsWith("/v2/transactions")
      ? data.next
      : `/v2/transactions${data.next.startsWith("?") ? data.next : `?${data.next}`}`;
  }

  return transactions;
}

function mapPluggyTransactionToSyncCompra(
  transaction: PluggyTransaction,
  account: PluggyAccount,
): SyncCompraInput | null {
  if (asText(transaction.type).toUpperCase() !== "DEBIT") return null;

  const amount = normalizeMoneyInput(transaction.amount);
  if (!amount) return null;

  const metadata =
    transaction.creditCardMetadata &&
    typeof transaction.creditCardMetadata === "object"
      ? (transaction.creditCardMetadata as Record<string, unknown>)
      : {};
  const totalInstallments = Math.max(
    1,
    Math.floor(Number(metadata.totalInstallments ?? 1)) || 1,
  );
  const installmentNumber = Math.max(
    1,
    Math.floor(Number(metadata.installmentNumber ?? 1)) || 1,
  );
  const purchaseDate = pluggyTransactionPurchaseDate(transaction, metadata);
  const value = Math.abs(amount);
  const merchant = pluggyMerchantName(transaction);

  if (!purchaseDate || !value || !merchant) return null;

  const syncCompra: SyncCompraInput = {
    data: purchaseDate,
    valor: value,
    estabelecimento: merchant,
    descricao: merchant,
    cartao: "Itaú",
    banco: "itau",
    tipoCompra: "avista",
    parcelas: 1,
    parcelaAtual: 1,
    pluggyTotalInstallments: totalInstallments,
    pluggyInstallmentNumber: installmentNumber,
    pluggyInstallmentOriginal: totalInstallments > 1,
    pluggyAccountId: asText(account.id),
    pluggyAccountName: pluggyAccountLabel(account),
    pluggyTransactionId: asText(transaction.id),
    pluggyStatus: asText(transaction.status),
    pluggyCategory: asText(transaction.category),
    pluggyProviderCode: asText(transaction.providerCode),
  };

  syncCompra.idOrigem =
    asText(transaction.providerId) ||
    asText(transaction.providerCode) ||
    asText(transaction.id);

  return syncCompra;
}

async function syncPluggyItau(
  env: Env,
  body: unknown,
): Promise<{
  ok: true;
  pluggy: {
    itemId: string;
    dateFrom: string;
    dateTo: string;
    contasCredito: number;
    transacoesRecebidas: number;
    comprasCandidatas: number;
  };
  sync: Awaited<ReturnType<typeof syncComprasFromHistory>>;
}> {
  const { itauItemId } = requirePluggyConfig(env);
  const request =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const days = Math.min(Math.max(Number(request.days ?? 120) || 120, 1), 365);
  const dateFrom =
    normalizeDateInput(request.dateFrom) || defaultDateFrom(days);
  const dateTo = normalizeDateInput(request.dateTo) || defaultDateTo();
  const accounts = await listPluggyCreditAccounts(env, itauItemId);
  const compras: SyncCompraInput[] = [];
  let transacoesRecebidas = 0;

  for (const account of accounts) {
    const accountId = asText(account.id);
    if (!accountId) continue;
    const transactions = await listPluggyTransactions(
      env,
      accountId,
      dateFrom,
      dateTo,
    );
    transacoesRecebidas += transactions.length;

    transactions.forEach((transaction) => {
      const compra = mapPluggyTransactionToSyncCompra(transaction, account);
      if (compra) compras.push(compra);
    });
  }

  const sync = await syncComprasFromHistory(env, {
    banco: "itau",
    cartao: "Itaú",
    origem: "pluggy-itau",
    dryRun: getDryRun(body),
    compras,
  });

  return {
    ok: true,
    pluggy: {
      itemId: itauItemId,
      dateFrom,
      dateTo,
      contasCredito: accounts.length,
      transacoesRecebidas,
      comprasCandidatas: compras.length,
    },
    sync,
  };
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      syncPluggyItau(env, { days: 7 })
        .then((result) => {
          console.log("pluggy-sync-itau-cron", {
            scheduledTime: event.scheduledTime,
            dateFrom: result.pluggy.dateFrom,
            dateTo: result.pluggy.dateTo,
            transacoesRecebidas: result.pluggy.transacoesRecebidas,
            comprasCandidatas: result.pluggy.comprasCandidatas,
            adicionadas: result.sync.adicionadas,
            existentes: result.sync.existentes,
            duplicadasNoLote: result.sync.duplicadasNoLote,
            erros: result.sync.erros,
          });
        })
        .catch((error) => {
          console.error("pluggy-sync-itau-cron-error", {
            scheduledTime: event.scheduledTime,
            message: error instanceof Error ? error.message : String(error),
          });
        }),
    );
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, req),
      });
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
          regrasCategoria:
            body.regrasCategoria && typeof body.regrasCategoria === "object"
              ? (body.regrasCategoria as Record<string, string>)
              : {},
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
        // Verificar autenticação
        if (!verifyBasicAuth(req, env)) {
          return unauthorized(env, req, "autenticacao_obrigatoria");
        }

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
          return json(
            {
              error: "campos_obrigatorios",
              message: "data, valor, descricao e cartao são obrigatórios",
            },
            env,
            req,
            400,
          );
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

      // Endpoint: POST /compra-notificacao - Recebe texto bruto da notificação e extrai a compra na API
      if (pathname === "/compra-notificacao" && req.method === "POST") {
        const body = (await req.json()) as {
          texto?: string;
          cartao?: string;
        };

        const texto = body.texto?.toString().trim() || "";
        const cartao = body.cartao?.toString().trim() || "Itaú";

        if (!texto) {
          return json(
            { error: "texto_obrigatorio", message: "texto é obrigatório" },
            env,
            req,
            400,
          );
        }

        const cartaoKey = normalizeKey(cartao);
        if (cartaoKey !== "itau" && cartaoKey !== "carrefour") {
          return json(
            {
              error: "cartao_nao_suportado",
              message: "por enquanto apenas Itaú e Carrefour são suportados",
              cartao,
            },
            env,
            req,
            400,
          );
        }

        const compraExtraida =
          cartaoKey === "carrefour"
            ? parseCarrefourSms(texto)
            : parseItauNotification(texto);

        if (
          !compraExtraida.data ||
          !compraExtraida.valor ||
          !compraExtraida.descricao ||
          !compraExtraida.cartao
        ) {
          return json(
            {
              error: "notificacao_nao_reconhecida",
              message:
                "não foi possível extrair data, valor e descrição da notificação",
              debug: compraExtraida.debug,
              compraExtraida: {
                data: compraExtraida.data,
                valor: compraExtraida.valor,
                descricao: compraExtraida.descricao,
                cartao: compraExtraida.cartao,
              },
            },
            env,
            req,
            400,
          );
        }

        const state = await readState(env);
        compraExtraida.tipo = inferCategory(
          compraExtraida.descricao,
          state.regrasCategoria,
        );
        const novaCompra = {
          id: Date.now(),
          data: compraExtraida.data,
          valor: compraExtraida.valor,
          descricao: compraExtraida.descricao,
          tipo: compraExtraida.tipo,
          cartao: compraExtraida.cartao,
          tipoCompra: compraExtraida.tipoCompra,
          parcelas: 1,
          parcelaAtual: 1,
        };

        state.compras.push(novaCompra);
        await writeState(env, state);

        return json(
          { ok: true, compra: novaCompra, debug: compraExtraida.debug },
          env,
          req,
          201,
        );
      }

      // Endpoint: POST /compras-sync - Sincroniza lote de compras lidas do histórico do app do banco
      if (
        (pathname === "/compras-sync" || pathname === "/sync-compras") &&
        req.method === "POST"
      ) {
        const body = await req.json();
        const items = getSyncItems(body);

        if (!items.length) {
          return json(
            {
              error: "compras_obrigatorias",
              message: "envie um array em compras, items ou lancamentos",
            },
            env,
            req,
            400,
          );
        }

        if (items.length > MAX_SYNC_ITEMS) {
          return json(
            {
              error: "lote_muito_grande",
              message: `envie no máximo ${MAX_SYNC_ITEMS} compras por sincronização`,
              recebidas: items.length,
            },
            env,
            req,
            400,
          );
        }

        const result = await syncComprasFromHistory(env, body);
        return json(result, env, req, 200);
      }

      // Endpoint: POST /pluggy/sync-itau - Busca compras do Itaú na Pluggy e sincroniza no app
      if (pathname === "/pluggy/sync-itau" && req.method === "POST") {
        const contentType = req.headers.get("Content-Type") || "";
        const body = contentType.includes("application/json")
          ? await req.json()
          : {};
        const result = await syncPluggyItau(env, body);
        return json(result, env, req, 200);
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
