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
        "flex flex-col gap-2 border-line border-b py-3 font-bold text-ink text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span>Total</span>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
        {itens.map((item) => (
          <span
            key={item.rotulo}
            className={item.isAlerta ? "text-warn-text" : "text-ink"}
          >
            {fmtCurrency(item.valor)} ({item.rotulo})
          </span>
        ))}
      </div>
    </div>
  );
}
