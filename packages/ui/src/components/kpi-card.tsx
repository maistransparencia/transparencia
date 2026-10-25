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
  /** `divisoria`: sem caixa, filete e tipografia editorial. Sem valor, mantém o visual atual. */
  variant?: "padrao" | "divisoria";
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
  /** `false` preserva o comportamento da variante padrão (renderiza `0`). */
  omitirSubtextoVazio: boolean;
  className: string;
  trendPositiveClassName: string;
  trendNegativeClassName: string;
}

/** Rodapé compartilhado entre as variantes; omitido quando não há conteúdo. */
function KPICardRodape({
  subtext,
  trend,
  invertTrend,
  omitirSubtextoVazio,
  className,
  trendPositiveClassName,
  trendNegativeClassName,
}: KPICardRodapeProps) {
  const temSubtexto = omitirSubtextoVazio ? temConteudo(subtext) : !!subtext;
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
        <KPICardRodape
          subtext={subtext}
          trend={trend}
          invertTrend={invertTrend}
          omitirSubtextoVazio
          className="mt-2 flex items-center justify-between gap-2 text-mute2 text-xs"
          trendPositiveClassName="text-ok"
          trendNegativeClassName="text-danger"
        />
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
      <KPICardRodape
        subtext={subtext}
        trend={trend}
        invertTrend={invertTrend}
        omitirSubtextoVazio={false}
        className="mt-3 flex items-center justify-between gap-2 border-gray-100 border-t pt-2 text-mutedText text-xs"
        trendPositiveClassName="text-emerald-600"
        trendNegativeClassName="text-rose-600"
      />
    </div>
  );
}
