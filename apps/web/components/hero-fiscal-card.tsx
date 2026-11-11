import {
  cn,
  corDoGrafico,
  fmtCompact,
  type TokenCorGrafico,
} from "@transparencia/ui";
import type React from "react";

export interface OriginBreakdownItem {
  label: string;
  amountPerReal?: string;
  percentage: number;
  /** Token semântico da cor da barra (ver `corDoGrafico`). */
  corToken?: TokenCorGrafico;
}

export interface HeroFiscalCardProps {
  portalName?: string;
  periodText?: string;
  headline?: React.ReactNode;
  summary?: React.ReactNode;
  totalArrecadado?: string | number;
  previstoTotal?: string | number;
  realizationPercent?: number;
  statusBadgeText?: string;
  originBreakdown?: OriginBreakdownItem[];
  arrecadadoTitle?: string;
  className?: string;
}

export function HeroFiscalCard({
  portalName,
  periodText,
  headline,
  summary,
  totalArrecadado,
  previstoTotal,
  realizationPercent = 0,
  statusBadgeText,
  originBreakdown,
  arrecadadoTitle,
  className,
}: HeroFiscalCardProps) {
  const formattedTotal =
    typeof totalArrecadado === "number"
      ? fmtCompact(totalArrecadado)
      : (totalArrecadado ?? "R$ 0");

  const formattedPrevisto =
    typeof previstoTotal === "number"
      ? fmtCompact(previstoTotal)
      : (previstoTotal ?? "R$ 0");

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-8 lg:grid-cols-12",
        className,
      )}
    >
      {/* Coluna Esquerda: Narrativa */}
      <div className="space-y-4 lg:col-span-7">
        {periodText && (
          <span className="inline-block font-semibold text-brand text-xs uppercase tracking-normal">
            {periodText}
          </span>
        )}

        {headline && <h1>{headline}</h1>}

        {summary && (
          <div className="space-y-3 text-mute2 text-sm leading-relaxed sm:text-base">
            {summary}
          </div>
        )}
      </div>

      {/* Coluna Direita: Card Visual */}
      <div className="border-line lg:col-span-5 lg:border-l lg:pl-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="eyebrow">
            {arrecadadoTitle ||
              `Arrecadado no ano até agora ${portalName ? `· ${portalName}` : ""}`}
          </span>
          {statusBadgeText && (
            <span className="inline-flex shrink-0 items-center rounded-md border border-warn-text/40 bg-warn-fill/10 px-2.5 py-0.5 font-medium text-[11px] text-warn-text">
              {statusBadgeText}
            </span>
          )}
        </div>

        <div className="mb-2 font-bold font-sans text-3xl text-ink tracking-tight sm:text-4xl">
          {formattedTotal}
        </div>

        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between font-medium text-mute2 text-xs">
            <span>
              Previsto:{" "}
              <strong className="text-ink">{formattedPrevisto}</strong>
            </span>
            <span className="font-semibold text-brand">
              {realizationPercent}% executado
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden bg-track">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                backgroundColor: corDoGrafico("brand"),
                width: `${Math.min(100, Math.max(0, realizationPercent))}%`,
              }}
            />
          </div>
        </div>

        {originBreakdown && originBreakdown.length > 0 && (
          <div className="mt-4 border-line border-t pt-4">
            <h2 className="mb-3">De onde vem cada R$ 1,00</h2>
            <div className="space-y-3">
              {originBreakdown.map((item) => {
                return (
                  <div key={item.label} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-mute2">
                      <span className="font-medium text-ink">{item.label}</span>
                      <span className="font-semibold text-ink">
                        {item.amountPerReal ? `${item.amountPerReal} ` : ""}(
                        {item.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden bg-track">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          backgroundColor: corDoGrafico(item.corToken ?? "ink"),
                          width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
