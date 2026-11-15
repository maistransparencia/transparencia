import { cn, fmtCurrency } from "@transparencia/ui";

export interface BarChartHItem {
  label: string;
  value: number;
  subtext?: string;
  barColor?: string;
  colorClass?: string;
}

export interface BarChartHProps {
  data: BarChartHItem[];
  maxVal?: number;
  barColor?: string;
}

export function BarChartH({
  data,
  maxVal,
  barColor = "var(--brand-fill)",
}: BarChartHProps) {
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, _idx) => {
        const pct = Math.min(100, Math.max(0, (item.value / max) * 100));
        const itemColor =
          item.barColor || (!item.colorClass ? barColor : undefined);
        return (
          <div key={`bar-chart-h-${item.label}`} className="space-y-1">
            <div className="text-ink flex justify-between text-xs font-medium">
              <span className="max-w-[480px] truncate">{item.label}</span>
              <span className="font-serif font-bold">
                {fmtCurrency(item.value)}
              </span>
            </div>
            <div className="bg-track h-3 w-full">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  item.colorClass,
                )}
                style={{
                  width: `${pct}%`,
                  ...(itemColor ? { backgroundColor: itemColor } : {}),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
