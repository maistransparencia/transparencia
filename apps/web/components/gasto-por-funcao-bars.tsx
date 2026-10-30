import { cn, fmtCompact } from "@transparencia/ui";

export interface GastoFuncaoItem {
  funcao: string;
  valor: number;
  valorFormatted?: string;
  colorClass?: string;
}

export interface GastoPorFuncaoBarsProps {
  items: GastoFuncaoItem[];
  maxVal?: number;
}

export function GastoPorFuncaoBars({ items, maxVal }: GastoPorFuncaoBarsProps) {
  const max = maxVal || Math.max(...items.map((i) => i.valor), 1);

  return (
    <div className="space-y-4 border-line border-y py-5">
      {items.map((item) => {
        const widthPct = Math.min(100, Math.max(0, (item.valor / max) * 100));
        const color = item.colorClass || "bg-brand-fill";
        const formattedVal = item.valorFormatted || fmtCompact(item.valor);

        return (
          <div
            key={item.funcao}
            className="flex items-center gap-4 font-medium text-xs"
          >
            <span className="w-32 shrink-0 truncate font-semibold text-ink">
              {item.funcao}
            </span>
            <div className="h-4 flex-1 overflow-hidden bg-track">
              <div
                className={cn("h-full transition-all duration-500", color)}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="ml-2 min-w-20 shrink-0 text-right font-semibold font-serif text-ink text-sm">
              {formattedVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}
