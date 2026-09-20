import { getPortalConfig, getRadarCivicoAlertas } from "@transparencia/db";
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

  try {
    const [portalConfig, alertas] = await Promise.all([
      getPortalConfig(portalSlug),
      getRadarCivicoAlertas(portalSlug),
    ]);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalAlertas = alertas.length;
    const criticosCount = alertas.filter(
      (a) => a.grauSeveridade === "critico",
    ).length;
    const altosCount = alertas.filter(
      (a) => a.grauSeveridade === "alto",
    ).length;
    const anosCount = new Set(alertas.map((a) => a.ano)).size;

    const metrics: OGMetricItem[] = [
      {
        label: "Total de Alertas",
        value: String(totalAlertas),
        detail: "Histórico consolidado",
        variant: totalAlertas > 0 ? "warning" : "success",
      },
      {
        label: "Alertas Críticos",
        value: String(criticosCount),
        detail: "Prioridade máxima",
        variant: criticosCount > 0 ? "danger" : "default",
      },
      {
        label: "Alertas de Atenção",
        value: String(altosCount),
        detail: "Desvios relevantes",
        variant: "default",
      },
      {
        label: "Exercícios com Alertas",
        value: String(anosCount),
        detail: "Anos com ocorrências",
        variant: "default",
      },
    ];

    const badgeText = criticosCount > 0 ? "🚨 Alerta Crítico" : "Radar Cívico";
    const subtitle = (() => {
      if (criticosCount > 0) {
        return `${criticosCount} anomalia(s) de severidade crítica identificada(s) nas contas municipais`;
      }
      return "Histórico Consolidado de Controle Social e Alertas Fiscais";
    })();

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Radar Cívico Municipal"
        subtitle={subtitle}
        badgeText={badgeText}
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
        page: "radar-og-image",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal da Transparência"
        pageTitle="Radar Cívico Municipal"
        subtitle="Histórico de Alertas e Controle Social"
        badgeText="Radar Cívico"
        metrics={[
          {
            label: "Radar Cívico",
            value: "Ativo",
            detail: "Histórico consolidado",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
