"use client";

import type {
  SearchLicitacoesResult,
  SearchResultItem,
} from "@transparencia/db";
import { Badge, cn, fmtCurrency, fmtDate } from "@transparencia/ui";
import {
  AlertCircle,
  CornerDownLeft,
  FileCheck,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface LicitacoesSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalSlug: string;
  ano?: number;
  onSelect?: (item: SearchResultItem) => void;
}

const QUICK_SUGGESTIONS = ["0043/24", "Locação", "Veículos", "Saúde"];

export function LicitacoesSpotlightModal({
  isOpen,
  onClose,
  portalSlug,
  ano,
  onSelect,
}: LicitacoesSpotlightModalProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<SearchLicitacoesResult>({
    licitacoes: [],
    contratos: [],
    total: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Lista unificada para navegação por teclado
  const allResults = useMemo(() => {
    return [...results.licitacoes, ...results.contratos];
  }, [results]);

  // Bloqueia scroll do body e reseta estados ao abrir/fechar
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setSearchTerm("");
    setResults({ licitacoes: [], contratos: [], total: 0 });
    setSelectedIndex(0);
    setLoading(false);
    setErrorMessage(null);

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(focusTimer);
      abortControllerRef.current?.abort();
    };
  }, [isOpen]);

  // Busca assíncrona debounced com AbortController
  useEffect(() => {
    const clean = searchTerm.trim();
    if (clean.length < 2) {
      setResults({ licitacoes: [], contratos: [], total: 0 });
      setLoading(false);
      setSelectedIndex(0);
      setErrorMessage(null);
      abortControllerRef.current?.abort();
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({
          q: clean,
          ...(ano ? { ano: String(ano) } : {}),
        });
        const res = await fetch(
          `/api/${encodeURIComponent(portalSlug)}/licitacoes/search?${queryParams.toString()}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(
              "Muitas buscas consecutivas. Por favor, aguarde alguns instantes.",
            );
          }
          throw new Error(
            "Não foi possível consultar os registros de compras públicas.",
          );
        }

        const data: SearchLicitacoesResult = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setErrorMessage(
            err.message || "Erro de conexão ao buscar processos e contratos.",
          );
          setResults({ licitacoes: [], contratos: [], total: 0 });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, portalSlug, ano]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      const isLicitacao = item.tipo === "licitacao";
      const isContrato = item.tipo === "contrato";
      const isSameAno = !item.ano || !ano || item.ano === ano;

      // Se for licitação ou contrato no mesmo ano, mantemos o modal de busca aberto por baixo
      // para permitir navegação em camadas (Master-Detail).
      // Se for outro ano, fechamos a busca para navegar para a página correspondente.
      if (!isSameAno) {
        onClose();
      }

      if (typeof window !== "undefined") {
        if (isContrato) {
          window.dispatchEvent(
            new CustomEvent("contrato:selected", {
              detail: { ...item, fromSearch: true },
            }),
          );
        } else if (isLicitacao) {
          window.dispatchEvent(
            new CustomEvent("licitacao:selected", {
              detail: { ...item, fromSearch: true },
            }),
          );
        }
      }

      if (onSelect) {
        onSelect(item);
      } else if (router) {
        if (isSameAno) {
          window.history.replaceState(null, "", item.href);
        } else {
          router.push(item.href);
        }
      } else if (typeof window !== "undefined") {
        if (isSameAno) {
          window.history.replaceState(null, "", item.href);
        } else {
          window.location.href = item.href;
        }
      }
    },
    [ano, onClose, onSelect, router],
  );

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (allResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allResults.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const currentItem = allResults[selectedIndex];
        if (currentItem) {
          handleSelect(currentItem);
        }
      }
    },
    [allResults, selectedIndex, handleSelect, onClose],
  );

  // Rola até o item selecionado via setas
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedEl && typeof selectedEl.scrollIntoView === "function") {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Busca global de licitações e contratos"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-start sm:p-6 sm:pt-20"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Caixa do modal (Bottom-sheet em mobile, card centralizado em desktop) */}
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl transition-all sm:max-h-[85vh] sm:rounded-2xl">
        {/* Barra superior de arrasto / indicador visual em mobile */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {/* Input Header */}
        <div className="flex items-center gap-3 border-slate-100 border-b px-4 py-3.5 sm:px-5">
          <Search
            className="h-5 w-5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.total > 0}
            aria-controls="search-results-list"
            aria-activedescendant={
              allResults[selectedIndex]
                ? `search-item-${allResults[selectedIndex].id}`
                : undefined
            }
            aria-label="Buscar licitações e contratos"
            placeholder="Buscar por objeto, número do processo (ex: 0043/24) ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-slate-800 text-sm outline-hidden placeholder:text-slate-400 sm:text-base"
          />

          {loading && (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-accent"
              aria-label="Carregando resultados"
            />
          )}

          {searchTerm && !loading && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setErrorMessage(null);
                inputRef.current?.focus();
              }}
              className="rounded-full bg-slate-200/80 p-1 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700"
              aria-label="Limpar termo de busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Botão de Fechar persistente no mobile */}
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-slate-600 text-sm transition-colors hover:text-slate-900 sm:hidden"
          >
            Cancelar
          </button>

          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium font-mono text-[10px] text-slate-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Banner de Erro (429/500) */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-3 mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Corpo de Resultados */}
        <div
          ref={listRef}
          id="search-results-list"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto p-2 sm:p-3"
        >
          {/* Sugestões Iniciais quando termo < 2 */}
          {searchTerm.trim().length < 2 && (
            <div className="px-4 py-8 text-center">
              <p className="text-slate-500 text-sm">
                Digite ao menos 2 caracteres para buscar por objeto, número de
                processo ou fornecedor.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-slate-400 text-xs">
                  Exemplos rápidos:
                </span>
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setSearchTerm(sug);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 text-xs hover:border-accent hover:bg-accent/5 hover:text-accent"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estado Vazio */}
          {searchTerm.trim().length >= 2 &&
            !loading &&
            !errorMessage &&
            results.total === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="font-medium text-slate-700 text-sm">
                  Nenhum processo ou contrato encontrado para &ldquo;
                  {searchTerm}&rdquo;.
                </p>
                <p className="mt-1 text-slate-400 text-xs">
                  Tente buscar por termos mais genéricos, objeto ou número de
                  processo (ex: 0043/24).
                </p>
              </div>
            )}

          {/* Seção 1: Licitações Encontradas */}
          {results.licitacoes.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                Licitações Encontradas ({results.licitacoes.length})
              </div>
              <div className="space-y-1">
                {results.licitacoes.map((item) => {
                  const globalIdx = allResults.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      type="button"
                      key={`lic-${item.id}`}
                      id={`search-item-${item.id}`}
                      data-index={globalIdx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={cn(
                        "flex w-full cursor-pointer items-start justify-between gap-3 overflow-hidden rounded-xl p-3 text-left transition-colors",
                        isSelected
                          ? "bg-accent/10 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <FileText
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isSelected ? "text-accent" : "text-slate-400",
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {item.numero || "S/N"}
                            </span>
                            <Badge variant="accent">
                              {item.modalidade || "Licitação"}
                            </Badge>
                            {item.status && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {item.status}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              · {item.ano}
                            </span>
                          </div>
                          {item.fornecedorNome && (
                            <p className="mt-0.5 line-clamp-2 break-words font-medium text-slate-700 text-xs">
                              {item.fornecedorNome.includes(";")
                                ? "Fornecedores homologados:"
                                : "Fornecedor:"}{" "}
                              {item.fornecedorNome}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 break-words text-slate-600 text-xs leading-relaxed">
                            {item.objeto}
                          </p>
                        </div>
                      </div>

                      <div className="ml-2 shrink-0 text-right">
                        <span className="whitespace-nowrap font-medium font-serif text-slate-900 text-xs sm:text-sm">
                          {item.valor > 0 ? fmtCurrency(item.valor) : "—"}
                        </span>
                        {isSelected && (
                          <div className="mt-1 flex items-center justify-end text-[10px] text-accent">
                            <CornerDownLeft className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção 2: Contratos */}
          {results.contratos.length > 0 && (
            <div>
              <div className="px-3 py-1.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                Contratos ({results.contratos.length})
              </div>
              <div className="space-y-1">
                {results.contratos.map((item) => {
                  const globalIdx = allResults.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  const isAnoAnterior =
                    item.ano > 0 &&
                    ((ano && item.ano < ano) ||
                      (!ano && item.ano < new Date().getFullYear()));
                  const isContratoVigenteAnoAnterior =
                    item.status === "vigente" && isAnoAnterior;

                  return (
                    <button
                      type="button"
                      key={`ctr-${item.id}`}
                      id={`search-item-${item.id}`}
                      data-index={globalIdx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={cn(
                        "flex w-full cursor-pointer items-start justify-between gap-3 overflow-hidden rounded-xl p-3 text-left transition-colors",
                        isSelected
                          ? "bg-accent/10 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <FileCheck
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isSelected ? "text-accent" : "text-slate-400",
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                              Contrato {item.numero || "S/N"}
                            </span>
                            <Badge variant="default">
                              {item.modalidade || "Contrato"}
                            </Badge>
                            {item.status && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px]",
                                  item.status === "vigente"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {item.status === "vigente"
                                  ? "Vigente"
                                  : "Encerrado"}
                              </span>
                            )}
                            {isContratoVigenteAnoAnterior ? (
                              <Badge variant="warning">
                                Celebrado em {item.anoCelebracao ?? item.ano}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                · {item.ano}
                              </span>
                            )}
                          </div>
                          {item.fornecedorNome && (
                            <p className="mt-0.5 break-words font-medium text-slate-700 text-xs">
                              Fornecedor: {item.fornecedorNome}
                            </p>
                          )}
                          {isContratoVigenteAnoAnterior &&
                            (item.dataInicio || item.vencimentoAtual) && (
                              <p className="mt-0.5 font-medium text-amber-800 text-xs">
                                {(() => {
                                  if (item.dataInicio && item.vencimentoAtual) {
                                    return `Vigência: ${fmtDate(item.dataInicio)} a ${fmtDate(item.vencimentoAtual)}`;
                                  }
                                  if (item.vencimentoAtual) {
                                    return `Vigência até ${fmtDate(item.vencimentoAtual)}`;
                                  }
                                  return `Vigência a partir de ${fmtDate(item.dataInicio)}`;
                                })()}
                              </p>
                            )}
                          <p className="mt-1 line-clamp-2 break-words text-slate-600 text-xs leading-relaxed">
                            {item.objeto}
                          </p>
                        </div>
                      </div>

                      <div className="ml-2 shrink-0 text-right">
                        <span className="whitespace-nowrap font-medium font-serif text-slate-900 text-xs sm:text-sm">
                          {item.valor > 0 ? fmtCurrency(item.valor) : "—"}
                        </span>
                        {isSelected && (
                          <div className="mt-1 flex items-center justify-end text-[10px] text-accent">
                            <CornerDownLeft className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com atalhos e contagem amigável (sem ternários aninhados) */}
        <div className="flex items-center justify-center border-slate-100 border-t bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500 sm:justify-between">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>{" "}
              para navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              para selecionar
            </span>
          </div>
          <span className="text-slate-400">
            {(() => {
              if (allResults.length === 0) {
                return "Busca unificada de compras públicas";
              }
              if (allResults.length === 1) {
                return "1 resultado encontrado";
              }
              return `${allResults.length} resultados encontrados`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
