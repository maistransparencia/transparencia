import { getPortalConfig, getResumoEducacao } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import { ImageResponse } from "next/og";
import { buildRankingTrend } from "@/app/[portalSlug]/educacao/view-model";
import {
  OGCardTemplate,
  type OGMetricItem,
} from "@/components/og/og-card-template";
import { createCachedDataLoader } from "@/lib/cache";
import { getPostHogServer } from "@/posthog-server";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchOgEducacaoData(portalSlug: string, exercicio: number) {
  const [portalConfig, resumo] = await Promise.all([
    getPortalConfig(portalSlug),
    getResumoEducacao(portalSlug, exercicio),
  ]);
  return { portalConfig, resumo };
}

const loadOgEducacaoData = createCachedDataLoader(
  fetchOgEducacaoData,
  "og-educacao",
);

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;

  try {
    // Mesmo exercício padrão da página (/educacao sem ?ano): despesa liquidada sempre desse ano.
    const exercicio = new Date().getFullYear();
    const { portalConfig, resumo } = await loadOgEducacaoData(
      portalSlug,
      exercicio,
    );

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const notaIdebStr = (() => {
      if (resumo?.notaIdeb !== null && resumo?.notaIdeb !== undefined) {
        return resumo.notaIdeb.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
        });
      }
      return "—";
    })();

    const crescimentoStr = (() => {
      if (
        resumo?.crescimentoPontosIdeb !== null &&
        resumo?.crescimentoPontosIdeb !== undefined
      ) {
        const prefix = resumo.crescimentoPontosIdeb > 0 ? "+" : "";
        return `${prefix}${resumo.crescimentoPontosIdeb.toLocaleString(
          "pt-BR",
          {
            minimumFractionDigits: 1,
          },
        )} ponto`;
      }
      return "—";
    })();

    const despesaEducacaoStr = (() => {
      if (
        resumo?.despesaLiquidadaEducacao !== null &&
        resumo?.despesaLiquidadaEducacao !== undefined
      ) {
        return fmtCompact(resumo.despesaLiquidadaEducacao);
      }
      return "—";
    })();

    const rankingStr = (() => {
      if (
        resumo?.posicaoRanking !== null &&
        resumo?.posicaoRanking !== undefined
      ) {
        return `${resumo.posicaoRanking}º`;
      }
      return "—";
    })();

    const rankingDetail = (() => {
      if (
        resumo?.posicaoRanking !== null &&
        resumo?.posicaoRanking !== undefined &&
        resumo?.totalMunicipios !== null &&
        resumo?.totalMunicipios !== undefined
      ) {
        const total = `entre ${resumo.totalMunicipios} municípios${portalUf ? ` de ${portalUf}` : ""}`;
        const tendencia = buildRankingTrend(resumo.variacaoPosicoes);
        return tendencia ? `${tendencia.value} · ${total}` : total;
      }
      return "Ranking estadual do IDEB";
    })();

    const cicloLabel = (() => {
      if (resumo?.ano !== null && resumo?.ano !== undefined) {
        return `Nota IDEB (Ciclo ${resumo.ano})`;
      }
      return "Nota IDEB";
    })();

    const metrics: OGMetricItem[] = [
      {
        label: cicloLabel,
        value: notaIdebStr,
        detail: "Anos Iniciais",
        variant: "info",
      },
      {
        label: "Evolução Bienal",
        value: crescimentoStr,
        detail: "Variação frente ao ciclo anterior",
        variant: "success",
      },
      {
        label: "Ranking Estadual",
        value: rankingStr,
        detail: rankingDetail,
        variant: "default",
      },
      {
        label: `Despesa Liquidada em ${exercicio}`,
        value: despesaEducacaoStr,
        detail: `Gasto efetivo com educação em ${exercicio}`,
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Educação Básica & Responsabilidade Fiscal"
        subtitle="Evolução do IDEB, proficiência SAEB, gasto com educação e compras da educação"
        badgeText="Painel da Educação"
        metrics={metrics}
        lastExtractionDate={portalConfig?.dataExtracao}
        brasaoAsset={portalConfig?.brasaoAsset}
      />,
      {
        ...size,
      },
    );
  } catch (_error) {
    const posthog = getPostHogServer();
    if (posthog) {
      posthog.captureException(_error as Error, undefined, {
        portalSlug,
        route: "og:educacao",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal da Transparência"
        pageTitle="Educação Básica & Responsabilidade Fiscal"
        subtitle="Evolução do IDEB, proficiência SAEB e limites constitucionais"
        badgeText="Painel da Educação"
        metrics={[
          {
            label: "Educação Pública",
            value: "Dados Abertos",
            detail: "INEP & STN/MCASP",
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
