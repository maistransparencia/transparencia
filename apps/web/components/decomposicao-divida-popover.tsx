"use client";

import type { EntidadeDividaItemDTO } from "@transparencia/db";
import { fmtCompact, fmtCurrency } from "@transparencia/ui";
import { AlertCircle, ChevronDown, Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type { EntidadeDividaItemDTO };

export interface DecomposicaoDividaPopoverProps {
  categoriaTitulo: string;
  dividaRealTotal: number;
  decomposicao: EntidadeDividaItemDTO[];
  className?: string;
  trigger?: React.ReactNode;
}

export function DecomposicaoDividaPopover({
  categoriaTitulo,
  dividaRealTotal,
  decomposicao,
  className = "",
  trigger,
}: DecomposicaoDividaPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? "z-30" : ""} ${className}`}
    >
      {/* Gatilho Interativo */}
      {trigger ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full text-left"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          aria-label={`Ver decomposição da dívida de ${categoriaTitulo} por entidade`}
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs transition-colors hover:border-amber-300 hover:bg-amber-100/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          aria-label={`Ver decomposição da dívida de ${categoriaTitulo} por entidade`}
        >
          <div className="flex items-center gap-1.5 font-medium text-amber-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span>Dívida real acumulada:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="whitespace-nowrap font-bold font-serif text-amber-900">
              {fmtCompact(dividaRealTotal)}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-amber-700 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      )}

      {/* Popover Decomposto */}
      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="absolute right-0 bottom-full left-0 z-50 mb-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl"
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between border-slate-100 border-b pb-2.5">
            <div>
              <h5 id={titleId} className="font-bold text-slate-800 text-sm">
                Decomposição da Dívida Real
              </h5>
              <p className="mt-0.5 text-slate-500 text-xs">
                <span className="font-medium text-slate-700">
                  {categoriaTitulo}
                </span>
                {" • "}
                Total:{" "}
                <span className="font-bold font-serif text-amber-900">
                  {fmtCurrency(dividaRealTotal)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Fechar detalhamento"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Lista Decomposta por Entidade */}
          <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto py-1">
            {decomposicao.length === 0 ? (
              <p className="py-4 text-center text-slate-500 text-xs">
                Nenhuma dívida pendente registrada para as entidades
                selecionadas.
              </p>
            ) : (
              decomposicao.map((item) => {
                const percentualVal = Math.min(
                  100,
                  Math.max(0, item.percentual),
                );
                return (
                  <div
                    key={item.empresaId}
                    className="py-2.5 first:pt-1.5 last:pb-1"
                  >
                    {/* Linha superior: Nome da entidade com espaço amplo para evitar truncamento */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="font-medium text-slate-800 text-xs leading-snug"
                        title={item.entidadeNome}
                      >
                        {item.entidadeNome}
                      </span>
                    </div>

                    {/* Barra de progresso visual proporcional */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${percentualVal}%` }}
                      />
                    </div>

                    {/* Linha inferior: Percentual e Valor monetário */}
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-[10px] text-amber-800">
                        {item.percentual}%
                      </span>
                      <span className="font-bold font-serif text-slate-900">
                        {fmtCurrency(item.valorDivida)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé Informativo Cívico */}
          <div className="mt-2.5 flex items-start gap-1.5 border-slate-100 border-t pt-2 text-[11px] text-slate-500 leading-snug">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p>
              A dívida real compreende empenhos liquidados do exercício ainda
              não pagos somados aos Restos a Pagar de anos anteriores,
              prevenindo conclusões precipitadas sobre os órgãos responsáveis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
