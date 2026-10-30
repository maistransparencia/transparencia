import {
  fmtCompact,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { DespesasAreasSection } from "@/components/despesas-areas-section";
import { DespesasFornecedoresSection } from "@/components/despesas-fornecedores-section";
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
    areasPorEtapa,
    fornecedoresLinhas,
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
          Para onde foi o dinheiro da prefeitura em {selectedYear}, quanto já
          saiu de verdade do caixa e quem recebeu.
        </p>
      </div>

      {/* 1. Resumo: reservado, entregue, pago */}
      <section className="space-y-6" data-testid="despesas-resumo">
        <div className="space-y-2" data-testid="despesas-resumo-destaque">
          <p className="font-mono text-mute2 text-xs uppercase tracking-wider">
            Dinheiro que saiu (pago) em {selectedYear}
          </p>
          <p className="font-bold text-5xl text-brand tabular-nums leading-none sm:text-6xl">
            {fmtCompact(metricasGerais.pago)}
          </p>
          <p className="max-w-xl text-mute text-sm leading-relaxed">
            Valor que já saiu do caixa e foi pago a quem prestou o serviço ou
            vendeu o produto.
            {metricasGerais.empenhado > 0 && (
              <>
                {" "}
                Isso é{" "}
                <strong>{fmtPercent(metricasGerais.taxaPagamento)}</strong> do
                que estava reservado ({fmtCompact(metricasGerais.empenhado)}). O
                restante não é, necessariamente, dívida: pode ser serviço em
                andamento ou pagamento previsto para os próximos meses.
              </>
            )}
          </p>
        </div>

        <IndicatorPanel>
          <Indicator
            label="Reservado (empenhado)"
            value={fmtCompact(metricasGerais.empenhado)}
            note="Valor que a prefeitura separou no orçamento para pagar contratos e compras."
          />
          <Indicator
            label="Serviço entregue (liquidado)"
            value={fmtCompact(metricasGerais.liquidado)}
            note="Parte do reservado em que o serviço ou produto já foi recebido e conferido, mesmo que ainda não tenha sido pago."
          />
        </IndicatorPanel>

        <details className="group">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 font-semibold text-ink text-sm">
            <span>
              Como ler estes números: reservado, entregue e pago não se somam
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-2.5 text-ink text-sm leading-relaxed">
            <p>
              Uma compra pública tem três passos: a prefeitura{" "}
              <strong>reserva</strong> o valor (empenho),{" "}
              <strong>confere</strong> que recebeu o que pediu (liquidação) e
              então <strong>paga</strong>.
            </p>
            <p>
              Por isso, dentro do mesmo ano, o valor pago é igual ou menor que o
              entregue, que é igual ou menor que o reservado. A diferença
              costuma ser serviço ainda em andamento ou pagamento previsto para
              os próximos meses.
            </p>
          </div>
        </details>
      </section>

      {/* 2. Para quais áreas o dinheiro foi */}
      {areasPorEtapa.pago.length > 0 && (
        <section className="space-y-6">
          <SectionHeader
            title="Para quais áreas o dinheiro foi"
            description="Saúde, educação, obras e outras áreas, da maior para a menor. Toque numa área para ver os detalhes."
          />
          <DespesasAreasSection areasPorEtapa={areasPorEtapa} />
        </section>
      )}

      {/* 3. Quem mais recebeu */}
      {fornecedoresLinhas.length > 0 && (
        <section className="space-y-6">
          <SectionHeader
            title="Quem mais recebeu"
            description={`As empresas e pessoas que mais receberam em ${selectedYear}, com a parte de cada uma no total pago. A folha de pagamento dos servidores não entra nesta lista.`}
          />
          <DespesasFornecedoresSection
            fornecedores={fornecedoresLinhas}
            portalSlug={portalSlug}
            ano={selectedYear}
          />
        </section>
      )}

      {/* 4. Gastos que merecem acompanhamento */}
      <section className="space-y-6">
        <SectionHeader
          title="Gastos que merecem acompanhamento"
          description={`Contas que a população mais acompanha: quanto cada categoria pesa no total pago em ${selectedYear} e como o valor pago mudou em relação a ${radarGastosSensiveis?.anoAnterior ?? selectedYear - 1}.`}
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

      {/* 5. Dívidas de anos anteriores */}
      <section className="space-y-6">
        <SectionHeader
          title="Dívidas de anos anteriores"
          description={`Compras feitas em anos passados que ainda não foram pagas e foram levadas para ${selectedYear}.`}
        />

        <IndicatorPanel tone="warn">
          <Indicator
            label="Total pendente"
            value={fmtCompact(restosResumo.totalPendente)}
            tone="warn"
            note={
              restosResumo.totalLiquidadoPendente > 0
                ? `${fmtCompact(restosResumo.totalLiquidadoPendente)} liquidados`
                : `pendentes a ${restosResumo.fornecedoresAguardando} fornecedores`
            }
          />
          <Indicator
            label="Fornecedores aguardando"
            value={restosResumo.fornecedoresAguardando}
            note="Empresas e pessoas com valores em aberto."
          />
          <Indicator
            label="Pendência mais antiga desde"
            value={restosResumo.dividaMaisAntigaAno}
            note="Quanto mais antiga, mais atenção merece."
          />
        </IndicatorPanel>

        {/* Top 5 Credores com Maior Saldo Pendente */}
        {restosResumo.topFornecedores.length > 0 && (
          <RestosAPagarVendorsChart
            items={restosResumo.topFornecedores}
            portalSlug={portalSlug}
            ano={selectedYear}
          />
        )}

        <details className="group">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 font-semibold text-ink text-sm">
            <span>O que são restos a pagar?</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-2.5 text-ink text-sm leading-relaxed">
            <p>
              É a conta que sobra de um ano para o outro. Isso é comum:
              contratos assinados no fim do ano podem ser pagos no começo do
              seguinte.
            </p>
            <p>Há dois tipos:</p>
            <ul className="space-y-1.5">
              <li>
                • <strong>Já entregues e conferidos</strong> (restos
                processados): o serviço ou o bem já foi recebido e falta só
                pagar.
              </li>
              <li>
                • <strong>Ainda em andamento</strong> (restos não processados):
                dependem de conferência antes do pagamento.
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
