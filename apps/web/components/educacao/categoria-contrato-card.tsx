import type { EducacaoCategoriaContrato } from "@transparencia/db";
import { cn, fmtCompact } from "@transparencia/ui";
import type { EducacaoContratosCategoriaTotais } from "@/app/[portalSlug]/educacao/view-model";
import { formatCategoriaLabel } from "./educacao-contratos-utils";

export interface CategoriaContratoCardProps {
  categoria: EducacaoCategoriaContrato;
  totais: EducacaoContratosCategoriaTotais;
  onOpen: (categoria: EducacaoCategoriaContrato) => void;
  className?: string;
}

export function CategoriaContratoCard({
  categoria,
  totais,
  onOpen,
  className,
}: CategoriaContratoCardProps) {
  const { quantidade, valorContrato, totalEmpenhado, totalPago } = totais;
  const vazia = quantidade === 0;
  const rotuloCategoria = formatCategoriaLabel(categoria);
  const rotuloContratos = `${quantidade} ${quantidade === 1 ? "contrato" : "contratos"}`;
  const valorExibido = vazia ? "—" : fmtCompact(valorContrato);
  const percentualPago =
    totalEmpenhado > 0
      ? Math.min(100, Math.round((totalPago / totalEmpenhado) * 100))
      : null;

  return (
    <button
      type="button"
      aria-disabled={vazia}
      aria-label={`${rotuloCategoria}, ${valorExibido}, ${rotuloContratos}`}
      onClick={vazia ? undefined : () => onOpen(categoria)}
      data-testid={`categoria-card-${categoria}`}
      className={cn(
        "panel panel-top panel-interactive flex min-h-11 w-full flex-col gap-2 text-left",
        vazia && "opacity-60",
        className,
      )}
    >
      <span className="eyebrow">{rotuloCategoria}</span>
      <span className={cn("stat-value", vazia && "text-mute")}>
        {valorExibido}
      </span>
      {percentualPago !== null && !vazia && (
        <span className="block space-y-1">
          <span
            role="progressbar"
            aria-label="Percentual pago do empenhado"
            aria-valuenow={percentualPago}
            aria-valuemin={0}
            aria-valuemax={100}
            className="block h-3 w-full overflow-hidden bg-track"
          >
            <span
              className="block h-full bg-brand-fill"
              style={{ width: `${percentualPago}%` }}
            />
          </span>
          <span className="caption block">
            {percentualPago}% pago do empenhado
          </span>
        </span>
      )}
      <span className="font-medium text-brand-text text-sm">
        {vazia ? rotuloContratos : `${rotuloContratos} ›`}
      </span>
    </button>
  );
}
