import {
  getEntidades,
  getExecucaoOrcamentariaMetrics,
  getFolhaVsServicosMetrics,
  getLimiteMaximoLrfPessoal,
  getPortalConfig,
  getPosicaoFiscalMetrics,
} from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { ImageResponse } from "next/og";
import {
  OGCardTemplate,
  type OGMetricItem,
} from "@/components/og/og-card-template";
import { createCachedDataLoader } from "@/lib/cache";
import { getPostHogServer } from "@/posthog-server";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchOgHomepageData(portalSlug: string, currentYear: number) {
  const portalConfig = await getPortalConfig(portalSlug);
  const entidades = await getEntidades(portalSlug);
  const empresaIds = entidades.map((e) => e.id).filter(Boolean);
  const posicaoFiscal =
    empresaIds.length > 0
      ? await getPosicaoFiscalMetrics(portalSlug, currentYear, empresaIds)
      : null;
  const execucaoList =
    empresaIds.length > 0
      ? await getExecucaoOrcamentariaMetrics(
          portalSlug,
          currentYear,
          empresaIds,
        )
      : [];
  const folhaList =
    empresaIds.length > 0
      ? await getFolhaVsServicosMetrics({
          years: [currentYear],
          empresaIds,
          portalSlug,
        })
      : [];
  const limiteMaximoLrf = await getLimiteMaximoLrfPessoal(currentYear);
  return {
    portalConfig,
    posicaoFiscal,
    execucaoList,
    folhaList,
    limiteMaximoLrf,
  };
}

const loadOgHomepageData = createCachedDataLoader(
  fetchOgHomepageData,
  "og-homepage",
);

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;
  const currentYear = new Date().getFullYear();

  try {
    const {
      portalConfig,
      posicaoFiscal,
      execucaoList,
      folhaList,
      limiteMaximoLrf,
    } = await loadOgHomepageData(portalSlug, currentYear);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalArrecadado = posicaoFiscal?.totalArrecadado ?? 0;
    const despesasPagas = posicaoFiscal?.despesasPagas ?? 0;
    const totalEmpenhado = execucaoList.reduce(
      (acc, item) => acc + item.totalEmpenhado,
      0,
    );
    const percentualFolha = folhaList[0]?.percentualFolha ?? 0;
    const limiteTeto = limiteMaximoLrf ?? 60;

    const metrics: OGMetricItem[] = [
      {
        label: "Total Arrecadado",
        value: fmtCompact(totalArrecadado),
        detail: "Receitas do Exercício",
        variant: "success",
      },
      {
        label: "Total Empenhado",
        value: fmtCompact(totalEmpenhado),
        detail: "Orçamento Comprometido",
        variant: "default",
      },
      {
        label: "Despesas Pagas",
        value: fmtCompact(despesasPagas),
        detail: "Execução Financeira",
        variant: "default",
      },
      {
        label: "Comprometimento Folha",
        value: fmtPercent(percentualFolha),
        detail:
          percentualFolha <= limiteTeto * 0.9
            ? `Dentro do Limite (${limiteTeto}%)`
            : "Alerta de Limite LRF",
        variant: (() => {
          if (percentualFolha <= limiteTeto * 0.9) return "success";
          if (percentualFolha <= limiteTeto) return "warning";
          return "danger";
        })(),
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Visão Geral & Posição Fiscal"
        subtitle={`Exercício ${currentYear} • Balanço Orçamentário e Financeiro`}
        badgeText="Posição Consolidada"
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
        route: "og:homepage",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Visão Geral & Posição Fiscal"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Transparência Pública",
            value: "Disponível",
            detail: "Acesse para consultar dados fiscais",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
