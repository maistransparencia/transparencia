import {
  getEntidades,
  getExecucaoOrcamentariaMetrics,
  getPortalConfig,
} from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { ImageResponse } from "next/og";
import {
  OGCardTemplate,
  type OGMetricItem,
} from "@/components/og/og-card-template";
import { getPostHogServer } from "@/posthog-server";

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
    const execucao =
      empresaIds.length > 0
        ? await getExecucaoOrcamentariaMetrics(
            portalSlug,
            currentYear,
            empresaIds,
          )
        : [];

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalDotacao = execucao.reduce(
      (acc, i) => acc + i.totalDotacaoAtualizada,
      0,
    );
    const totalEmpenhado = execucao.reduce(
      (acc, i) => acc + i.totalEmpenhado,
      0,
    );
    const totalLiquidado = execucao.reduce(
      (acc, i) => acc + i.totalLiquidado,
      0,
    );
    const totalPago = execucao.reduce((acc, i) => acc + i.totalPago, 0);

    const percentualEmpenhado =
      totalDotacao > 0 ? (totalEmpenhado / totalDotacao) * 100 : 0;
    const percentualLiquidado =
      totalDotacao > 0 ? (totalLiquidado / totalDotacao) * 100 : 0;
    const percentualPago =
      totalDotacao > 0 ? (totalPago / totalDotacao) * 100 : 0;

    const metrics: OGMetricItem[] = [
      {
        label: "Dotação Atualizada",
        value: fmtCompact(totalDotacao),
        detail: "100% autorizado",
        variant: "default",
      },
      {
        label: "Empenhado",
        value: fmtCompact(totalEmpenhado),
        detail: `${fmtPercent(percentualEmpenhado)} da dotação`,
        variant: "default",
      },
      {
        label: "Liquidado",
        value: fmtCompact(totalLiquidado),
        detail: `${fmtPercent(percentualLiquidado)} da dotação`,
        variant: "default",
      },
      {
        label: "Pago",
        value: fmtCompact(totalPago),
        detail: `${fmtPercent(percentualPago)} da dotação`,
        variant: "success",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Execução Orçamentária"
        subtitle={`Exercício ${currentYear} • Acompanhamento dos Estágios da Despesa`}
        badgeText="Painel do Orçamento"
        metrics={metrics}
        lastExtractionDate={portalConfig?.dataExtracao}
      />,
      { ...size },
    );
  } catch (_error) {
    const posthog = getPostHogServer();
    if (posthog) {
      posthog.captureException(_error as Error, undefined, {
        portalSlug,
        route: "og:orcamento",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Orçamento Municipal & Execução"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel do Orçamento",
            value: "Disponível",
            detail: "Acesse para consultar dotações e programas",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
