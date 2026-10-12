import { permanentRedirect } from "next/navigation";

interface ContratosPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{
    numero?: string | string[];
    contratoNumero?: string | string[];
    ano?: string | string[];
  }>;
}

function extractFirstParam(val?: string | string[]): string {
  if (!val) return "";
  const first = Array.isArray(val) ? val[0] : val;
  return typeof first === "string" ? first.trim() : "";
}

export default async function ContratosPage({
  params,
  searchParams,
}: ContratosPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const rawNumero = (() => {
    const num = extractFirstParam(resolvedSearchParams.numero);
    if (num) return num;
    return extractFirstParam(resolvedSearchParams.contratoNumero);
  })();

  const rawAno = extractFirstParam(resolvedSearchParams.ano);

  if (rawNumero) {
    const encodedNumero = encodeURIComponent(rawNumero);
    const anoQuery = rawAno ? `&ano=${encodeURIComponent(rawAno)}` : "";
    permanentRedirect(
      `/${portalSlug}/licitacoes?contratoNumero=${encodedNumero}${anoQuery}#contratos-servicos-vigentes`,
    );
  }

  const anoQuery = rawAno ? `?ano=${encodeURIComponent(rawAno)}` : "";
  permanentRedirect(
    `/${portalSlug}/licitacoes${anoQuery}#contratos-servicos-vigentes`,
  );
}
