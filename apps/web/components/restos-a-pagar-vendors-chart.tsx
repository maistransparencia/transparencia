import { fmtCompact, toTitleCase } from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import { FornecedorDocumentoDetalhe } from "./fornecedor-documento-detalhe";

export interface RestosAPagarVendorItem {
  fornecedor: string;
  fornecedorDocumento?: string | null;
  valorTotal?: number;
  liquidado?: number;
  empenhadoALiquidar?: number;
  valor?: number;
}

export interface RestosAPagarVendorsChartProps {
  items: RestosAPagarVendorItem[];
  portalSlug: string;
  ano: number;
  title?: string;
  className?: string;
}

export function RestosAPagarVendorsChart({
  items,
  portalSlug,
  ano,
  title = "Quem mais espera receber",
  className = "",
}: RestosAPagarVendorsChartProps) {
  if (!items || items.length === 0) return null;

  const getVal = (i: RestosAPagarVendorItem) => i.valorTotal ?? i.valor ?? 0;
  const maxVal = Math.max(...items.map(getVal), 1);

  return (
    <div className={`space-y-4 ${className}`} data-testid="restos-fornecedores">
      <div className="space-y-2">
        {title && <h4 className="font-bold text-base text-ink">{title}</h4>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mute2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-warn-fill" aria-hidden="true" />
            Já entregue, falta pagar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-brand" aria-hidden="true" />
            Ainda em andamento
          </span>
        </div>
      </div>

      <div>
        {items.map((item) => {
          const total = getVal(item);
          const entregue = Math.min(item.liquidado ?? 0, total);
          const emAndamento = Math.max(0, total - entregue);
          const larguraBarra = Math.min((total / maxVal) * 100, 100);
          const larguraEntregue = total > 0 ? (entregue / total) * 100 : 0;

          return (
            <details
              key={`${item.fornecedor}-${item.fornecedorDocumento ?? ""}-${total}`}
              className="group"
            >
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-ink text-sm">
                  {toTitleCase(item.fornecedor)}
                </span>
                <span className="flex items-center gap-2 text-right text-ink text-sm tabular-nums">
                  {fmtCompact(total)}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
                <span className="col-span-full block h-1.5 w-full overflow-hidden bg-track">
                  <span
                    className="flex h-full"
                    style={{ width: `${larguraBarra}%` }}
                  >
                    {entregue > 0 && (
                      <span
                        className="block h-full bg-warn-fill"
                        style={{ width: `${larguraEntregue}%` }}
                      />
                    )}
                    {emAndamento > 0 && (
                      <span className="block h-full flex-1 bg-brand" />
                    )}
                  </span>
                </span>
                <span className="col-span-full text-mute2 text-xs">
                  {[
                    entregue > 0 && `${fmtCompact(entregue)} já entregue`,
                    emAndamento > 0 &&
                      `${fmtCompact(emAndamento)} em andamento`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </summary>
              <FornecedorDocumentoDetalhe
                documento={item.fornecedorDocumento ?? null}
                portalSlug={portalSlug}
                ano={ano}
              />
            </details>
          );
        })}
      </div>
    </div>
  );
}
