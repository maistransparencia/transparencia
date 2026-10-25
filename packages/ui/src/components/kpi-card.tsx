import { cn } from "../utils/cn";

export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  accent?: boolean;
  alert?: boolean;
  /** `divisoria`: sem caixa, filete e tipografia editorial. Sem valor, mantém o visual atual. */
  variant?: "padrao" | "divisoria";
  className?: string;
}

export function KPICard({
  title,
  value,
  subtext,
  trend,
  accent = false,
  alert = false,
  variant = "padrao",
  className,
}: KPICardProps) {
  if (variant === "divisoria") {
    return (
      <div className={cn("flex flex-col justify-between py-1", className)}>
        <div>
          <p className="mb-1.5 font-mono text-[11px] text-mute2 uppercase tracking-wider">
            {title}
          </p>
          <p
            className={cn(
              "font-semibold text-[26px] leading-tight",
              accent ? "text-brand" : alert ? "text-warn" : "text-ink",
            )}
          >
            {value}
          </p>
        </div>
        {(subtext || trend) && (
          <div className="mt-2 flex items-center justify-between gap-2 text-mute2 text-xs">
            {subtext && <span>{subtext}</span>}
            {trend && (
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap font-semibold",
                  trend.isPositive ? "text-ok" : "text-danger",
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-borderLine bg-white p-5 transition-shadow hover:shadow-sm",
        accent && "border-l-4 border-l-accent",
        alert && "border-l-4 border-l-warning bg-amber-50/20",
        className,
      )}
    >
      <div>
        <p className="mb-1 font-medium text-subtleText text-xs tracking-wider">
          {title}
        </p>
        <p
          className={cn(
            "font-bold font-serif text-2xl leading-tight",
            accent ? "text-accent" : alert ? "text-warning" : "text-ink",
          )}
        >
          {value}
        </p>
      </div>
      {(subtext || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-gray-100 border-t pt-2 text-mutedText text-xs">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap font-semibold",
                trend.isPositive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
