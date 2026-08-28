import { fmtCompact, fmtPercent, KPICard } from "@transparencia/ui";
import type { Metadata } from "next";
import { KPIGrid } from "@/components/kpi-grid";
import { RadarGastosSensiveis } from "@/components/radar-gastos-sensiveis";
import { RestosAPagarVendorsChart } from "@/components/restos-a-pagar-vendors-chart";
import { SectionHeader } from "@/components/section-header";
import { TermometroOpacidadeFiscal } from "@/components/termometro-opacidade-fiscal";
import { createPortalMetadata } from "@/lib/metadata";
import { loadDespesasData } from "./loader";
import { buildDespesasViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface DespesasPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: DespesasPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Despesas", portalSlug, {
    description:
      "Auditoria cidadã das despesas municipais: contas sensíveis (combustível, locações, obras, diárias), áreas de investimento e restos a pagar.",
    path: "/despesas",
    keywords: [
      "despesas municipais",
      "radar de gastos",
      "combustível",
      "obras",
      "diárias",
      "restos a pagar",
      "gastos públicos",
    ],
  });
}

export default async function DespesasPage({
  params,
  searchParams,
}: DespesasPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadDespesasData(portalSlug, resolvedSearchParams);
  const viewModel = buildDespesasViewModel(rawData);

  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    metricasGerais,
    radarGastosSensiveis,
    restosResumo,
    opacidadeContabil,
  } = viewModel;

  return (
    <div className="space-y-10">
      {/* Header Principal */}
      <div>
        <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
          FISCALIZAÇÃO CIDADÃ · EXERCÍCIO {selectedYear}
          {isCurrentYear ? ` (PARCIAL, ${partialPeriod})` : ""}
        </span>
        <h1 className="font-bold font-serif text-3xl text-ink">
          Despesas & Controle de Gastos
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-subtleText leading-relaxed">
          Onde o dinheiro municipal foi aplicado: termômetro de desembolso real,
          radar de contas sensíveis com comparativo interanual e auditoria de
          passivos herdados.
        </p>
      </div>

      {/* Ato 1: Termômetro Macro do Exercício (4 KPIs) */}
      <KPIGrid columns={4}>
        <KPICard
          title="Total empenhado"
          value={fmtCompact(metricasGerais.empenhado)}
          subtext={`no exercício ${selectedYear}`}
        />
        <KPICard
          title="Total liquidado"
          value={fmtCompact(metricasGerais.liquidado)}
          subtext="serviços e bens atestados"
        />
        <KPICard
          title="Total pago"
          value={fmtCompact(metricasGerais.pago)}
          subtext="desembolso efetivo de caixa"
        />
        <KPICard
          title="Taxa de quitação"
          value={fmtPercent(metricasGerais.taxaPagamento)}
          subtext={`${fmtPercent(metricasGerais.taxaLiquidacao)} liquidado`}
        />
      </KPIGrid>

      {/* Ato 2: Radar de Gastos Sensíveis & Controle Fiscal */}
      <section className="space-y-6">
        <SectionHeader
          title="Radar de Gastos Sensíveis & Controle Fiscal"
          description={
            isCurrentYear
              ? `Acompanhamento das contas mais vigiadas pelo munícipe e peso relativo no orçamento pago de ${selectedYear}.`
              : `Acompanhamento das contas mais vigiadas pelo munícipe e variação do desembolso em relação a ${radarGastosSensiveis?.anoAnterior ?? selectedYear - 1}.`
          }
        />

        {/* Termômetro de Opacidade Contábil (.99) */}
        {opacidadeContabil && (
          <TermometroOpacidadeFiscal data={opacidadeContabil} />
        )}

        <RadarGastosSensiveis
          itens={radarGastosSensiveis?.itens ?? []}
          anoAtual={radarGastosSensiveis?.anoAtual ?? selectedYear}
          anoAnterior={radarGastosSensiveis?.anoAnterior ?? selectedYear - 1}
          isCurrentYear={isCurrentYear}
          totalDespesasPagas={metricasGerais.pago}
        />
      </section>

      {/* Ato 4: Restos a Pagar & Dívidas Herdadas */}
      <section className="space-y-6">
        <SectionHeader
          title="Restos a Pagar (Dívidas de Anos Anteriores)"
          description="Despesas contratadas em exercícios passados ainda não quitadas pela prefeitura."
        />

        {/* Banner Informativo Visível */}
        <div className="space-y-2.5 rounded-xl border-[#2B5278] border-l-4 bg-[#F0F6FD] p-4 text-[#1B3A5A] text-sm leading-relaxed">
          <p>
            São despesas empenhadas em anos anteriores ainda não pagas —
            compromissos legais que continuam válidos até serem quitados ou
            cancelados.
          </p>
          <div className="border-[#d0e2f7] border-t pt-2.5 text-[#20456c] text-xs">
            <strong className="mb-1 block font-semibold text-[#132c46]">
              Categorização Contábil (Norma STN/MCASP):
            </strong>
            <ul className="space-y-1">
              <li>
                • <strong>Restos Processados:</strong> Dívidas de serviços já
                prestados ou bens entregues e liquidados (com direito adquirido
                do credor).
              </li>
              <li>
                • <strong>Restos Não Processados:</strong> Obras ou contratos em
                andamento pendentes de medição e liquidação.
              </li>
            </ul>
          </div>
        </div>

        {/* 3 KPI Grid */}
        <KPIGrid columns={3}>
          <KPICard
            title="Total pendente"
            value={
              <span className="font-bold text-amber-900">
                {fmtCompact(restosResumo.totalPendente)}
              </span>
            }
            subtext={
              restosResumo.totalLiquidadoPendente > 0
                ? `${fmtCompact(restosResumo.totalLiquidadoPendente)} liquidados`
                : `pendentes a ${restosResumo.fornecedoresAguardando} fornecedores`
            }
          />
          <KPICard
            title="Fornecedores aguardando"
            value={restosResumo.fornecedoresAguardando}
          />
          <KPICard
            title="Pendência mais antiga desde"
            value={restosResumo.dividaMaisAntigaAno}
          />
        </KPIGrid>

        {/* Top 5 Credores com Maior Saldo Pendente */}
        {restosResumo.topFornecedores.length > 0 && (
          <RestosAPagarVendorsChart items={restosResumo.topFornecedores} />
        )}
      </section>
    </div>
  );
}
