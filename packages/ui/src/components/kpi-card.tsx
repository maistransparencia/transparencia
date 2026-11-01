import { cn } from "../utils/cn";

export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  /** Destaque de marca. Tem precedência sobre `alert` quando ambos são informados. */
  accent?: boolean;
  /** Destaque de atenção. Ignorado quando `accent` está ativo. */
  alert?: boolean;
  /** Inverte a cor da tendência: use quando subir é ruim (ex.: dívida). */
  invertTrend?: boolean;
  className?: string;
}

const temConteudo = (conteudo: React.ReactNode) =>
  conteudo !== undefined &&
  conteudo !== null &&
  conteudo !== false &&
  conteudo !== "" &&
  conteudo !== 0;

interface KPICardRodapeProps {
  subtext?: React.ReactNode;
  trend?: KPICardProps["trend"];
  invertTrend: boolean;
  className: string;
  trendPositiveClassName: string;
  trendNegativeClassName: string;
}

/** Rodapé do indicador; omitido quando não há conteúdo. */
function KPICardRodape({
  subtext,
  trend,
  invertTrend,
  className,
  trendPositiveClassName,
  trendNegativeClassName,
}: KPICardRodapeProps) {
  const temSubtexto = temConteudo(subtext);
  if (!temSubtexto && !trend) return null;
  const tendenciaBoa =
    invertTrend && typeof trend?.isPositive === "boolean"
      ? !trend.isPositive
      : trend?.isPositive;
  return (
    <div className={className}>
      {temSubtexto && <span>{subtext}</span>}
      {trend && (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap font-semibold",
            tendenciaBoa ? trendPositiveClassName : trendNegativeClassName,
          )}
        >
          {trend.value}
        </span>
      )}
    </div>
  );
}

export function KPICard({
  title,
  value,
  subtext,
  trend,
  accent = false,
  alert = false,
  invertTrend = false,
  className,
}: KPICardProps) {
  return (
    <div className={cn("flex flex-col justify-between py-1 pr-5", className)}>
      <div>
        <p className="mb-1.5 font-mono text-[11px] text-mute2 uppercase tracking-wider">
          {title}
        </p>
        <p
          className={cn(
            "font-semibold text-[26px] leading-tight",
            accent ? "text-brand" : alert ? "text-warn-text" : "text-ink",
          )}
        >
          {value}
        </p>
      </div>
      <KPICardRodape
        subtext={subtext}
        trend={trend}
        invertTrend={invertTrend}
        className="mt-2 flex items-center justify-between gap-2 text-mute2 text-xs"
        trendPositiveClassName="text-ok-text"
        trendNegativeClassName="text-danger-text"
      />
    </div>
  );
}
