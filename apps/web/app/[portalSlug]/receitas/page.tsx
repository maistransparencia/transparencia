import {
  fmtCompact,
  fmtPercent,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import { CarrosChefeArrecadacao } from "@/components/carros-chefe-arrecadacao";
import { EmendasCard } from "@/components/emendas-card";
import { PageEyebrow } from "@/components/page-eyebrow";
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
    comparacaoArrecadacao,
    cardDependencia,
  } = viewModel;

  const percentualArrecadadoLimitado = Math.min(
    100,
    Math.max(0, pctArrecadadoAnual),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <PageEyebrow>
          Administrativo · Exercício {selectedYear}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </PageEyebrow>
        <h1>Fontes de Receita</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          Compara o que a prefeitura{" "}
          <strong className="font-semibold text-ink">planejou arrecadar</strong>{" "}
          no ano (previsão da Lei Orçamentária Anual, a LOA) com o que{" "}
          <strong className="font-semibold text-ink">de fato entrou</strong> no
          caixa, por origem do dinheiro. Valores que a prefeitura apenas retém e
          repassa a terceiros, como descontos em folha, aparecem à parte e não
          entram no total.
        </p>
      </div>

      <section className="space-y-4" data-testid="receitas-destaque">
        <div className="space-y-2">
          <p className="eyebrow">Total arrecadado</p>
          <p className="stat-value-lg text-brand-text">
            {fmtCompact(totalArr)}
          </p>
          <p className="caption space-y-0.5">
            <span className="block">
              {isCurrentYear
                ? `arrecadado no período (${partialPeriod || "até agora"})`
                : `exercício ${selectedYear}`}
            </span>
            {comparacaoArrecadacao && (
              <span className="flex items-center gap-1">
                {comparacaoArrecadacao.direcao === "alta" && (
                  <ArrowUp
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {comparacaoArrecadacao.direcao === "queda" && (
                  <ArrowDown
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {comparacaoArrecadacao.texto}
              </span>
            )}
          </p>
        </div>

        {totalPrev > 0 && (
          <div className="space-y-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 font-semibold text-sm tabular-nums">
              <span>
                Já arrecadado: {fmtPercent(pctArrecadadoAnual)} do previsto
              </span>
              <span>Previsto para o ano: {fmtCompact(totalPrev)}</span>
            </p>
            <ThresholdMeter
              value={percentualArrecadadoLimitado}
              label="Quanto da previsão já foi arrecadado"
              valueText={`${fmtPercent(pctArrecadadoAnual)} da previsão arrecadados`}
            />
            <p className="caption">
              {fmtCompact(totalArr)}{" "}
              {totalArr > totalPrev ? "arrecadados, acima dos" : "dos"}{" "}
              {fmtCompact(totalPrev)} previstos na Lei Orçamentária Anual (LOA)
              de {selectedYear}.
            </p>
          </div>
        )}
      </section>

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

      {cardDependencia && (
        <RadarAnomaliaCard
          card={cardDependencia}
          funnelSource="receitas_anomalia"
        />
      )}
    </div>
  );
}
