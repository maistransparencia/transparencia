import { getRadarAnomaliasCount } from "@transparencia/db";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ portalSlug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { portalSlug } = await params;
  if (!portalSlug || portalSlug.trim() === "") {
    return NextResponse.json(
      { error: "Portal não especificado." },
      { status: 400 },
    );
  }

  // Rate limit: 60 requisições por minuto por IP
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`radar-count:${ip}`, 60, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Muitas requisições consecutivas. Aguarde alguns instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetInSeconds) },
      },
    );
  }

  const { searchParams } = new URL(req.url);
  const anoParam = searchParams.get("ano");
  let ano: number | undefined;
  if (anoParam !== null) {
    const parsed = Number.parseInt(anoParam, 10);
    if (!Number.isInteger(parsed) || Math.abs(parsed) > 2147483647) {
      return NextResponse.json(
        { error: "Parâmetro 'ano' inválido." },
        { status: 400 },
      );
    }
    ano = parsed;
  }

  try {
    const count = await getRadarAnomaliasCount({
      portalSlug,
      ano,
    });

    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao resgatar contagem de alertas." },
      { status: 500 },
    );
  }
}
