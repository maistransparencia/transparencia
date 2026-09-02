import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  publishSocial,
  type SocialChannel,
  type SocialPublishOptions,
} from "../../../../lib/social-publisher";

function safeCompare(secret: string, token: string): boolean {
  const hashSecret = crypto.createHash("sha256").update(secret).digest();
  const hashToken = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(hashSecret, hashToken);
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
    process.env.CRON_SECRET,
    process.env.INTERNAL_API_SECRET,
    process.env.SOCIAL_SECRET,
  ].filter((secret): secret is string =>
    Boolean(secret && secret.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    // biome-ignore lint/suspicious/noConsole: Log de aviso de configuração do servidor
    console.warn(
      "[AUTH] Nenhum secret de autorização configurado (CRON_SECRET, INTERNAL_API_SECRET, SOCIAL_SECRET).",
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

    const body = (await req
      .json()
      .catch(() => null)) as Partial<SocialPublishOptions> | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)." },
        { status: 400 },
      );
    }

    const {
      portalSlug,
      type,
      channels,
      ano,
      text,
      version,
      summary,
      dryRun,
      baseUrl,
    } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        {
          error:
            "Campo 'type' é obrigatório (fiscal_digest | extraction | release | custom).",
        },
        { status: 400 },
      );
    }

    if (
      type !== "release" &&
      type !== "custom" &&
      (!portalSlug || typeof portalSlug !== "string" || !portalSlug.trim())
    ) {
      return NextResponse.json(
        { error: "Campo 'portalSlug' é obrigatório para o tipo informado." },
        { status: 400 },
      );
    }

    const validTypes = [
      "fiscal_digest",
      "extraction",
      "release",
      "custom",
    ] as const;
    if (!validTypes.includes(type as (typeof validTypes)[number])) {
      return NextResponse.json(
        {
          error: `Tipo '${type}' inválido. Tipos suportados: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const validChannels = ["x", "facebook"] as const;
    if (channels !== undefined && channels !== "all") {
      if (
        !Array.isArray(channels) ||
        channels.length === 0 ||
        channels.some(
          (c) => !validChannels.includes(c as (typeof validChannels)[number]),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Campo 'channels' deve ser 'all' ou um array contendo 'x' e/ou 'facebook'.",
          },
          { status: 400 },
        );
      }
    }

    const parsedAno = parseAno(ano);
    const parsedDryRun = typeof dryRun === "boolean" ? dryRun : false;

    const result = await publishSocial({
      portalSlug: portalSlug?.trim() || "",
      type: type as (typeof validTypes)[number],
      channels: channels as SocialChannel[] | "all" | undefined,
      ano: parsedAno,
      text: typeof text === "string" ? text : undefined,
      version: typeof version === "string" ? version : undefined,
      summary: typeof summary === "string" ? summary : undefined,
      dryRun: parsedDryRun,
      baseUrl: typeof baseUrl === "string" ? baseUrl : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Erro interno ao processar despacho social";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
