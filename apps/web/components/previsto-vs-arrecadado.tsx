import { cn, fmtCompact } from "@transparencia/ui";

export interface PrevistoVsArrecadadoItem {
  fonte: string;
  previsto: number;
  arrecadado: number;
  pctRealizado: number;
  previstoFormatted?: string;
  arrecadadoFormatted?: string;
}

export interface PrevistoVsArrecadadoProps {
  items: PrevistoVsArrecadadoItem[];
  maxVal?: number;
}

export function PrevistoVsArrecadadoOrigem({
  items,
  maxVal,
}: PrevistoVsArrecadadoProps) {
  // A régua de R$ é definida pelo maior valor (previsto ou arrecadado) entre todas as origens
  const maxScale =
    maxVal ||
    Math.max(...items.flatMap((item) => [item.previsto, item.arrecadado]), 1);

  return (
    <div className="space-y-6">
      {items.map((item) => {
        // O comprimento da trilha representa o previsto (ou arrecadado se superado), com piso mínimo de 18% para manter legibilidade visual
        const baseVal = Math.max(item.previsto, item.arrecadado);
        const trackWidthPct = Math.min(
          100,
          Math.max(18, (baseVal / maxScale) * 100),
        );

        // Preenchimento interno = proporção arrecadada em relação ao previsto
        const fillPct =
          item.previsto > 0
            ? Math.min(
                100,
                Math.max(0, (item.arrecadado / item.previsto) * 100),
              )
            : 0;

        const falta = Math.max(0, item.previsto - item.arrecadado);
        const faltaText = falta > 0 ? ` · faltam ${fmtCompact(falta)}` : "";

        const isPropria =
          item.fonte.toLowerCase().includes("própria") ||
          item.fonte.toLowerCase().includes("propria");

        const barColorClass = isPropria ? "bg-ok-fill" : "bg-brand-fill";

        return (
          <div key={`previsto-vs-arrecadado-${item.fonte}`} className="py-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink">{item.fonte}</span>
              <span className="caption font-medium">
                {fmtCompact(item.arrecadado)} / {fmtCompact(item.previsto)}
              </span>
            </div>

            <div className="w-full">
              <div
                className="h-5 overflow-hidden bg-track"
                style={{ width: `${trackWidthPct}%` }}
              >
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    barColorClass,
                  )}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>

            <div className="caption mt-1 font-medium">
              {Math.round(item.pctRealizado)}% realizado{faltaText}
            </div>
          </div>
        );
      })}
    </div>
  );
}
