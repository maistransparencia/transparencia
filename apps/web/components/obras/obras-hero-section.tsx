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
  // Participação de cada situação no investimento previsto (barra empilhada)
  const totalValor = kpis.valorTotalInvestimento;
  const percentualExecucao =
    totalValor > 0 ? (kpis.valorEmExecucao / totalValor) * 100 : 0;
  const percentualParalisadas =
    totalValor > 0 ? (kpis.valorParalisadas / totalValor) * 100 : 0;
  const percentualConcluidas =
    totalValor > 0 ? (kpis.valorConcluidas / totalValor) * 100 : 0;
  const percentualCadastradas =
    totalValor > 0 ? (kpis.valorCadastradas / totalValor) * 100 : 0;

  const situacoes = [
    {
      chave: "em_execucao",
      rotulo: "Em execução",
      quantidade: kpis.emExecucao,
      valorCompacto: kpis.valorEmExecucaoCompacto,
      percentual: percentualExecucao,
      classeCor: "bg-brand-fill",
    },
    {
      chave: "paralisada",
      rotulo: "Paralisadas",
      quantidade: kpis.paralisadas,
      valorCompacto: kpis.valorParalisadasCompacto,
      percentual: percentualParalisadas,
      classeCor: "bg-danger-fill",
    },
    {
      chave: "concluida",
      rotulo: "Concluídas",
      quantidade: kpis.concluidas,
      valorCompacto: kpis.valorConcluidasCompacto,
      percentual: percentualConcluidas,
      classeCor: "bg-ok-fill",
    },
    {
      chave: "cadastrada",
      rotulo: "Não iniciadas",
      quantidade: kpis.cadastradas,
      valorCompacto: kpis.valorCadastradasCompacto,
      percentual: percentualCadastradas,
      classeCor: "bg-mute3",
    },
  ] as const;
  const ordemBarra = ["cadastrada", "em_execucao", "concluida", "paralisada"];
  const segmentosBarra = ordemBarra.flatMap((chave) =>
    situacoes.filter((situacao) => situacao.chave === chave),
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <p className="eyebrow text-brand-text!">
            OBRAS PÚBLICAS · EXERCÍCIO {ano}
            {isCurrentYear && partialPeriod
              ? ` (PARCIAL, ${partialPeriod})`
              : ""}
          </p>

          <h1>
            As obras da cidade estão andando e quanto já foi pago por elas?
          </h1>

          <p className="lead">
            {(() => {
              if (kpis.totalObras === 0) {
                return `Nenhuma obra pública com movimentação registrada em ${ano}. Veja os outros anos ou consulte a base do ObrasGov.br.`;
              }
              const obrasTexto =
                kpis.totalObras === 1
                  ? "1 obra mapeada"
                  : `${kpis.totalObras} obras mapeadas`;
              const getExecucaoTexto = (count: number) => {
                if (count === 0) return "nenhuma em andamento no momento";
                if (count === 1) return "1 em andamento";
                return `${count} em andamento`;
              };
              const execucaoTexto = getExecucaoTexto(kpis.emExecucao);
              const paralisadasTexto =
                kpis.paralisadas > 0
                  ? `, com ${kpis.paralisadas} parada${kpis.paralisadas === 1 ? "" : "s"}`
                  : "";
              return `São ${obrasTexto}, somando ${kpis.valorTotalInvestimentoCompacto} previstos em investimento (${execucaoTexto}${paralisadasTexto}). Obra parada é motivo para perguntar, não prova de erro.`;
            })()}
          </p>
        </div>

        {kpis.totalObras > 0 && (
          <div className="panel panel-brand lg:col-span-5">
            <p className="eyebrow">Investimento previsto</p>
            <p className="stat-value-lg">
              {kpis.valorTotalInvestimentoCompacto}
            </p>

            <div
              className="my-4 flex h-3 w-full overflow-hidden bg-track"
              role="progressbar"
              aria-label="Distribuição do investimento previsto por situação da obra"
              aria-valuenow={Math.round(percentualExecucao)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {segmentosBarra
                .filter((segmento) => segmento.percentual > 0)
                .map((segmento) => (
                  <div
                    key={segmento.chave}
                    style={{ width: `${segmento.percentual}%` }}
                    className={`h-full ${segmento.classeCor}`}
                    title={`${segmento.rotulo}: ${segmento.percentual.toFixed(1)}%`}
                  />
                ))}
            </div>

            <ul className="space-y-2 text-xs">
              {situacoes.map((situacao) => (
                <li
                  key={situacao.chave}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-mute">
                    <span
                      className={`h-2.5 w-2.5 ${situacao.classeCor}`}
                      aria-hidden="true"
                    />
                    {situacao.rotulo}
                  </span>
                  <span className="font-medium text-ink tabular-nums">
                    {situacao.quantidade}{" "}
                    {situacao.quantidade === 1 ? "obra" : "obras"} ·{" "}
                    {situacao.valorCompacto}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <KPIGrid columns={4} variant="divisoria">
        <KPICard
          title="Em execução"
          value={kpis.emExecucao}
          subtext="Obras em andamento"
        />
        <KPICard
          title="Paralisadas"
          value={kpis.paralisadas}
          subtext="Merecem atenção"
          alert={kpis.paralisadas > 0}
        />
        <KPICard
          title="Concluídas"
          value={kpis.concluidas}
          subtext="Entregues à população"
        />
        <KPICard
          title="Avanço físico médio"
          value={kpis.percentualMedioExecucaoFormatado}
          subtext="Nas obras em andamento, conforme informado ao ObrasGov.br"
        />
      </KPIGrid>
    </div>
  );
}
