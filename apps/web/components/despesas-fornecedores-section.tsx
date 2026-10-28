import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import type { FornecedorLinha } from "@/app/[portalSlug]/despesas/view-model";

export interface DespesasFornecedoresSectionProps {
  fornecedores: FornecedorLinha[];
}

/** Documento só é exibido como vem da fonte; 11 dígitos sem máscara nunca são renderizados. */
const CPF_SEM_MASCARA = /(?<!\d)(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})(?!\d)/;

const documentoExibivel = (documento: string | null) =>
  documento && !CPF_SEM_MASCARA.test(documento) ? documento : null;

export function DespesasFornecedoresSection({
  fornecedores,
}: DespesasFornecedoresSectionProps) {
  if (fornecedores.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="despesas-fornecedores">
      <div className="border-line border-t">
        {fornecedores.map((fornecedor) => {
          const documento = documentoExibivel(fornecedor.documento);
          return (
            <details
              key={`${fornecedor.nome}-${fornecedor.documento ?? ""}`}
              className="group border-line border-b"
            >
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-ink text-sm">
                  {fornecedor.nome}
                  <span className="ml-2 font-mono text-mute2 text-xs">
                    {fmtPercent(fornecedor.percentualTotalPago)}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-right text-ink text-sm tabular-nums">
                  {fmtCompact(fornecedor.valorPago)}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
                <span className="col-span-full block h-1.5 w-full overflow-hidden bg-track">
                  <span
                    className="block h-full bg-brand"
                    style={{ width: `${fornecedor.larguraBarra}%` }}
                  />
                </span>
              </summary>
              <p className="border-line2 border-t pt-1.5 pb-4 text-mute text-sm">
                {documento
                  ? `Documento: ${documento}`
                  : "Documento não informado"}
              </p>
            </details>
          );
        })}
      </div>
      <p className="text-mute2 text-sm">
        Contratos grandes, como coleta de lixo ou merenda, naturalmente
        concentram valores. O valor mostra o que foi pago, não se o preço foi
        justo.
      </p>
    </div>
  );
}
