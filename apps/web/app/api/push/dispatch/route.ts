import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { dispatchPushNotification } from "@/lib/push-dispatcher";

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
  if (!authHeader) {
    return false;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }
  const token = match[1].trim();
  if (!token) {
    return false;
  }

  const validSecrets = [env.INTERNAL_API_SECRET, env.CRON_SECRET].filter(
    (s): s is string => Boolean(s && s.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do servidor
    console.warn(
      "[PUSH_DISPATCH] Nenhum secret de autorização configurado (INTERNAL_API_SECRET, CRON_SECRET).",
    );
    return false;
  }

  return validSecrets.some((secret) => safeCompare(secret, token));
}

const dispatchSchema = z.object({
  portalSlug: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  topic: z.string().optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    if (!validateBearerAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)" },
        { status: 400 },
      );
    }

    const parsed = dispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    const result = await dispatchPushNotification(parsed.data);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Erro interno ao despachar notificação push";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
