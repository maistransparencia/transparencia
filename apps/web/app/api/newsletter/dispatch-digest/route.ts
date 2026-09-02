import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { dispatchRadarDigest } from "../../../../lib/radar-digest";

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
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return false;
  }

  const validSecrets = [
    env.CRON_SECRET,
    env.DIGEST_SECRET,
    env.INTERNAL_API_SECRET,
  ].filter((secret): secret is string =>
    Boolean(secret && secret.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do servidor
    console.warn(
      "[AUTH] Nenhum secret de autorização configurado (CRON_SECRET, DIGEST_SECRET, INTERNAL_API_SECRET).",
    );
    return false;
  }

  return validSecrets.some((secret) => safeCompare(secret, token));
}

function parseAno(ano: unknown): number | undefined {
  if (typeof ano === "number" && Number.isInteger(ano) && ano > 0) {
    return ano;
  }
  if (typeof ano === "string") {
    const parsed = Number.parseInt(ano, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    if (!validateBearerAuth(req)) {
      return NextResponse.json(
        { error: "Unauthorized: Token de autorização inválido ou ausente." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)." },
        { status: 400 },
      );
    }

    const { portalSlug, ano, dryRun } = body;

    if (!portalSlug || typeof portalSlug !== "string" || !portalSlug.trim()) {
      return NextResponse.json(
        { error: "Campo 'portalSlug' é obrigatório." },
        { status: 400 },
      );
    }

    const parsedAno = parseAno(ano);
    const parsedDryRun = typeof dryRun === "boolean" ? dryRun : false;

    const result = await dispatchRadarDigest({
      portalSlug: portalSlug.trim(),
      ano: parsedAno,
      dryRun: parsedDryRun,
    });

    const statusCode = result.success ? 200 : 500;
    return NextResponse.json(result, { status: statusCode });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Erro interno ao despachar boletim";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
