import { getHistoriaCapremMetrics, getPortalConfig } from "@transparencia/db";
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
    const [portalConfig, caprem] = await Promise.all([
      getPortalConfig(portalSlug),
      getHistoriaCapremMetrics(portalSlug, currentYear),
    ]);

    const portalDisplayName =
      portalConfig?.displayName || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf || "RJ";

    const despesasPagas = caprem?.totalPago ?? 0;
    const aportesQuitados = caprem?.totalAporteQuitado ?? 0;
    const pagoPatronal = caprem?.totalPagoPatronal ?? 0;
    const servidoresEfetivos = caprem?.servidoresEfetivos ?? 0;

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
        pageTitle="Previdência Municipal (CAPREM)"
        subtitle={`Exercício ${currentYear} • Aposentadorias e Fundo Previdenciário`}
        badgeText="Regime Próprio (RPPS)"
        metrics={metrics}
        lastExtractionDate={portalConfig?.dataExtracao}
      />,
      { ...size },
    );
  } catch (_error) {
    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Previdência Municipal (CAPREM)"
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
