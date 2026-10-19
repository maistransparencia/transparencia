"use client";

import type { EducacaoContratoDTO } from "@transparencia/db";
import { cn, fmtCurrency, ModalDialog } from "@transparencia/ui";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  educacaoDtoToContratoServicoVigente,
  formatStatusExecucaoLabel,
} from "./educacao-contratos-utils";

export const LIMITE_CONTRATOS_PARA_BUSCA = 8;

export interface ContratosCategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaLabel: string;
  contratos: EducacaoContratoDTO[];
  valorTotal: number;
  onSelectContrato: (contrato: EducacaoContratoDTO) => void;
  contratoAbrindoId?: string | null;
  detalheAberto?: boolean;
}

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ContratosCategoriaModal({
  isOpen,
  onClose,
  categoriaLabel,
  contratos,
  valorTotal,
  onSelectContrato,
  contratoAbrindoId = null,
  detalheAberto = false,
}: ContratosCategoriaModalProps) {
  const [termoBusca, setTermoBusca] = useState("");
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);

  const contratosOrdenados = useMemo(
    () => [...contratos].sort((a, b) => b.valorContrato - a.valorContrato),
    [contratos],
  );
  const exibeBusca = contratos.length > LIMITE_CONTRATOS_PARA_BUSCA;
  const termoNormalizado = normalizarTexto(termoBusca.trim());

  const contratosFiltrados = useMemo(() => {
    if (!exibeBusca || !termoNormalizado) return contratosOrdenados;
    return contratosOrdenados.filter((c) =>
      normalizarTexto(
        `${c.contratoNumero} ${c.fornecedorNome} ${c.objeto ?? ""}`,
      ).includes(termoNormalizado),
    );
  }, [contratosOrdenados, exibeBusca, termoNormalizado]);

  useEffect(() => {
    if (!isOpen) {
      setTermoBusca("");
      setIndiceSelecionado(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || contratoAbrindoId || detalheAberto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndiceSelecionado((i) =>
          Math.min(i + 1, Math.max(contratosFiltrados.length - 1, 0)),
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndiceSelecionado((i) => Math.max(i - 1, 0));
      } else if (
        event.key === "Enter" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        const alvo = contratosFiltrados[indiceSelecionado];
        if (alvo) {
          event.preventDefault();
          onSelectContrato(alvo);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    contratoAbrindoId,
    detalheAberto,
    contratosFiltrados,
    indiceSelecionado,
    onSelectContrato,
  ]);

  const rotuloQuantidade = `${contratos.length} ${contratos.length === 1 ? "contrato" : "contratos"} nesta categoria`;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={categoriaLabel}
      subtitle={fmtCurrency(valorTotal)}
      maxWidth="3xl"
      zIndex="z-50"
      showShareButton={false}
      footer={<p className="text-slate-500 text-xs">{rotuloQuantidade}</p>}
    >
      <div
        aria-hidden="true"
        className="-mt-1 mb-3 flex justify-center sm:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-slate-300" />
      </div>

      {exibeBusca && (
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={termoBusca}
            onChange={(event) => {
              setTermoBusca(event.target.value);
              setIndiceSelecionado(0);
            }}
            placeholder="Buscar por fornecedor, objeto ou número..."
            aria-label="Buscar contratos da categoria"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-slate-900 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {contratosFiltrados.length === 0 ? (
        <div className="space-y-2 py-8 text-center text-slate-500 text-sm">
          <p>Nenhum contrato encontrado para “{termoBusca.trim()}”.</p>
          <button
            type="button"
            onClick={() => setTermoBusca("")}
            className="font-medium text-accent text-sm hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {contratosFiltrados.map((contrato, indice) => {
            const abrindo = contratoAbrindoId === contrato.contratoId;
            const desabilitado = Boolean(contratoAbrindoId) && !abrindo;
            const statusLabel = formatStatusExecucaoLabel(
              educacaoDtoToContratoServicoVigente(contrato).statusExecucao,
            );
            return (
              <li key={contrato.contratoId}>
                <button
                  type="button"
                  disabled={desabilitado}
                  onClick={() => onSelectContrato(contrato)}
                  onMouseEnter={() => setIndiceSelecionado(indice)}
                  data-testid={`contrato-lista-${contrato.contratoNumero}`}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer flex-col gap-1 px-2 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-50",
                    indice === indiceSelecionado && "bg-slate-50",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-500 text-xs">
                      Contrato nº {contrato.contratoNumero}
                    </span>
                    <span className="shrink-0 font-semibold font-serif text-slate-900 text-sm">
                      {abrindo ? (
                        <span className="inline-flex items-center gap-1 font-medium font-sans text-accent text-xs">
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                          Abrindo…
                        </span>
                      ) : (
                        fmtCurrency(contrato.valorContrato)
                      )}
                    </span>
                  </span>
                  <span className="font-medium text-slate-900 text-sm">
                    {contrato.fornecedorNome}
                  </span>
                  <span className="line-clamp-2 text-slate-600 text-xs">
                    {contrato.objeto || "—"}
                  </span>
                  <span className="text-slate-500 text-xs">{statusLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModalDialog>
  );
}
