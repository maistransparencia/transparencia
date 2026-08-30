import {
  getEntidades,
  getFontesReceitaMetrics,
  getPortalConfig,
} from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
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
    const fontes =
      empresaIds.length > 0
        ? await getFontesReceitaMetrics(portalSlug, currentYear, empresaIds)
        : null;

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalArrecadado = fontes?.totalArrecadado ?? 0;
    const receitaPropria = fontes?.receitaPropriaArrecadado ?? 0;
    const transferenciasUniao = fontes?.transferenciasUniaoArrecadado ?? 0;
    const transferenciasEstado = fontes?.transferenciasEstadoArrecadado ?? 0;

    const metrics: OGMetricItem[] = [
      {
        label: "Total Arrecadado",
        value: fmtCompact(totalArrecadado),
        detail: "Arrecadação do Exercício",
        variant: "success",
      },
      {
        label: "Receitas Próprias",
        value: fmtCompact(receitaPropria),
        detail: "IPTU, ISS, Taxas Municipais",
        variant: "default",
      },
      {
        label: "Repasses da União",
        value: fmtCompact(transferenciasUniao),
        detail: "FPM, SUS, FUNDEB",
        variant: "default",
      },
      {
        label: "Repasses do Estado",
        value: fmtCompact(transferenciasEstado),
        detail: "ICMS, IPVA, Royalties",
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Receitas & Arrecadação Municipal"
        subtitle={`Exercício ${currentYear} • Origem e Fontes de Recursos`}
        badgeText="Painel de Receitas"
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
        route: "og:receitas",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Receitas & Arrecadação Municipal"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel de Receitas",
            value: "Disponível",
            detail: "Acesse para consultar arrecadação municipal",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
