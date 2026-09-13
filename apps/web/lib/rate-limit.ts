/**
 * In-memory sliding window rate limiter para proteção contra abuso e DDoS.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const storage = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Verifica e registra um hit para uma determinada chave usando janela deslizante.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = storage.get(key) || { timestamps: [] };
  // Filtra apenas timestamps dentro da janela atual
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0] ?? now;
    const resetInSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  activeTimestamps.push(now);
  storage.set(key, { timestamps: activeTimestamps });

  return {
    success: true,
    remaining: Math.max(0, limit - activeTimestamps.length),
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

export function getClientIp(req: Request): string {
  const forwardedHeader = req.headers.get("x-forwarded-for");
  if (forwardedHeader) {
    return forwardedHeader.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown-ip";
}

/**
 * Limite de requisições por IP (padrão: 5 requisições a cada 10 minutos).
 */
export function checkIpRateLimit(
  reqOrIp: Request | string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
): RateLimitResult {
  const ip = typeof reqOrIp === "string" ? reqOrIp : getClientIp(reqOrIp);
  const normalizedIp = ip.trim() || "unknown-ip";
  return checkRateLimit(`ip:${normalizedIp}`, limit, windowMs);
}

/**
 * Limite de requisições por E-mail: 3 submissões a cada 24 horas (86.400.000 ms).
 */
export function checkEmailRateLimit(email: string): RateLimitResult {
  const normalizedEmail = email.trim().toLowerCase() || "unknown-email";
  return checkRateLimit(`email:${normalizedEmail}`, 3, 24 * 60 * 60 * 1000);
}

/**
 * Limpa o armazenamento em memória (útil para testes unitários).
 */
export function clearRateLimits(): void {
  storage.clear();
}
