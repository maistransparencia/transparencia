/**
 * Cloudflare Worker para agendamento e acionamento manual da ingestão de dados.
 *
 * Cumpre a exigência de frescor de até 24 horas estabelecida no
 * Art. 48-A, I da Lei Complementar nº 101/2000 (LRF):
 * https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a
 */

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface ScheduledEvent {
  cron: string;
  type: string;
  scheduledTime: number;
}

export interface Env {
  INGESTION_TRIGGER_SECRET?: string;
  INGESTION_SERVICE_URL?: string;
  INTERNAL_API_SECRET?: string;
}

function safeCompare(secret: string, token: string): boolean {
  if (secret.length !== token.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < secret.length; i++) {
    result |= secret.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}

function validateBearerAuth(req: Request, env: Env): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return false;
  }

  const validSecrets = [
    env.INGESTION_TRIGGER_SECRET,
    env.INTERNAL_API_SECRET,
  ].filter((secret): secret is string =>
    Boolean(secret && secret.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do worker
    console.warn(
      "[AUTH] Nenhum secret de autorização configurado (INGESTION_TRIGGER_SECRET, INTERNAL_API_SECRET).",
    );
    return false;
  }

  return validSecrets.some((secret) => safeCompare(secret, token));
}

async function triggerIngestion(env: Env): Promise<Response> {
  const url = env.INGESTION_SERVICE_URL;
  if (!url) {
    throw new Error(
      "[Ingestion Worker] INGESTION_SERVICE_URL não configurado.",
    );
  }

  const token = env.INTERNAL_API_SECRET || env.INGESTION_TRIGGER_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      trigger: "cloudflare-worker",
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao disparar ingestão remota: status ${response.status}`,
    );
  }

  return response;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/trigger") {
      if (!validateBearerAuth(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      ctx.waitUntil(
        triggerIngestion(env).catch((error: unknown) => {
          // biome-ignore lint/suspicious/noConsole: Log de erro de acionamento manual
          console.error("[Manual Trigger] Falha ao acionar ingestão:", error);
        }),
      );

      return new Response(JSON.stringify({ message: "Ingestion triggered" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      // biome-ignore lint/suspicious/noConsole: Log de auditoria de disparo do Cron
      console.log(
        `[Cron Trigger] Acionando ingestão programada: ${event.cron} (${new Date().toISOString()})`,
      );
      await triggerIngestion(env);
      // biome-ignore lint/suspicious/noConsole: Log de auditoria de conclusão do Cron
      console.log("[Cron Trigger] Ingestão programada despachada com sucesso.");
    } catch (error: unknown) {
      // biome-ignore lint/suspicious/noConsole: Log de falha de disparo do Cron
      console.error(
        "[Cron Trigger] Erro durante despacho da ingestão programada:",
        error,
      );
    }
  },
};
