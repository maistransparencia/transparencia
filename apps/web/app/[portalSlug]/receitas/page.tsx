import {
  DenseTable,
  fmtCompact,
  fmtPercent,
  KPICard,
  SectionHeader,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { CarrosChefeArrecadacao } from "@/components/carros-chefe-arrecadacao";
import { EmendasCard } from "@/components/emendas-card";
import { KPIGrid } from "@/components/kpi-grid";
import { PrevistoVsArrecadadoOrigem } from "@/components/previsto-vs-arrecadado";
import { RadarAnomaliaCard } from "@/components/radar-anomalia-card";
import { createPortalMetadata } from "@/lib/metadata";
import { loadReceitasData } from "./loader";
import { buildReceitasViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface ReceitasPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: ReceitasPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Receitas", portalSlug, {
    description:
      "Consulta detalhada das fontes de receita municipal, arrecadação prevista vs. realizada, receitas extra-orçamentárias e repasses de emendas.",
    path: "/receitas",
    keywords: [
      "receitas municipais",
      "arrecadação",
      "fontes de receita",
      "receitas extra-orçamentárias",
      "emendas parlamentares",
      "impostos municipais",
    ],
  });
}

export default async function ReceitasPage({
  params,
  searchParams,
}: ReceitasPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadReceitasData(portalSlug, resolvedSearchParams);
  const viewModel = buildReceitasViewModel(rawData);

  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    rec,
    totalArr,
    totalPrev,
    pctArrecadadoAnual,
    origensData,
    tableData,
    variationText,
    cardDependencia,
  } = viewModel;

  const tableCols = [
    { header: "Origem da Receita", accessorKey: "fonte" as const },
    {
      header: "Previsto",
      accessorKey: "previsto" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Arrecadado",
      accessorKey: "arrecadado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Execução (%)",
      accessorKey: "pct" as const,
      align: "right" as const,
      format: "percent" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="eyebrow text-brand-text!">
          ADMINISTRATIVO · EXERCÍCIO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Fontes de Receita</h1>
        <p className="lead">
          Compara o que a prefeitura{" "}
          <strong className="font-semibold text-ink">planejou arrecadar</strong>{" "}
          (previsão da LOA) com o que{" "}
          <strong className="font-semibold text-ink">
            efetivamente entrou
          </strong>{" "}
          no caixa, por origem do recurso e movimentações extra-orçamentárias.
        </p>
      </div>

      <section className="space-y-2" data-testid="receitas-destaque">
        <p className="eyebrow">Total Arrecadado Real</p>
        <p className="stat-value-lg text-brand-text">{fmtCompact(totalArr)}</p>
        <p className="caption">
          {isCurrentYear
            ? "arrecadado acumulado até a data"
            : `exercício ${selectedYear}`}
        </p>
      </section>

      <KPIGrid columns={2} variant="divisoria">
        <KPICard
          variant="divisoria"
          title="Previsão Orçamentária (LOA)"
          value={fmtCompact(totalPrev)}
          subtext={variationText}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between font-semibold text-ink text-sm">
            <span>Progresso de arrecadação anual</span>
            <span className="numeric">{fmtPercent(pctArrecadadoAnual)}</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden bg-track">
            <div
              className="h-full bg-brand-fill transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, pctArrecadadoAnual))}%`,
              }}
            />
          </div>
        </div>
      </KPIGrid>

      <EmendasCard
        totalEmendas={rec.emendasTotalArrecadado || 0}
        pctDoArrecadado={
          totalArr > 0 ? (rec.emendasTotalArrecadado / totalArr) * 100 : 0
        }
        emendasPix={rec.emendasPixArrecadado || 0}
        emendasIndividuais={rec.emendasIndividuaisArrecadado || 0}
        emendasTotalEmpenhado={rec.emendasTotalEmpenhado || 0}
      />

      <section className="space-y-3">
        <SectionHeader
          title="Previsto vs. arrecadado por origem"
          action={
            <div className="caption flex items-center gap-4 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 bg-brand-fill" /> Arrecadado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 border border-line bg-track" />{" "}
                Previsto (meta LOA)
              </span>
            </div>
          }
          description="O comprimento da barra é o valor previsto — mesma régua de R$ para todas as origens, então os tamanhos são comparáveis. A parte cheia é o que já entrou no caixa."
        />

        <PrevistoVsArrecadadoOrigem items={origensData} />
      </section>

      <CarrosChefeArrecadacao
        fpm={rec.fpmArrecadado || 0}
        icms={rec.icmsArrecadado || 0}
        issIptu={rec.issIptuArrecadado || 0}
        totalArrecadado={totalArr}
      />

      <div className="pt-4">
        <DenseTable
          data={tableData}
          columns={tableCols}
          enableExportCsv={false}
        />
      </div>

      {cardDependencia && (
        <RadarAnomaliaCard
          card={cardDependencia}
          funnelSource="receitas_anomalia"
        />
      )}
    </div>
  );
}
