import { fmtCompact, KPICard, SectionHeader } from "@transparencia/ui";
import type { Metadata } from "next";
import { CarrosChefeArrecadacao } from "@/components/carros-chefe-arrecadacao";
import { EmendasCard } from "@/components/emendas-card";
import { KPIGrid } from "@/components/kpi-grid";
import { PrevistoVsArrecadadoOrigem } from "@/components/previsto-vs-arrecadado";
import { RadarAnomaliaCard } from "@/components/radar-anomalia-card";
import { ReceitasOrigemTabela } from "@/components/receitas-origem-tabela";
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="eyebrow text-brand-text!">
          ADMINISTRATIVO · ANO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Fontes de Receita</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          Compara o que a prefeitura{" "}
          <strong className="font-semibold text-ink">planejou arrecadar</strong>{" "}
          no ano (previsão da Lei Orçamentária Anual, a LOA) com o que{" "}
          <strong className="font-semibold text-ink">de fato entrou</strong> no
          caixa, por origem do dinheiro. Inclui também entradas que não fazem
          parte do orçamento, como retenções e caixas.
        </p>
      </div>

      <section className="space-y-2" data-testid="receitas-destaque">
        <p className="eyebrow">Total arrecadado</p>
        <p className="stat-value-lg text-brand-text">{fmtCompact(totalArr)}</p>
        <p className="caption">
          {isCurrentYear
            ? `arrecadado no período (${partialPeriod || "até agora"})`
            : `exercício ${selectedYear}`}
        </p>
      </section>

      <KPIGrid columns={2} variant="divisoria">
        <KPICard
          variant="divisoria"
          title="Previsto para o ano (LOA)"
          value={fmtCompact(totalPrev)}
          subtext={variationText}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between font-semibold text-ink text-sm">
            <span>Quanto da previsão já foi arrecadado</span>
            <span className="numeric">
              {pctArrecadadoAnual.toFixed(1).replace(".", ",")}%
            </span>
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
          title="Previsto e arrecadado, por origem do dinheiro"
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
          description="A barra inteira é o valor previsto. A parte colorida é o que já entrou. Todas usam a mesma escala, então dá para comparar."
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
        <ReceitasOrigemTabela data={tableData} />
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
