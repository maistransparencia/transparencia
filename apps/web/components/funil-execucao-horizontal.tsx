import { cn, fmtCompact } from "@transparencia/ui";

export interface FunnelStage {
  name: string;
  description?: string;
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
    <div className="space-y-5">
      {stages.map((stage, idx) => {
        const widthPct = Math.min(
          100,
          Math.max(0, (stage.value / maxVal) * 100),
        );
        const valText = stage.formattedValue || fmtCompact(stage.value);
        const color =
          stage.colorClass || CORES_PADRAO[idx % CORES_PADRAO.length];

        return (
          <div key={stage.name} className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{stage.name}</p>
                {stage.description ? (
                  <p className="caption">{stage.description}</p>
                ) : null}
              </div>
              <p className="shrink-0 whitespace-nowrap font-semibold text-ink text-sm tabular-nums">
                {valText}
              </p>
            </div>
            <div className="h-3 overflow-hidden bg-track">
              <div
                className={cn("h-full transition-all duration-500", color)}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
