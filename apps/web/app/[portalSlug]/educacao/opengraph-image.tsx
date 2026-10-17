import { getPortalConfig, getResumoEducacao } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
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

async function fetchOgEducacaoData(portalSlug: string) {
  const [portalConfig, resumo] = await Promise.all([
    getPortalConfig(portalSlug),
    getResumoEducacao(portalSlug),
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
    const { portalConfig, resumo } = await loadOgEducacaoData(portalSlug);

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
      return "Estável";
    })();

    const custoAlunoStr = (() => {
      if (
        resumo?.custoAnualPorAluno !== null &&
        resumo?.custoAnualPorAluno !== undefined
      ) {
        return fmtCompact(resumo.custoAnualPorAluno);
      }
      return "—";
    })();

    const mdeStr = (() => {
      if (
        resumo?.mdePercentual !== null &&
        resumo?.mdePercentual !== undefined
      ) {
        return `${resumo.mdePercentual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`;
      }
      return "25,0%";
    })();

    const mdeVariant =
      resumo?.mdePercentual !== null &&
      resumo?.mdePercentual !== undefined &&
      resumo.mdePercentual < 25
        ? "danger"
        : "success";

    const metrics: OGMetricItem[] = [
      {
        label: `Nota IDEB (Ciclo ${resumo?.ano ?? 2025})`,
        value: notaIdebStr,
        detail: "Anos Iniciais",
        variant: "info",
      },
      {
        label: "Evolução Bienal",
        value: crescimentoStr,
        detail: "Superação escolar",
        variant: "success",
      },
      {
        label: "MDE Constitucional",
        value: mdeStr,
        detail: "Mínimo 25% (Art. 212)",
        variant: mdeVariant,
      },
      {
        label: "Custo Anual / Aluno",
        value: custoAlunoStr,
        detail: "Função 12 (Educação)",
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Educação Básica & Responsabilidade Fiscal"
        subtitle="Evolução do IDEB, proficiência SAEB, limites constitucionais de MDE/FUNDEB e compras da educação"
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
