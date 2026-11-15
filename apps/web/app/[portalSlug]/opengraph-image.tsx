import {
  getEntidades,
  getExecucaoOrcamentariaMetrics,
  getFolhaVsServicosMetrics,
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
  return {
    portalConfig,
    posicaoFiscal,
    execucaoList,
    folhaList,
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
    const { portalConfig, posicaoFiscal, execucaoList, folhaList } =
      await loadOgHomepageData(portalSlug, currentYear);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalArrecadado = posicaoFiscal?.totalArrecadado ?? 0;
    const despesasPagas = posicaoFiscal?.despesasPagas ?? 0;
    const totalEmpenhado = execucaoList.reduce(
      (acc, item) => acc + item.totalEmpenhado,
      0,
    );
    const rgfPessoal = folhaList[0]?.rgf ?? null;
    const percentualFolha =
      rgfPessoal?.percentualDespesaPessoal ??
      folhaList[0]?.percentualFolha ??
      0;

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
        // Só o número oficial do RGF recebe veredito; a estimativa do portal fica neutra.
        detail: rgfPessoal
          ? (() => {
              if (!rgfPessoal.statusLrf) return "Número oficial do RGF";
              if (rgfPessoal.statusLrf === "normal")
                return "Dentro dos limites da lei";
              return "Alerta de Limite LRF";
            })()
          : "Estimativa do portal",
        variant: (() => {
          if (!rgfPessoal?.statusLrf) return "default";
          if (rgfPessoal.statusLrf === "normal") return "success";
          if (rgfPessoal.statusLrf === "excedido") return "danger";
          return "warning";
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
        brasaoAsset={portalConfig?.brasaoAsset}
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
