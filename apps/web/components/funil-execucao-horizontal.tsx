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
                <p className="text-ink text-sm font-semibold">{stage.name}</p>
                {stage.description ? (
                  <p className="caption">{stage.description}</p>
                ) : null}
              </div>
              <p className="text-ink shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                {valText}
              </p>
            </div>
            <div className="bg-track h-3 overflow-hidden">
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
