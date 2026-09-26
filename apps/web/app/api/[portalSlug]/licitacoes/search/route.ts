import { searchLicitacoesEContratos } from "@transparencia/db";
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

  // Rate limit para busca: 60 requisições por minuto por IP
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`search:${ip}`, 60, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Muitas buscas consecutivas. Aguarde alguns instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetInSeconds) },
      },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const anoParam = searchParams.get("ano");
  const limiteParam = searchParams.get("limite");
  const tipoParam = searchParams.get("tipo");

  const cleanTermo = q.trim();
  if (cleanTermo.length < 2) {
    return NextResponse.json({
      licitacoes: [],
      contratos: [],
      total: 0,
    });
  }

  const ano = anoParam ? Number.parseInt(anoParam, 10) : undefined;
  const limite = limiteParam ? Number.parseInt(limiteParam, 10) : 10;
  const tipo = (() => {
    if (
      tipoParam === "licitacao" ||
      tipoParam === "contrato" ||
      tipoParam === "todos"
    ) {
      return tipoParam;
    }
    return undefined;
  })();

  const result = await searchLicitacoesEContratos({
    portalSlug,
    termo: cleanTermo,
    ano: !Number.isNaN(ano) ? ano : undefined,
    limite: !Number.isNaN(limite) ? limite : 10,
    tipo,
  });

  return NextResponse.json(result);
}
