import { Children, cloneElement, isValidElement } from "react";
import { cn } from "../utils/cn";

export type IndicatorSize = "sm" | "md" | "lg";
export type IndicatorTone = "default" | "ok" | "warn" | "danger";
export type IndicatorPanelTone = "default" | "brand" | "ok" | "warn" | "danger";

const SIZE_CLASS: Record<IndicatorSize, string> = {
  sm: "stat-value-sm",
  md: "stat-value",
  lg: "stat-value-lg",
};

const PANEL_TONE_CLASS: Record<IndicatorPanelTone, string> = {
  default: "",
  brand: "panel-brand",
  ok: "panel-ok",
  warn: "panel-warn",
  danger: "panel-danger",
};

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const VALUE_TONE_CLASS: Record<IndicatorTone, string> = {
  default: "",
  ok: "text-ok-text",
  warn: "text-warn-text",
  danger: "text-danger-text",
};

function trendClassName(isPositive: boolean | undefined): string | undefined {
  if (isPositive === undefined) return undefined;
  return isPositive ? "text-ok-text" : "text-danger-text";
}

export interface IndicatorPanelProps {
  children: React.ReactNode;
  /** Um tamanho de valor por painel: o destaque vem da posição, não da fonte. */
  size?: IndicatorSize;
  /** Tom da borda do `panel`. */
  tone?: IndicatorPanelTone;
  /** Só a grade, sem `panel`: para uso dentro de outro `panel` já emoldurado. */
  bare?: boolean;
  /** Número fixo de colunas; sem ele a grade se ajusta sozinha (`auto-fit`). */
  columns?: 2 | 3 | 4;
  className?: string;
}

/** `panel` com uma grade `dl` de indicadores (DESIGN.md > `indicator`). */
export function IndicatorPanel({
  children,
  size = "md",
  tone = "default",
  bare = false,
  columns,
  className,
}: IndicatorPanelProps) {
  return (
    <div
      className={cn(
        !bare && "panel",
        !bare && PANEL_TONE_CLASS[tone],
        className,
      )}
    >
      <dl
        className={cn(
          "grid gap-6",
          columns
            ? COLUMNS_CLASS[columns]
            : "grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]",
        )}
      >
        {Children.map(children, (child) =>
          isValidElement<IndicatorProps>(child)
            ? cloneElement(child, { size })
            : child,
        )}
      </dl>
    </div>
  );
}

export interface IndicatorProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Nota ao lado do valor: de onde vem o número, ou a comparação. */
  note?: React.ReactNode;
  /** Tom semântico do valor. Não há variante em cor de marca. */
  tone?: IndicatorTone;
  /** Definido pelo `IndicatorPanel`: um tamanho de valor por painel. */
  size?: IndicatorSize;
  /** Variação com texto próprio; a cor nunca é o único sinal. */
  trend?: { value: string | number; isPositive?: boolean };
  className?: string;
}

const temConteudo = (conteudo: React.ReactNode) =>
  conteudo !== undefined &&
  conteudo !== null &&
  conteudo !== false &&
  conteudo !== "";

/** Um indicador: `div > dt + dd`. Deve ficar dentro de `IndicatorPanel`. */
export function Indicator({
  label,
  value,
  note,
  tone = "default",
  size = "md",
  trend,
  className,
}: IndicatorProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className={cn(SIZE_CLASS[size], VALUE_TONE_CLASS[tone])}>{value}</dd>
      {temConteudo(note) || trend ? (
        <dd className="caption flex flex-wrap items-baseline gap-x-2">
          {temConteudo(note) ? <span>{note}</span> : null}
          {trend ? (
            <span
              className={cn("font-semibold", trendClassName(trend.isPositive))}
            >
              {trend.value}
            </span>
          ) : null}
        </dd>
      ) : null}
    </div>
  );
}
