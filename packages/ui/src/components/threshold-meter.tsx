import { cn } from "../utils/cn";

export type ThresholdMeterTone = "brand" | "ok" | "warn" | "danger";

const FILL_CLASS: Record<ThresholdMeterTone, string> = {
  brand: "bg-brand-fill",
  ok: "bg-ok-fill",
  warn: "bg-warn-fill",
  danger: "bg-danger-fill",
};

export interface ThresholdMeterProps {
  /** Valor medido; `null` não desenha a barra. */
  value: number | null;
  /** Fim da escala (100 para percentuais, 10 para nota). */
  max?: number;
  /** Posição do marcador na mesma escala: o mínimo legal ou a meta. */
  threshold?: number;
  /** Segundo marcador, de outra cor, para uma referência a mais (ex.: a média do estado). */
  secondaryThreshold?: number;
  /** Nome acessível da barra. */
  label: string;
  /** Leitura do valor por texto (ex.: "27,4% aplicado; mínimo de 25%"). */
  valueText: string;
  tone?: ThresholdMeterTone;
  className?: string;
}

const emPercentual = (valor: number, max: number) =>
  max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0;

/** Barra quadrada com marcador de mínimo ou meta (DESIGN.md > barras). */
export function ThresholdMeter({
  value,
  max = 100,
  threshold,
  secondaryThreshold,
  label,
  valueText,
  tone = "brand",
  className,
}: ThresholdMeterProps) {
  if (value === null) return null;
  const temMarcador = threshold !== undefined;
  const posicaoMarcador = temMarcador ? emPercentual(threshold, max) : 0;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <meter> não aceita o marcador nem o estilo quadrado de barra
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      aria-valuetext={valueText}
      className={cn("relative block", className)}
    >
      <span className="bg-track block h-4 w-full">
        <span
          data-testid="threshold-meter-fill"
          className={cn("block h-full", FILL_CLASS[tone])}
          style={{ width: `${emPercentual(value, max)}%` }}
        />
      </span>
      {secondaryThreshold !== undefined && (
        <span
          data-testid="threshold-meter-secondary-marker"
          aria-hidden="true"
          className="bg-warn-fill absolute top-[-0.25rem] bottom-[-0.25rem] block w-0.5"
          style={{ left: `${emPercentual(secondaryThreshold, max)}%` }}
        />
      )}
      {temMarcador && (
        <span
          data-testid="threshold-meter-marker"
          aria-hidden="true"
          className="bg-ink absolute top-[-0.25rem] bottom-[-0.25rem] block w-0.5"
          style={{ left: `${posicaoMarcador}%` }}
        />
      )}
    </span>
  );
}
