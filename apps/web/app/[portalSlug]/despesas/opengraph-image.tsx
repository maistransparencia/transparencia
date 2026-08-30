import {
  getAnaliseDespesasMetrics,
  getEntidades,
  getOpacidadeContabilMetrics,
  getPortalConfig,
  getRadarGastosSensiveisMetrics,
} from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
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
    const [portalConfig, entidades] = await Promise.all([
      getPortalConfig(portalSlug),
      getEntidades(portalSlug),
    ]);

    const empresaIds = entidades.map((e) => e.id).filter(Boolean);
    const [analiseDespesas, opacidade, radarSensiveis] = await Promise.all([
      empresaIds.length > 0
        ? getAnaliseDespesasMetrics(portalSlug, currentYear, empresaIds)
        : [],
      getOpacidadeContabilMetrics(portalSlug, currentYear),
      empresaIds.length > 0
        ? getRadarGastosSensiveisMetrics(portalSlug, currentYear, empresaIds)
        : null,
    ]);

    const portalDisplayName =
      portalConfig?.displayName || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf || "RJ";

    const totalPago = analiseDespesas.reduce(
      (acc, item) => acc + item.totalPago,
      0,
    );
    const totalEmpenhado = analiseDespesas.reduce(
      (acc, item) => acc + item.totalEmpenhado,
      0,
    );
    const taxaPagamento =
      totalEmpenhado > 0 ? (totalPago / totalEmpenhado) * 100 : 0;

    const percentualOpacidade =
      opacidade?.exercicioAtual.taxaValorOpacidadePct ?? 0;
    const valorOutrosServicos = opacidade?.exercicioAtual.pagoResidual99 ?? 0;

    const itemCombustivel = radarSensiveis?.itens.find(
      (item) => item.categoria === "combustivel_frota",
    );
    const valorCombustivel = itemCombustivel?.valorPagoAnoAtual ?? 0;

    const metrics: OGMetricItem[] = [
      {
        label: "Total Pago",
        value: fmtCompact(totalPago),
        detail: `${fmtPercent(taxaPagamento)} de execução`,
        variant: "default",
      },
      {
        label: "Opacidade .99",
        value: fmtPercent(percentualOpacidade),
        detail: `${fmtCompact(valorOutrosServicos)} em Outros Serviços`,
        variant:
          percentualOpacidade < 10
            ? "success"
            : percentualOpacidade < 20
              ? "warning"
              : "danger",
      },
      {
        label: "Combustíveis & Frotas",
        value: fmtCompact(valorCombustivel),
        detail: "Radar de Gastos Sensíveis",
        variant: "warning",
      },
      {
        label: "Total Empenhado",
        value: fmtCompact(totalEmpenhado),
        detail: "Compromissos do Exercício",
        variant: "default",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Despesas & Controle de Gastos"
        subtitle={`Exercício ${currentYear} • Auditoria de Despesas e Contas Sensíveis`}
        badgeText="Radar de Despesas"
        metrics={metrics}
        footerNote="Classificação Orçamentária STN"
      />,
      { ...size },
    );
  } catch (_error) {
    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Despesas & Controle de Gastos"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Auditoria de Despesas",
            value: "Disponível",
            detail: "Acesse para consultar despesas detalhadas",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
