import {
  getEntidades,
  getExecucaoOrcamentariaMetrics,
  getPortalConfig,
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
    const execucao =
      empresaIds.length > 0
        ? await getExecucaoOrcamentariaMetrics(
            portalSlug,
            currentYear,
            empresaIds,
          )
        : [];

    const portalDisplayName =
      portalConfig?.displayName || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf || "RJ";

    const totalDotacao = execucao.reduce(
      (acc, i) => acc + i.totalDotacaoAtualizada,
      0,
    );
    const totalEmpenhado = execucao.reduce(
      (acc, i) => acc + i.totalEmpenhado,
      0,
    );
    const totalPago = execucao.reduce((acc, i) => acc + i.totalPago, 0);
    const saldoOrcamentario = totalDotacao - totalEmpenhado;
    const taxaExecucao =
      totalDotacao > 0 ? (totalEmpenhado / totalDotacao) * 100 : 0;

    const metrics: OGMetricItem[] = [
      {
        label: "Dotação Atualizada",
        value: fmtCompact(totalDotacao),
        detail: "Orçamento Aprovado",
        variant: "default",
      },
      {
        label: "Total Empenhado",
        value: fmtCompact(totalEmpenhado),
        detail: `${fmtPercent(taxaExecucao)} executado`,
        variant: "default",
      },
      {
        label: "Total Pago",
        value: fmtCompact(totalPago),
        detail: "Recursos Desembolsados",
        variant: "success",
      },
      {
        label: "Saldo Orçamentário",
        value: fmtCompact(saldoOrcamentario),
        detail: "Disponibilidade Fixada",
        variant: saldoOrcamentario >= 0 ? "success" : "danger",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Orçamento Municipal & Execução"
        subtitle={`Exercício ${currentYear} • Fixação e Execução do Orçamento`}
        badgeText="Execução Orçamentária"
        metrics={metrics}
        footerNote="Classificação Funcional-Programática"
      />,
      { ...size },
    );
  } catch (_error) {
    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Orçamento Municipal & Execução"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel do Orçamento",
            value: "Disponível",
            detail: "Acesse para consultar dotações e programas",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
