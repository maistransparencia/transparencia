import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";

/**
 * Endpoint de Webhook de Ingestão de Dados.
 *
 * Registra a conclusão (sucesso ou falha) das rotinas automatizadas de ingestão
 * executadas nos portais de transparência municipais, em conformidade com o
 * Art. 48-A, I da Lei Complementar nº 101/2000 (LRF):
 * https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a
 */

function safeCompare(secret: string, token: string): boolean {
  const bufSecret = Buffer.from(secret);
  const bufToken = Buffer.from(token);
  if (bufSecret.length !== bufToken.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufSecret, bufToken);
}

function validateBearerAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return false;
  }

  const validSecrets = [env.INTERNAL_API_SECRET, env.CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret && secret.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do servidor
    console.warn(
      "[WEBHOOK] Nenhum secret de autorização configurado (INTERNAL_API_SECRET, CRON_SECRET).",
    );
    return false;
  }

  return validSecrets.some((secret) => safeCompare(secret, token));
}

export const ingestionWebhookSchema = z
  .object({
    portalSlug: z.string().min(1, "Campo 'portalSlug' é obrigatório"),
    status: z.enum(["success", "failure"]),
    timestamp: z.string().datetime({
      offset: true,
      message: "Campo 'timestamp' deve estar no formato ISO 8601",
    }),
    durationMs: z.number().int().nonnegative().optional(),
    recordsProcessed: z.number().int().nonnegative().optional(),
    errorMessage: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "failure" && !data.errorMessage?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Campo 'errorMessage' é obrigatório quando status for 'failure'.",
        path: ["errorMessage"],
      });
    }
  });

export type IngestionWebhookPayload = z.infer<typeof ingestionWebhookSchema>;

export async function POST(req: Request) {
  try {
    if (!validateBearerAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)." },
        { status: 400 },
      );
    }

    const parseResult = ingestionWebhookSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parseResult.data;

    if (payload.status === "success") {
      // biome-ignore lint/suspicious/noConsole: Log de auditoria da ingestão
      console.log(
        `[INGESTION_WEBHOOK] Sucesso para portal='${payload.portalSlug}': ` +
          `${payload.recordsProcessed ?? 0} registros processados em ${payload.durationMs ?? 0}ms ` +
          `(${payload.timestamp})`,
      );

      try {
        revalidatePath(`/${payload.portalSlug}`, "layout");
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: Log de aviso caso revalidatePath falhe fora de contexto de request
        console.warn(`[INGESTION_WEBHOOK] Aviso ao revalidar cache: ${err}`);
      }

      // Ponto de extensão para Story 11.3: disparo de notificações Web Push aos cidadãos inscritos
      // await dispatchCivicPushNotification(payload.portalSlug);

      return NextResponse.json(
        { success: true, message: "Ingestion recorded successfully" },
        { status: 200 },
      );
    }

    // biome-ignore lint/suspicious/noConsole: Log de auditoria de falha da ingestão
    console.error(
      `[INGESTION_WEBHOOK] Falha para portal='${payload.portalSlug}': ` +
        `${payload.errorMessage} (${payload.timestamp})`,
    );

    return NextResponse.json(
      { success: false, message: "Ingestion failure acknowledged" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Erro interno ao processar webhook";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
