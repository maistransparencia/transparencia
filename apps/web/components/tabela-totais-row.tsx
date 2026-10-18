import { cn, fmtCurrency } from "@transparencia/ui";

export interface TabelaTotaisItem {
  rotulo: string;
  valor: number;
  isAlerta?: boolean;
}

export interface TabelaTotaisRowProps {
  itens: TabelaTotaisItem[];
  className?: string;
}

export function TabelaTotaisRow({ itens, className }: TabelaTotaisRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span>Total</span>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
        {itens.map((item) => (
          <span
            key={item.rotulo}
            className={item.isAlerta ? "text-amber-700" : "text-slate-900"}
          >
            {fmtCurrency(item.valor)} ({item.rotulo})
          </span>
        ))}
      </div>
    </div>
  );
}
