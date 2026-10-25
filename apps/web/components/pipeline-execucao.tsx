import {
  cn,
  corDoGrafico,
  SectionHeader,
  type TokenCorGrafico,
} from "@transparencia/ui";
import Link from "next/link";

export interface ExecutionStage {
  name: string;
  value?: number | string;
  formattedValue: string;
  percentage: number;
  label: string;
  /** Token semântico da cor da barra (ver `corDoGrafico`). */
  corToken?: TokenCorGrafico;
}

export interface PipelineExecucaoProps {
  title?: string;
  detailUrl?: string;
  stages?: ExecutionStage[];
  className?: string;
}

export function PipelineExecucao({
  title = "Do orçamento autorizado ao pagamento",
  detailUrl = "/orcamento",
  stages = [],
  className,
}: PipelineExecucaoProps) {
  const hasStages = stages.length > 0;

  return (
    <div className={cn("w-full", className)}>
      <SectionHeader
        title={title}
        action={
          detailUrl ? (
            <Link
              href={detailUrl}
              className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand text-xs hover:underline"
            >
              Ver detalhes →
            </Link>
          ) : undefined
        }
      />

      {/* Container Principal */}
      <div>
        {hasStages ? (
          <div className="flex flex-col items-stretch justify-between divide-y divide-line border-line border-b sm:flex-row sm:divide-x sm:divide-y-0">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="flex min-w-0 flex-1 flex-col py-5 sm:px-5 sm:last:pr-0 sm:first:pl-0"
              >
                <div className="mb-2 font-medium font-mono text-[10px] text-ink uppercase tracking-widest">
                  {stage.name}
                </div>
                <div className="mb-4 h-1.5 w-full overflow-hidden bg-track">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, stage.percentage))}%`,
                      backgroundColor: corDoGrafico(stage.corToken ?? "brand"),
                    }}
                  />
                </div>
                <div className="font-bold font-sans text-ink text-xl tracking-tight">
                  {stage.formattedValue}
                </div>
                <div className="mt-1 text-mute2 text-xs">{stage.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-mute2 text-xs">
            Nenhuma etapa de execução orçamentária disponível.
          </div>
        )}
      </div>
    </div>
  );
}
