import { SectionHeader } from "@transparencia/ui";

export interface SalaryBinItem {
  faixa: string;
  min: number;
  max: number;
  count: number;
}

interface ProventosDistributionChartProps {
  data: SalaryBinItem[];
}

export function ProventosDistributionChart({
  data,
}: ProventosDistributionChartProps) {
  const totalServidores = data.reduce((acc, item) => acc + item.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Distribuição dos Proventos Brutos"
        eyebrow="Consolidado Municipal"
        description="Dados consolidados de todos os servidores do município (a folha analítica individual não é segregada por entidade no portal de origem). O gráfico utiliza os proventos (remuneração bruta) como aproximação."
      />

      {totalServidores === 0 ? (
        <div className="border-line text-mute2 flex h-44 items-center justify-center border-y px-4 text-center text-xs sm:text-sm">
          Nenhum registro de proventos individuais disponível para os filtros
          selecionados.
        </div>
      ) : (
        <div className="relative overflow-x-auto overflow-y-hidden pt-2 pb-2">
          <div
            className="grid min-w-175 items-start gap-2.5 px-1 pt-2 pb-1 sm:min-w-0"
            style={{
              gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
            }}
          >
            {data.map((item) => {
              const heightPct = Math.max(
                0,
                Math.min(100, (item.count / maxCount) * 100),
              );
              return (
                <div
                  key={item.faixa}
                  className="group flex w-full min-w-0 flex-col items-center"
                >
                  <span className="text-ink mb-1 text-xs font-semibold">
                    {item.count}
                  </span>

                  <div className="bg-track relative flex h-44 w-full items-end">
                    <div
                      className="bg-brand-fill w-full transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.faixa}: ${item.count} servidores`}
                    />
                  </div>

                  <span
                    className="caption mt-2 w-full text-center leading-tight text-balance"
                    title={item.faixa}
                  >
                    {item.faixa}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
