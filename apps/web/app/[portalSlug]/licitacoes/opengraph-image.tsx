import {
  getContratosServicosVigentes,
  getDistribucaoModalidadesMetrics,
  getEntidades,
  getPortalConfig,
} from "@transparencia/db";
import { fmtCompact, fmtNumber } from "@transparencia/ui";
import { ImageResponse } from "next/og";
import {
  OGCardTemplate,
  type OGMetricItem,
} from "@/components/og/og-card-template";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;
  const currentYear = new Date().getFullYear();

  try {
    const [portalConfig, entidades] = await Promise.all([
      getPortalConfig(portalSlug),
      getEntidades(portalSlug),
    ]);

    const empresaIds = entidades.map((e) => e.id).filter(Boolean);
    const [modalidades, contratosVigentes] = await Promise.all([
      empresaIds.length > 0
        ? getDistribucaoModalidadesMetrics(portalSlug, currentYear, empresaIds)
        : [],
      getContratosServicosVigentes(portalSlug, currentYear, empresaIds),
    ]);

    const portalDisplayName =
      portalConfig?.displayName || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf || "RJ";

    const totalHomologado = modalidades.reduce(
      (acc, m) => acc + m.valorTotal,
      0,
    );
    const totalProcessos = modalidades.reduce(
      (acc, m) => acc + m.quantidade,
      0,
    );
    const totalContratos = contratosVigentes.length;
    const valorContratosVigentes = contratosVigentes.reduce(
      (acc, c) => acc + c.totalPago,
      0,
    );

    const metrics: OGMetricItem[] = [
      {
        label: "Total Homologado",
        value: fmtCompact(totalHomologado),
        detail: "Compras e Contratações",
        variant: "default",
      },
      {
        label: "Processos Licitatórios",
        value: fmtNumber(totalProcessos),
        detail: "No Exercício",
        variant: "default",
      },
      {
        label: "Contratos Vigentes",
        value: fmtNumber(totalContratos),
        detail: `Pago: ${fmtCompact(valorContratosVigentes)}`,
        variant: "success",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Licitações & Contratos Públicos"
        subtitle={`Exercício ${currentYear} • Processos de Compras e Contratações`}
        badgeText="Painel de Compras"
        metrics={metrics}
        lastExtractionDate={portalConfig?.dataExtracao}
      />,
      { ...size },
    );
  } catch (_error) {
    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Licitações & Contratos Públicos"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel de Licitações",
            value: "Disponível",
            detail: "Acesse para consultar contratos e editais",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
