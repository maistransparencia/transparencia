import { Badge, SectionHeader } from "@transparencia/ui";

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
        action={<Badge>Consolidado Municipal</Badge>}
        description="Dados consolidados de todos os servidores do município (a folha analítica individual não é segregada por entidade no portal de origem). O gráfico utiliza os proventos (remuneração bruta) como aproximação."
      />

      {totalServidores === 0 ? (
        <div className="flex h-44 items-center justify-center border-line border-y px-4 text-center text-mute2 text-xs sm:text-sm">
          Nenhum registro de proventos individuais disponível para os filtros
          selecionados.
        </div>
      ) : (
        <div className="relative overflow-x-auto overflow-y-hidden pt-2 pb-2">
          <div
            className="grid min-w-175 items-end gap-2.5 px-1 pt-2 pb-1 sm:min-w-0"
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
                  <span className="mb-1 font-semibold text-ink text-xs">
                    {item.count}
                  </span>

                  <div className="relative flex h-44 w-full items-end bg-track">
                    <div
                      className="w-full bg-brand-fill transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.faixa}: ${item.count} servidores`}
                    />
                  </div>

                  <span
                    className="caption mt-2 w-full truncate text-center"
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
