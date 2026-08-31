import { NextResponse } from "next/server";
import { dispatchRadarDigest } from "../../../../lib/radar-digest";

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
    process.env.DIGEST_SECRET,
    process.env.INTERNAL_API_SECRET,
  ].filter((secret): secret is string =>
    Boolean(secret && secret.trim().length > 0),
  );

  if (validSecrets.length === 0) {
    return false;
  }

  return validSecrets.includes(token);
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

    const parsedAno = typeof ano === "number" ? ano : undefined;
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
