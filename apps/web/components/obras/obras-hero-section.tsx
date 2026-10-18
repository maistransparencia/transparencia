import { KPICard } from "@transparencia/ui";
import type { ObrasKpisViewModel } from "@/app/[portalSlug]/obras/view-model";
import { KPIGrid } from "@/components/kpi-grid";

export interface ObrasHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  kpis: ObrasKpisViewModel;
}

export function ObrasHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  kpis,
}: ObrasHeroSectionProps) {
  // Proporções para a barra empilhada de investimento
  const totalValor = kpis.valorTotalInvestimento;
  const pctExecucao =
    totalValor > 0 ? (kpis.valorEmExecucao / totalValor) * 100 : 0;
  const pctParalisadas =
    totalValor > 0 ? (kpis.valorParalisadas / totalValor) * 100 : 0;
  const pctConcluidas =
    totalValor > 0 ? (kpis.valorConcluidas / totalValor) * 100 : 0;
  const pctCadastradas =
    totalValor > 0 ? (kpis.valorCadastradas / totalValor) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Grid Hero: Narrativa à esquerda + Card de Investimento à direita */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda: Narrativa Editorial no Padrão de Temas */}
        <div className="space-y-4 lg:col-span-7">
          <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
            TEMAS · OBRAS PÚBLICAS · {ano}
            {isCurrentYear && partialPeriod
              ? ` (PARCIAL, ${partialPeriod})`
              : ""}
          </span>

          <h1 className="font-bold font-serif text-3xl text-slate-900 leading-tight tracking-tight sm:text-4xl">
            Do planejamento ao canteiro:{" "}
            <span className="text-accent">
              fiscalize onde os recursos públicos ganham forma
            </span>{" "}
            no município.
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed sm:text-base">
            {(() => {
              if (kpis.totalObras === 0) {
                return `Nenhuma intervenção pública registrada com movimentação para o exercício de ${ano}. Acompanhe o histórico completo nos demais anos ou acesse a base do ObrasGov.br.`;
              }
              const obrasTexto =
                kpis.totalObras === 1
                  ? "1 obra mapeada"
                  : `${kpis.totalObras} obras mapeadas`;
              const getExecucaoTexto = (count: number) => {
                if (count === 0) return "nenhuma em execução ativa no momento";
                if (count === 1) return "1 em execução ativa";
                return `${count} em execução ativa`;
              };
              const execucaoTexto = getExecucaoTexto(kpis.emExecucao);
              const paralisadasTexto =
                kpis.paralisadas > 0
                  ? `, com ${kpis.paralisadas} sob alerta de paralisação`
                  : "";
              return `São ${obrasTexto} somando ${kpis.valorTotalInvestimentoCompacto} em investimentos previstos (${execucaoTexto}${paralisadasTexto}). Acompanhe a evolução física, os valores contratados e a localização territorial de cada intervenção.`;
            })()}
          </p>
        </div>

        {/* Coluna Direita: Card de Investimento Previsto com Barra Empilhada */}
        <div className="rounded-[14px] border border-[#e7e9ee] bg-white p-6 shadow-xs lg:col-span-5">
          <div className="mb-2">
            <span className="font-medium text-slate-500 text-xs">
              Investimento previsto
            </span>
            <div className="font-bold font-serif text-3xl text-slate-900 tracking-tight sm:text-4xl">
              {kpis.valorTotalInvestimentoCompacto}
            </div>
          </div>

          {/* Barra Empilhada Segmentada */}
          <div
            className="my-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Distribuição do investimento previsto por situação da obra"
            aria-valuenow={Math.round(pctExecucao)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {pctCadastradas > 0 && (
              <div
                style={{ width: `${pctCadastradas}%` }}
                className="h-full bg-slate-400 transition-all duration-300"
                title={`Não iniciadas: ${pctCadastradas.toFixed(1)}%`}
              />
            )}
            {pctExecucao > 0 && (
              <div
                style={{ width: `${pctExecucao}%` }}
                className="h-full bg-blue-600 transition-all duration-300"
                title={`Em execução: ${pctExecucao.toFixed(1)}%`}
              />
            )}
            {pctConcluidas > 0 && (
              <div
                style={{ width: `${pctConcluidas}%` }}
                className="h-full bg-emerald-600 transition-all duration-300"
                title={`Concluídas: ${pctConcluidas.toFixed(1)}%`}
              />
            )}
            {pctParalisadas > 0 && (
              <div
                style={{ width: `${pctParalisadas}%` }}
                className="h-full bg-rose-500 transition-all duration-300"
                title={`Paralisadas: ${pctParalisadas.toFixed(1)}%`}
              />
            )}
          </div>

          {/* Lista de Legendas e Valores */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Em execução
              </span>
              <span className="font-medium text-slate-900 tabular-nums">
                {kpis.emExecucao} {kpis.emExecucao === 1 ? "obra" : "obras"} ·{" "}
                {kpis.valorEmExecucaoCompacto}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Paralisadas
              </span>
              <span className="font-medium text-slate-900 tabular-nums">
                {kpis.paralisadas} {kpis.paralisadas === 1 ? "obra" : "obras"} ·{" "}
                {kpis.valorParalisadasCompacto}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Concluídas
              </span>
              <span className="font-medium text-slate-900 tabular-nums">
                {kpis.concluidas} {kpis.concluidas === 1 ? "obra" : "obras"} ·{" "}
                {kpis.valorConcluidasCompacto}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Não iniciadas
              </span>
              <span className="font-medium text-slate-900 tabular-nums">
                {kpis.cadastradas} {kpis.cadastradas === 1 ? "obra" : "obras"} ·{" "}
                {kpis.valorCadastradasCompacto}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid com 4 KPIs alinhados ao visual do tema */}
      <KPIGrid columns={4}>
        <KPICard
          title="Em execução"
          value={kpis.emExecucao}
          subtext="Obras ativas"
          accent={kpis.emExecucao > 0}
        />
        <KPICard
          title="Paralisadas"
          value={
            <span
              className={
                kpis.paralisadas > 0 ? "text-rose-600" : "text-slate-900"
              }
            >
              {kpis.paralisadas}
            </span>
          }
          subtext="Atenção prioritária"
          accent={kpis.paralisadas > 0}
        />
        <KPICard
          title="Concluídas"
          value={kpis.concluidas}
          subtext="Entregues à população"
        />
        <KPICard
          title="Avanço físico médio"
          value={kpis.percentualMedioExecucaoFormatado}
          subtext="Nas obras em andamento"
        />
      </KPIGrid>
    </div>
  );
}
