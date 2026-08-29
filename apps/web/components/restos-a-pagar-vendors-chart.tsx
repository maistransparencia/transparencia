import { fmtCompact, toTitleCase } from "@transparencia/ui";

export interface RestosAPagarVendorItem {
  fornecedor: string;
  valorTotal?: number;
  liquidado?: number;
  empenhadoALiquidar?: number;
  valor?: number;
}

export interface RestosAPagarVendorsChartProps {
  items: RestosAPagarVendorItem[];
  title?: string;
  className?: string;
}

export function RestosAPagarVendorsChart({
  items,
  title = "Fornecedores com maior pendência de restos a pagar",
  className = "",
}: RestosAPagarVendorsChartProps) {
  if (!items || items.length === 0) return null;

  const getVal = (i: RestosAPagarVendorItem) => i.valorTotal ?? i.valor ?? 0;
  const maxVal = Math.max(...items.map(getVal), 1);

  return (
    <div
      className={`space-y-4 rounded-2xl border border-borderLine bg-white p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title && <h4 className="font-bold text-base text-ink">{title}</h4>}

        {/* Legenda Stacked */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
            <span className="font-medium text-ink/70">
              Liquidado (Dívida Real)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="font-medium text-ink/70">
              Empenhado (Não Processado)
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const total = getVal(item);
          const liq = item.liquidado ?? 0;
          const naoProc = Math.max(0, total - liq);
          const barWidthPct = Math.max(
            Math.min((total / maxVal) * 100, 100),
            5,
          );

          const liqPct =
            total > 0 ? Math.min(100, Math.max(0, (liq / total) * 100)) : 0;
          const naoProcPct =
            total > 0 ? Math.min(100, Math.max(0, (naoProc / total) * 100)) : 0;

          return (
            <div key={item.fornecedor} className="space-y-1.5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="w-2/3 truncate font-medium text-ink">
                  {toTitleCase(item.fornecedor)}
                </div>
                <div className="shrink-0 text-right font-bold text-ink">
                  {fmtCompact(total)}
                </div>
              </div>

              {/* Stacked Bar sem fundo cinza total para evitar falsa ideia de progresso */}
              <div className="flex h-3.5 w-full items-center">
                <div
                  className="flex h-full overflow-hidden rounded-full transition-all duration-300"
                  style={{ width: `${barWidthPct}%` }}
                >
                  {liq > 0 && (
                    <div
                      className="h-full bg-amber-600"
                      style={{ width: `${liqPct}%` }}
                      title={`Liquidado (Dívida Real): ${fmtCompact(liq)}`}
                    />
                  )}
                  {naoProc > 0 && (
                    <div
                      className="h-full bg-amber-300"
                      style={{ width: `${naoProcPct}%` }}
                      title={`Empenhado (Não Processado): ${fmtCompact(naoProc)}`}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-ink/60">
                {total === 0 ? (
                  <span>Sem pendências</span>
                ) : (
                  <>
                    <span>
                      {liq > 0
                        ? `${fmtCompact(liq)} liquidado (dívida real)`
                        : "100% não processado (empenhado)"}
                    </span>
                    <span>
                      {naoProc > 0
                        ? `${fmtCompact(naoProc)} empenhado (não processado)`
                        : "Totalmente liquidado"}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
