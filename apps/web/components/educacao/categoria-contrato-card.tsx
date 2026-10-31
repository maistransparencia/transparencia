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
        "flex min-h-11 w-full flex-col gap-2 border-line border-t p-4 text-left transition-colors",
        vazia
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:border-brand-fill/40 focus-visible:border-brand-fill/40 focus-visible:outline-2 focus-visible:outline-brand-fill",
        className,
      )}
    >
      <span className="font-semibold text-mute text-xs uppercase tracking-wider">
        {rotuloCategoria}
      </span>
      <span
        className={cn(
          "font-serif text-xl sm:text-2xl",
          vazia ? "text-mute2" : "text-ink",
        )}
      >
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
            className="block h-1.5 w-full overflow-hidden rounded-full bg-line2"
          >
            <span
              className="block h-full rounded-full bg-brand-fill"
              style={{ width: `${percentualPago}%` }}
            />
          </span>
          <span className="block text-mute text-xs">
            {percentualPago}% pago do empenhado
          </span>
        </span>
      )}
      <span
        className={cn(
          "font-medium text-xs",
          vazia ? "text-mute2" : "text-brand-text",
        )}
      >
        {vazia ? rotuloContratos : `${rotuloContratos} ›`}
      </span>
    </button>
  );
}
