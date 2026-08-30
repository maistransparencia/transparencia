import { getHistoriaSaudeMetrics, getPortalConfig } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
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
    const [portalConfig, saude] = await Promise.all([
      getPortalConfig(portalSlug),
      getHistoriaSaudeMetrics(portalSlug, currentYear),
    ]);

    const portalDisplayName =
      portalConfig?.displayName || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf || "RJ";

    const orcamentoFixado = saude?.dotacaoTotal ?? 0;
    const totalPago = saude?.totalPago ?? 0;
    const repassesSus = saude?.medicamentosInsumosPago ?? 0;
    const emendasSaude = saude?.emendasSaudeArrecadado ?? 0;

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
        value: fmtCompact(emendasSaude),
        detail: "Emendas Parlamentares",
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
        footerNote="Controle Social & SUS"
      />,
      { ...size },
    );
  } catch (_error) {
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
