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
          <div className="flex flex-col items-stretch justify-between divide-y divide-line border-line border-y sm:flex-row sm:divide-x sm:divide-y-0">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="flex min-w-0 flex-1 flex-col justify-between py-4 sm:px-5 sm:last:pr-0 sm:first:pl-0"
              >
                <div>
                  <div className="mb-2 font-semibold text-ink text-xs">
                    {stage.name}
                  </div>
                  <div className="mb-3 h-2.5 w-full overflow-hidden rounded-md bg-track">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, stage.percentage))}%`,
                        backgroundColor: corDoGrafico(
                          stage.corToken ?? "brand",
                        ),
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="font-bold font-serif text-ink text-lg tracking-tight">
                    {stage.formattedValue}
                  </div>
                  <div className="mt-0.5 font-medium text-mute2 text-xs">
                    {stage.label}
                  </div>
                </div>
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
