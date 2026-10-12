import { getPortalConfig, getResumoObrasPorPortal } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import { ImageResponse } from "next/og";
import {
  OGCardTemplate,
  type OGMetricItem,
} from "@/components/og/og-card-template";
import { createCachedDataLoader } from "@/lib/cache";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchOgObrasData(portalSlug: string) {
  const [portalConfig, resumo] = await Promise.all([
    getPortalConfig(portalSlug),
    getResumoObrasPorPortal(portalSlug),
  ]);
  return { portalConfig, resumo };
}

const loadOgObrasData = createCachedDataLoader(fetchOgObrasData, "og-obras");

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;

  try {
    const { portalConfig, resumo } = await loadOgObrasData(portalSlug);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const metrics: OGMetricItem[] = [
      {
        label: "Total de Obras",
        value: String(resumo.totalObras),
        detail: "Projetos cadastrados",
        variant: "default",
      },
      {
        label: "Em Execução",
        value: String(resumo.emExecucao),
        detail: "Canteiros ativos",
        variant: "success",
      },
      {
        label: "Paralisadas",
        value: String(resumo.paralisadas),
        detail:
          resumo.paralisadas > 0
            ? "Requer fiscalização"
            : "Nenhuma paralisação",
        variant: resumo.paralisadas > 0 ? "warning" : "default",
      },
      {
        label: "Investimento Previsto",
        value: fmtCompact(resumo.valorTotalInvestimento),
        detail: `${resumo.concluidas} concluídas`,
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Obras Públicas & Impacto Urbano"
        subtitle="Mapeamento e fiscalização dos projetos e investimentos de infraestrutura"
        badgeText="Painel de Obras"
        metrics={metrics}
        lastExtractionDate={portalConfig?.dataExtracao}
        brasaoAsset={portalConfig?.brasaoAsset}
      />,
      {
        ...size,
      },
    );
  } catch {
    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal da Transparência"
        pageTitle="Obras Públicas & Impacto Urbano"
        subtitle="Mapeamento e fiscalização dos investimentos de infraestrutura"
        badgeText="Painel de Obras"
        metrics={[
          {
            label: "Transparência de Obras",
            value: "Dados Abertos",
            detail: "Lei 14.133/2021",
            variant: "default",
          },
        ]}
      />,
      {
        ...size,
      },
    );
  }
}
