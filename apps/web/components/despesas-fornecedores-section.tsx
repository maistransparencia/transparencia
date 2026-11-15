import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import type { FornecedorLinha } from "@/app/[portalSlug]/despesas/view-model";
import { FornecedorDocumentoDetalhe } from "./fornecedor-documento-detalhe";

export interface DespesasFornecedoresSectionProps {
  fornecedores: FornecedorLinha[];
  portalSlug: string;
  ano: number;
  /** Nota ao pé da lista; o padrão serve à página de despesas. */
  /** Texto sob a lista; `null` omite a nota, `undefined` usa o padrão. */
  nota?: React.ReactNode;
}

export function DespesasFornecedoresSection({
  fornecedores,
  portalSlug,
  ano,
  nota,
}: DespesasFornecedoresSectionProps) {
  if (fornecedores.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="despesas-fornecedores">
      <div>
        {fornecedores.map((fornecedor) => {
          return (
            <details
              key={`${fornecedor.nome}-${fornecedor.documento ?? ""}`}
              className="group"
            >
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
                <span className="text-ink text-sm font-medium">
                  {fornecedor.nome}
                  <span className="caption ml-2 tabular-nums">
                    {fmtPercent(fornecedor.percentualTotalPago)}
                  </span>
                </span>
                <span className="text-ink flex items-center gap-2 text-right text-sm tabular-nums">
                  {fmtCompact(fornecedor.valorPago)}
                  <ChevronDown
                    className="text-mute2 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
                <span className="bg-track col-span-full block h-1.5 w-full overflow-hidden">
                  <span
                    className="bg-brand-fill block h-full"
                    style={{ width: `${fornecedor.larguraBarra}%` }}
                  />
                </span>
              </summary>
              <FornecedorDocumentoDetalhe
                documento={fornecedor.documento}
                portalSlug={portalSlug}
                ano={ano}
              />
            </details>
          );
        })}
      </div>
      {nota !== null && (
        <p className="text-mute2 text-sm">
          {nota ??
            "Contratos grandes, como coleta de lixo ou merenda, naturalmente concentram valores. O valor mostra o que foi pago, não se o preço foi justo."}
        </p>
      )}
    </div>
  );
}
