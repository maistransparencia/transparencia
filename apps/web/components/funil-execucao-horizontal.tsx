import { cn, fmtCompact } from "@transparencia/ui";

export interface FunnelStage {
  name: string;
  value: number;
  formattedValue?: string;
  colorClass?: string;
}

export interface FunnelExecucaoHorizontalProps {
  stages: FunnelStage[];
}

const CORES_PADRAO = [
  "bg-brand-fill",
  "bg-brand-fill",
  "bg-brand-fill",
  "bg-ok-fill",
];

export function FunnelExecucaoHorizontal({
  stages,
}: FunnelExecucaoHorizontalProps) {
  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <section className="space-y-4 border-line border-y py-5">
      <h2>Funil da execução</h2>
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.min(
            100,
            Math.max(0, (stage.value / maxVal) * 100),
          );
          const valText = stage.formattedValue || fmtCompact(stage.value);
          const color =
            stage.colorClass || CORES_PADRAO[idx % CORES_PADRAO.length];

          return (
            <div
              key={stage.name}
              className="flex items-center gap-4 font-medium text-xs"
            >
              <span className="w-24 shrink-0 text-mute">{stage.name}</span>
              <div className="relative flex h-9 flex-1 items-center overflow-hidden bg-track">
                <div
                  className={cn("h-full transition-all duration-500", color)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="min-w-20 shrink-0 whitespace-nowrap text-right font-semibold text-ink text-xs">
                {valText}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
