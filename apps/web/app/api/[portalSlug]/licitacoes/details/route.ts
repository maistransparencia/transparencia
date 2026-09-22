import { getLicitacaoByNumero, getLicitacaoItens } from "@transparencia/db";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ portalSlug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { portalSlug } = await params;
  if (!portalSlug) {
    return NextResponse.json(
      { error: "Portal não especificado." },
      { status: 400 },
    );
  }

  // Rate limit: 60 requisições por minuto por IP
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`licitacao-details:${ip}`, 60, 60 * 1000);
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
  const numero = searchParams.get("numero")?.trim();
  const anoParam = searchParams.get("ano");

  if (!numero) {
    return NextResponse.json(
      { error: "Número do processo ou ID não informado." },
      { status: 400 },
    );
  }

  const ano = anoParam ? Number.parseInt(anoParam, 10) : undefined;
  const parsedAno = !Number.isNaN(ano) ? ano : undefined;

  const [licitacao, itens] = await Promise.all([
    getLicitacaoByNumero(portalSlug, numero, parsedAno),
    getLicitacaoItens(portalSlug, {
      licitacaoNumero: numero,
      ano: parsedAno,
    }),
  ]);

  if (!licitacao) {
    return NextResponse.json(
      { error: "Processo licitatório não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    licitacao,
    itens,
  });
}
