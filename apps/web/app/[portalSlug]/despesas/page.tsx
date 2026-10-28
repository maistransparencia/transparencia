import {
  fmtCompact,
  fmtPercent,
  KPICard,
  SectionHeader,
} from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { KPIGrid } from "@/components/kpi-grid";
import { RadarGastosSensiveis } from "@/components/radar-gastos-sensiveis";
import { RestosAPagarVendorsChart } from "@/components/restos-a-pagar-vendors-chart";
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
        <span className="inline-block font-semibold text-brand text-xs uppercase tracking-wider">
          ADMINISTRATIVO · EXERCÍCIO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </span>
        <h1 className="font-bold font-serif text-3xl text-ink">
          Despesas & Controle de Gastos
        </h1>
        <p className="mt-1 max-w-3xl text-mute2 text-sm leading-relaxed">
          Onde o dinheiro municipal foi aplicado: termômetro de desembolso real,
          radar de contas sensíveis com comparativo interanual e auditoria de
          passivos herdados.
        </p>
      </div>

      {/* Ato 1: Termômetro Macro do Exercício (4 KPIs) */}
      <KPIGrid columns={4} variant="divisoria">
        <KPICard
          variant="divisoria"
          title="Total empenhado"
          value={fmtCompact(metricasGerais.empenhado)}
          subtext={`no exercício ${selectedYear}`}
        />
        <KPICard
          variant="divisoria"
          title="Total liquidado"
          value={fmtCompact(metricasGerais.liquidado)}
          subtext="serviços e bens atestados"
        />
        <KPICard
          variant="divisoria"
          title="Total pago"
          value={fmtCompact(metricasGerais.pago)}
          subtext="desembolso efetivo de caixa"
        />
        <KPICard
          variant="divisoria"
          title="Taxa de quitação"
          value={fmtPercent(metricasGerais.taxaPagamento)}
          subtext={`${fmtPercent(metricasGerais.taxaLiquidacao)} liquidado`}
        />
      </KPIGrid>

      {/* Ato 2: Radar de Gastos Sensíveis & Controle Fiscal */}
      <section className="space-y-6">
        <SectionHeader
          title="Radar de Gastos Sensíveis & Controle Fiscal"
          description={`Acompanhamento das contas mais vigiadas pelo munícipe, peso de cada categoria no orçamento pago de ${selectedYear} e variação do desembolso em relação a ${radarGastosSensiveis?.anoAnterior ?? selectedYear - 1}.`}
        />

        <RadarGastosSensiveis
          itens={radarGastosSensiveis?.itens ?? []}
          anoAtual={radarGastosSensiveis?.anoAtual ?? selectedYear}
          anoAnterior={radarGastosSensiveis?.anoAnterior ?? selectedYear - 1}
          portalSlug={portalSlug}
          entidades={resolvedSearchParams.entidades}
          totalDespesasPagas={metricasGerais.pago}
        />

        {/* Termômetro de Subitens Genéricos (.99) */}
        {opacidadeContabil && (
          <TermometroOpacidadeFiscal
            data={opacidadeContabil}
            portalSlug={portalSlug}
            entidades={resolvedSearchParams.entidades}
          />
        )}
      </section>

      {/* Ato 4: Restos a Pagar & Dívidas Herdadas */}
      <section className="space-y-6">
        <SectionHeader
          title="Restos a Pagar (Dívidas de Anos Anteriores)"
          description="Despesas contratadas em exercícios passados ainda não quitadas pela prefeitura."
        />

        {/* 3 KPI Grid */}
        <KPIGrid columns={3} variant="divisoria">
          <KPICard
            variant="divisoria"
            title="Total pendente"
            value={
              <span className="font-bold text-warn">
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
            variant="divisoria"
            title="Fornecedores aguardando"
            value={restosResumo.fornecedoresAguardando}
          />
          <KPICard
            variant="divisoria"
            title="Pendência mais antiga desde"
            value={restosResumo.dividaMaisAntigaAno}
          />
        </KPIGrid>

        {/* Top 5 Credores com Maior Saldo Pendente */}
        {restosResumo.topFornecedores.length > 0 && (
          <RestosAPagarVendorsChart items={restosResumo.topFornecedores} />
        )}

        <details className="group border-line border-t pt-4">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 font-semibold text-ink text-sm">
            <span>O que são restos a pagar?</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 max-w-[70ch] space-y-2.5 text-ink text-sm leading-relaxed">
            <p>
              Restos a pagar são despesas assumidas em anos anteriores que ainda
              não foram pagas. Elas continuam valendo até serem pagas ou
              canceladas.
            </p>
            <p>Há dois tipos:</p>
            <ul className="space-y-1.5">
              <li>
                • <strong>Já entregues e conferidos</strong> (restos
                processados): o fornecedor já fez o serviço ou entregou o bem, e
                a prefeitura ainda não pagou.
              </li>
              <li>
                • <strong>Ainda em andamento</strong> (restos não processados):
                obra ou contrato em andamento, que ainda precisa de conferência
                antes do pagamento.
              </li>
            </ul>
            <p className="text-mute2">
              Ter resto a pagar não indica erro. Boa parte é prazo normal de
              execução. Para entender cada caso, vale consultar o processo.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
