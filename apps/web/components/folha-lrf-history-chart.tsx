export interface FolhaHistoryItem {
  ano: number;
  percentualFolha: number;
  isCurrentYear?: boolean;
}

export interface FolhaLrfHistoryChartProps {
  data: FolhaHistoryItem[];
}

export function FolhaLrfHistoryChart({ data }: FolhaLrfHistoryChartProps) {
  const maxPercent = 60; // Max scale for chart height

  return (
    <div className="border-line bg-page rounded-lg border p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3>Folha como % da receita, ano a ano</h3>
        </div>
        <span className="text-mute2 text-xs font-medium">
          com os limites da LRF
        </span>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Horizontal Threshold Lines */}
        <div className="pointer-events-none absolute inset-x-0 top-8 bottom-12 flex flex-col justify-between">
          {/* Legal 54% */}
          <div className="border-danger-fill relative w-full border-t border-solid">
            <span className="bg-page text-danger-text absolute -top-2.5 right-0 px-1 text-[11px] font-semibold">
              legal 54%
            </span>
          </div>

          {/* Prudencial 51.3% */}
          <div className="border-warn-fill relative w-full border-t border-dashed">
            <span className="bg-page text-warn-text absolute -top-2.5 right-0 px-1 text-[11px] font-semibold">
              prudencial 51,3%
            </span>
          </div>

          {/* Alerta 48.6% */}
          <div className="border-warn-fill relative w-full border-t border-dotted">
            <span className="bg-page text-warn-text absolute -top-2.5 right-0 px-1 text-[11px] font-semibold">
              alerta 48,6%
            </span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="relative z-10 flex h-56 items-end justify-around pt-6">
          {data.map((item) => {
            const heightPct = Math.min(
              100,
              (item.percentualFolha / maxPercent) * 100,
            );
            return (
              <div
                key={item.ano}
                className="group flex w-16 flex-col items-center"
              >
                {/* Bar Label */}
                <span className="text-ink mb-2 text-xs font-bold">
                  {item.percentualFolha.toFixed(1).replace(".", ",")}%
                </span>

                {/* Bar */}
                <div className="bg-line2 relative flex h-44 w-12 items-end rounded-t-md">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      item.percentualFolha > 54
                        ? "bg-danger-fill"
                        : item.percentualFolha > 51.3
                          ? "bg-warn-fill"
                          : "bg-brand-fill"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* Year Label */}
                <span className="text-mute2 mt-3 text-xs font-medium">
                  {item.ano}
                  {item.isCurrentYear ? "*" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
