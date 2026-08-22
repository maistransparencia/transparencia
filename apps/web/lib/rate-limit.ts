export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  isAuth: boolean;
}

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 Horas

function getAnonymousLimit(): number {
  const envVal = process.env.AI_ANONYMOUS_DAILY_LIMIT;
  if (envVal != null && !Number.isNaN(Number(envVal))) {
    return Number(envVal);
  }
  return 5;
}

function getAuthenticatedLimit(): number {
  const envVal = process.env.AI_AUTH_USER_DAILY_LIMIT;
  if (envVal != null && !Number.isNaN(Number(envVal))) {
    return Number(envVal);
  }
  return 50;
}

export function checkAnonymousRateLimit(
  req: Request,
  overrideMaxRequests?: number,
): RateLimitResult {
  // 1. Verificar modo Superadmin (estritamente em ambiente de desenvolvimento / localhost) ou chaves API/Bearer
  const isDevOrLocalhost =
    process.env.NODE_ENV === "development" ||
    req.url.includes("localhost") ||
    req.url.includes("127.0.0.1");

  const superadminHeader = req.headers.get("x-superadmin-key");
  const expectedSuperadminSecret = process.env.SUPERADMIN_SECRET_KEY;

  const isSuperadmin =
    isDevOrLocalhost &&
    Boolean(superadminHeader) &&
    (superadminHeader === "superadmin" ||
      (Boolean(expectedSuperadminSecret) &&
        superadminHeader === expectedSuperadminSecret));

  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-mcp-api-key");

  if (isSuperadmin || authHeader || apiKeyHeader) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      resetAt: 0,
      isAuth: true,
    };
  }

  // 2. Verificar se o usuário possui sessão de autenticação ativa no Supabase (Cookie sb-*-auth-token)
  const cookieHeader = req.headers.get("cookie") || "";
  const hasSupabaseCookie =
    cookieHeader.includes("sb-") && cookieHeader.includes("-auth-token");

  const isAuthUser = Boolean(hasSupabaseCookie);
  const maxRequests =
    overrideMaxRequests ??
    (isAuthUser ? getAuthenticatedLimit() : getAnonymousLimit());

  // Extrair identificador único para o rate limit (cookie hash para auth, IP para anônimo)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const key = isAuthUser
    ? `auth:${cookieHeader.slice(0, 32)}`
    : `anon:${clientIp}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // Filtrar apenas timestamps dentro da janela de 24h
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= maxRequests) {
    const oldestTimestamp = entry.timestamps[0] || now;
    const resetAt = oldestTimestamp + WINDOW_MS;

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetAt,
      isAuth: isAuthUser,
    };
  }

  // Registrar requisição atual
  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, maxRequests - entry.timestamps.length);
  const resetAt = now + WINDOW_MS;

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetAt,
    isAuth: isAuthUser,
  };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
