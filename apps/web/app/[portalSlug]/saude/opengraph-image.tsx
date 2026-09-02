import {
  getEntidades,
  getHistoriaSaudeMetrics,
  getPortalConfig,
  getSaudeEmendasMetrics,
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

    const healthEntities = entidades.filter(({ nome }) =>
      /sa[uú]de|fms|hospital|policl/i.test(nome),
    );
    const empresaIds =
      healthEntities.length > 0
        ? healthEntities.map((e) => e.id)
        : entidades.map((e) => e.id);

    const [saude, emendasStats] = await Promise.all([
      getHistoriaSaudeMetrics(portalSlug, currentYear),
      getSaudeEmendasMetrics(portalSlug, currentYear, empresaIds),
    ]);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const orcamentoFixado = saude?.dotacaoTotal ?? 0;
    const totalPago = saude?.totalPago ?? 0;
    const repassesSus = saude?.medicamentosInsumosPago ?? 0;
    const totalEmendasAutorizado =
      emendasStats.totalAutorizado || (saude?.emendasSaudeArrecadado ?? 0);
    const totalEmendasEmpenhado = emendasStats.totalEmpenhado;

    const metrics: OGMetricItem[] = [
      {
        label: "Orçamento da Saúde",
        value: fmtCompact(orcamentoFixado),
        detail: "Dotação Atualizada",
        variant: "default",
      },
      {
        label: "Total Pago em Saúde",
        value: fmtCompact(totalPago),
        detail: "Recursos Aplicados",
        variant: "success",
      },
      {
        label: "Medicamentos & Insumos",
        value: fmtCompact(repassesSus),
        detail: "Recursos Pagos",
        variant: "default",
      },
      {
        label: "Emendas da Saúde",
        value: fmtCompact(totalEmendasAutorizado),
        detail: `${fmtCompact(totalEmendasEmpenhado)} empenhados`,
        variant: "warning",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Saúde Pública & SUS Municipal"
        subtitle={`Exercício ${currentYear} • Recursos e Aplicação na Saúde Pública`}
        badgeText="Painel da Saúde"
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
        route: "og:saude",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Saúde Pública & SUS Municipal"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel da Saúde",
            value: "Disponível",
            detail: "Acesse para consultar repasses e despesas da saúde",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
