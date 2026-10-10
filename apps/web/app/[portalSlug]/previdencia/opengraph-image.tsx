import {
  getHistoriaPrevidenciaMetrics,
  getPortalConfig,
} from "@transparencia/db";
import { fmtCompact, fmtNumber } from "@transparencia/ui";
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

async function fetchOgPrevidenciaData(portalSlug: string, currentYear: number) {
  const portalConfig = await getPortalConfig(portalSlug);
  const previdencia = await getHistoriaPrevidenciaMetrics(
    portalSlug,
    currentYear,
  );
  return { portalConfig, previdencia };
}

const loadOgPrevidenciaData = createCachedDataLoader(
  fetchOgPrevidenciaData,
  "og-previdencia",
);

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;
  const currentYear = new Date().getFullYear();

  try {
    const { portalConfig, previdencia } = await loadOgPrevidenciaData(
      portalSlug,
      currentYear,
    );

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;
    const sigla = portalConfig?.previdencia?.sigla || "RPPS";

    const despesasPagas = previdencia?.totalPago ?? 0;
    const aportesQuitados = previdencia?.totalAporteQuitado ?? 0;
    const pagoPatronal = previdencia?.totalPagoPatronal ?? 0;
    const servidoresEfetivos = previdencia?.servidoresEfetivos ?? 0;

    const metrics: OGMetricItem[] = [
      {
        label: "Despesas Previdenciárias",
        value: fmtCompact(despesasPagas),
        detail: "Benefícios Pagos",
        variant: "default",
      },
      {
        label: "Aportes Quitados",
        value: fmtCompact(aportesQuitados),
        detail: "Repasses Previdenciários",
        variant: "success",
      },
      {
        label: "Patronal Pago",
        value: fmtCompact(pagoPatronal),
        detail: "Contribuição Patronal",
        variant: "default",
      },
      {
        label: "Servidores Efetivos",
        value: fmtNumber(servidoresEfetivos),
        detail: "Segurados do Fundo",
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle={`Previdência Municipal (${sigla})`}
        subtitle={`Exercício ${currentYear} • Aposentadorias e Fundo Previdenciário`}
        badgeText="Regime Próprio (RPPS)"
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
        route: "og:previdencia",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Previdência Municipal"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel Previdenciário",
            value: "Disponível",
            detail: "Acesse para consultar receitas e benefícios do RPPS",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
