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

export type MeterMarkerTone = "ink" | "warn";

const MARKER_CLASS: Record<MeterMarkerTone, string> = {
  ink: "bg-ink",
  warn: "bg-warn-fill",
};

export interface MeterMarkerProps {
  /** Posição do marcador, em % da largura do trilho (0 a 100). */
  position: number;
  tone?: MeterMarkerTone;
  testId?: string;
}

/**
 * Marcador vertical de barra: 4px, centrado na posição e passando 2px acima e
 * abaixo do trilho. Único desenho de marcador do app (DESIGN.md > barras).
 */
export function MeterMarker({
  position,
  tone = "ink",
  testId,
}: MeterMarkerProps) {
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className={cn(
        "absolute top-[-0.125rem] bottom-[-0.125rem] block w-1 -translate-x-1/2",
        MARKER_CLASS[tone],
      )}
      style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
    />
  );
}

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
  return (
    // biome-ignore lint/a11y/useSemanticElements: <meter> não aceita o marcador nem o estilo quadrado de barra
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      aria-valuetext={valueText}
      className={cn("block", className)}
    >
      {/* Marcadores ancorados no trilho: o contêiner pode ser esticado pelo layout (grid) */}
      <span className="bg-track relative block h-3.5 w-full">
        <span
          data-testid="threshold-meter-fill"
          className={cn("block h-full", FILL_CLASS[tone])}
          style={{ width: `${emPercentual(value, max)}%` }}
        />
        {secondaryThreshold !== undefined && (
          <MeterMarker
            position={emPercentual(secondaryThreshold, max)}
            tone="warn"
            testId="threshold-meter-secondary-marker"
          />
        )}
        {threshold !== undefined && (
          <MeterMarker
            position={emPercentual(threshold, max)}
            testId="threshold-meter-marker"
          />
        )}
      </span>
    </span>
  );
}
