import {
  getEntidades,
  getFolhaVsServicosMetrics,
  getLimiteMaximoLrfPessoal,
  getPercentualChefiasEfetivasMetrics,
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
    const [folhaMetrics, limiteMaximoLrf, percentualChefiasEfetivas] =
      await Promise.all([
        empresaIds.length > 0
          ? getFolhaVsServicosMetrics({
              years: [currentYear],
              empresaIds,
              portalSlug,
            })
          : [],
        getLimiteMaximoLrfPessoal(currentYear),
        empresaIds.length > 0
          ? getPercentualChefiasEfetivasMetrics(
              portalSlug,
              currentYear,
              empresaIds,
            )
          : null,
      ]);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const folhaData = folhaMetrics[0];
    const totalFolha = folhaData?.totalFolha ?? 0;
    const totalPago = folhaData?.totalPago ?? 0;
    const percentualFolha = folhaData?.percentualFolha ?? 0;
    const percentualEfetivos = percentualChefiasEfetivas ?? 0;
    const limiteTeto = limiteMaximoLrf ?? 60;

    const metrics: OGMetricItem[] = [
      {
        label: "Total da Folha",
        value: fmtCompact(totalFolha),
        detail: "Gastos com Pessoal",
        variant: "default",
      },
      {
        label: "Limite LRF Pessoal",
        value: fmtPercent(percentualFolha),
        detail:
          percentualFolha <= limiteTeto * 0.9
            ? `Dentro do Limite Legal (${limiteTeto}%)`
            : "Alerta de Limite LRF",
        variant: (() => {
          if (percentualFolha <= limiteTeto * 0.9) return "success";
          if (percentualFolha <= limiteTeto) return "warning";
          return "danger";
        })(),
      },
      {
        label: "Total Pago",
        value: fmtCompact(totalPago),
        detail: "Execução Financeira",
        variant: "default",
      },
      {
        label: "Chefias Efetivas",
        value: fmtPercent(percentualEfetivos),
        detail: "Servidores Concursados",
        variant: "success",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Quadro de Pessoal & Folha de Pagamento"
        subtitle={`Exercício ${currentYear} • Servidores Públicos e Limite da LRF`}
        badgeText="Gestão de Pessoal"
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
        route: "og:pessoal",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Quadro de Pessoal & Folha de Pagamento"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel de Pessoal",
            value: "Disponível",
            detail: "Acesse para consultar servidores e cargos",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
