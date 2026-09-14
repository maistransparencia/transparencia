"use client";

import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import {
  Badge,
  cn,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
} from "@transparencia/ui";
import { Building2, Calendar, Coins, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export interface LicitacoesEmAndamentoSectionProps {
  licitacoes: LicitacaoEmAndamentoDTO[];
  className?: string;
}

export function LicitacoesEmAndamentoSection({
  licitacoes,
  className,
}: LicitacoesEmAndamentoSectionProps) {
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    if (!Array.isArray(licitacoes)) return [];
    return licitacoes;
  }, [licitacoes]);

  const licitacoesFiltradas = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!termo) return lista;

    return lista.filter((item) => {
      const objeto = (item.objeto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const discriminacao = (item.discriminacao || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const numero = (item.licitacaoNumero || "").toLowerCase();
      const entidade = (item.entidadeNome || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const modalidadeRaw = (item.modalidade || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const modalidadeComEspaco = modalidadeRaw.replace(/_/g, " ");

      return (
        objeto.includes(termo) ||
        discriminacao.includes(termo) ||
        numero.includes(termo) ||
        entidade.includes(termo) ||
        modalidadeRaw.includes(termo) ||
        modalidadeComEspaco.includes(termo)
      );
    });
  }, [lista, busca]);

  const totalProcessos = lista.length;
  const totalFiltrados = licitacoesFiltradas.length;

  return (
    <section
      id="licitacoes-em-andamento"
      aria-labelledby="licitacoes-em-andamento-heading"
      className={cn("scroll-mt-6 space-y-4", className)}
    >
      <div className="flex flex-col justify-between gap-2 border-ink border-t-2 pt-8 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="licitacoes-em-andamento-heading"
              className="font-bold font-serif text-slate-900 text-xl"
            >
              Licitações Abertas e em Andamento
            </h2>
            <Badge variant="accent">Radar Preventivo</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-slate-600 text-xs leading-relaxed sm:text-sm">
            Audite preventivamente as compras públicas em andamento antes da
            adjudicação e homologação de contratos pelo município.
          </p>
        </div>
        <span
          className="shrink-0 font-medium text-slate-500 text-xs"
          aria-live="polite"
        >
          {totalProcessos}{" "}
          {totalProcessos === 1 ? "processo em aberto" : "processos em aberto"}
        </span>
      </div>

      {totalProcessos === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
          <p className="font-medium text-slate-700 text-sm">
            Nenhuma licitação em andamento ou aberta encontrada para este
            exercício.
          </p>
          <p className="mt-1 text-slate-400 text-xs">
            Novos editais e processos de contratação publicados pelos órgãos
            municipais aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por objeto da compra, edital ou órgão..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-9 text-slate-800 text-xs placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                aria-label="Buscar licitações em andamento por objeto"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {busca && (
              <span className="text-slate-500 text-xs" aria-live="polite">
                {totalFiltrados}{" "}
                {totalFiltrados === 1
                  ? "processo encontrado"
                  : "processos encontrados"}
              </span>
            )}
          </div>

          {totalFiltrados === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 text-xs">
              Nenhuma licitação encontrada para o termo &ldquo;{busca}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {licitacoesFiltradas.map((item) => {
                const valorExibicao = (() => {
                  const val = item.valorEstimado ?? item.valor;
                  if (typeof val === "number" && val > 0) {
                    return fmtCurrency(val);
                  }
                  return "Valor não divulgado";
                })();

                const dataAberturaTexto = (() => {
                  if (item.dataAbertura) {
                    return fmtDate(item.dataAbertura);
                  }
                  return "Abertura não informada";
                })();

                return (
                  <article
                    key={item.licitacaoId}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold font-mono text-slate-900 text-sm">
                            Processo {item.licitacaoNumero || "S/N"}
                          </span>
                          {item.entidadeNome && (
                            <div className="mt-0.5 flex items-center gap-1 text-slate-500 text-xs">
                              <Building2
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                {item.entidadeNome}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Badge variant="accent">
                            {fmtLicitacaoModalidade(item.modalidade)}
                          </Badge>
                          <Badge variant="warning">Em andamento</Badge>
                        </div>
                      </div>

                      <p
                        className="line-clamp-3 font-medium text-slate-700 text-xs leading-relaxed sm:text-sm"
                        title={item.objeto}
                      >
                        {item.objeto}
                      </p>

                      {item.discriminacao &&
                        item.discriminacao !== item.objeto && (
                          <p className="line-clamp-2 text-slate-500 text-xs italic">
                            {item.discriminacao}
                          </p>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Abertura: {dataAberturaTexto}</span>
                      </div>

                      <div className="flex items-center gap-1 font-bold font-serif text-slate-900">
                        <Coins
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                        <span>{valorExibicao}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
