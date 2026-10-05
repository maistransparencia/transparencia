import {
  getContratosServicosVigentes,
  getDistribucaoModalidadesMetrics,
  getEntidades,
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

async function fetchOgLicitacoesData(portalSlug: string, currentYear: number) {
  const portalConfig = await getPortalConfig(portalSlug);
  const entidades = await getEntidades(portalSlug);
  const empresaIds = entidades.map((e) => e.id).filter(Boolean);
  const modalidades =
    empresaIds.length > 0
      ? await getDistribucaoModalidadesMetrics(
          portalSlug,
          currentYear,
          empresaIds,
        )
      : [];
  const contratosVigentes = await getContratosServicosVigentes(
    portalSlug,
    currentYear,
    empresaIds,
  );
  return { portalConfig, modalidades, contratosVigentes };
}

const loadOgLicitacoesData = createCachedDataLoader(
  fetchOgLicitacoesData,
  "og-licitacoes",
);

export default async function Image({
  params,
}: {
  params: Promise<{ portalSlug: string }>;
}) {
  const { portalSlug } = await params;
  const currentYear = new Date().getFullYear();

  try {
    const { portalConfig, modalidades, contratosVigentes } =
      await loadOgLicitacoesData(portalSlug, currentYear);

    const portalDisplayName =
      portalConfig?.displayName?.trim() || "Prefeitura Municipal";
    const portalUf = portalConfig?.uf;

    const totalHomologado = modalidades.reduce(
      (acc, m) => acc + m.valorTotal,
      0,
    );
    const totalProcessos = modalidades.reduce(
      (acc, m) => acc + m.quantidade,
      0,
    );
    const totalContratos = contratosVigentes.length;
    const valorContratosVigentes = contratosVigentes.reduce(
      (acc, c) => acc + c.totalPago,
      0,
    );

    const metrics: OGMetricItem[] = [
      {
        label: "Total Homologado",
        value: fmtCompact(totalHomologado),
        detail: "Compras e Contratações",
        variant: "default",
      },
      {
        label: "Processos Licitatórios",
        value: fmtNumber(totalProcessos),
        detail: "No Exercício",
        variant: "default",
      },
      {
        label: "Contratos Vigentes",
        value: fmtNumber(totalContratos),
        detail: `Pago: ${fmtCompact(valorContratosVigentes)}`,
        variant: "success",
      },
    ];

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName={portalDisplayName}
        portalUf={portalUf}
        pageTitle="Licitações & Contratos Públicos"
        subtitle={`Exercício ${currentYear} • Processos de Compras e Contratações`}
        badgeText="Painel de Compras"
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
        route: "og:licitacoes",
      });
    }

    return new ImageResponse(
      <OGCardTemplate
        portalDisplayName="Portal de Transparência"
        pageTitle="Licitações & Contratos Públicos"
        subtitle={`Exercício ${currentYear}`}
        metrics={[
          {
            label: "Painel de Licitações",
            value: "Disponível",
            detail: "Acesse para consultar contratos e editais",
            variant: "default",
          },
        ]}
      />,
      { ...size },
    );
  }
}
