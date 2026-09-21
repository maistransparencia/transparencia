"use client";

import type {
  LicitacaoEmAndamentoDTO,
  LicitacaoItemDTO,
} from "@transparencia/db";
import {
  Badge,
  type Column,
  cn,
  DenseTable,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
  fmtLicitacaoSituacao,
  ModalDialog,
  TruncatedCellWithModal,
} from "@transparencia/ui";
import { Calendar, Coins, ExternalLink, Package } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export { fmtLicitacaoSituacao };

export interface LicitacoesEmAndamentoSectionProps {
  licitacoes: LicitacaoEmAndamentoDTO[];
  itensByLicitacao?: Record<string, LicitacaoItemDTO[]>;
  className?: string;
}

export interface LicitacaoTableRow extends LicitacaoEmAndamentoDTO {
  modalidadeFormatada: string;
  situacaoFormatada: string;
  valorFinal: number | null;
  buscaNormalizada: string;
}

function getFonteObjetoBadge(fonteObjeto?: string | null): string | undefined {
  if (fonteObjeto === "pncp") return "PNCP";
  if (fonteObjeto === "contrato_local") return "Contrato Local";
  return undefined;
}

export function LicitacoesEmAndamentoSection({
  licitacoes = [],
  itensByLicitacao,
  className,
}: LicitacoesEmAndamentoSectionProps) {
  const [selectedLicitacaoForItens, setSelectedLicitacaoForItens] =
    useState<LicitacaoTableRow | null>(null);
  const [highlightedNumero, setHighlightedNumero] = useState<string | null>(
    null,
  );
  const hasCheckedDeepLinkRef = useRef(false);

  // Ordena primeiro por valor decrescente (destaque para compras mais caras)
  const sortedByRelevance = useMemo(() => {
    return [...licitacoes].sort((a, b) => {
      const valA = a.valorEstimado ?? a.valor ?? 0;
      const valB = b.valorEstimado ?? b.valor ?? 0;
      if (valB !== valA) return valB - valA;
      const dataA = a.dataAbertura ?? "";
      const dataB = b.dataAbertura ?? "";
      return dataB.localeCompare(dataA);
    });
  }, [licitacoes]);

  // Top 4 para cards de destaque
  const topDestaques = useMemo(() => {
    return sortedByRelevance.slice(0, 4);
  }, [sortedByRelevance]);

  // Mapeamento enriquecido para a tabela
  const tableData: LicitacaoTableRow[] = useMemo(() => {
    return sortedByRelevance.map((item) => {
      const valorNum = item.valorEstimado ?? item.valor ?? null;
      const modalidadeFmt = fmtLicitacaoModalidade(item.modalidade);
      const situacaoFmt = fmtLicitacaoSituacao(item.situacao);

      const situacaoNorm = (item.situacao || "em andamento")
        .toLowerCase()
        .trim();
      const termosSituacao = (() => {
        if (
          situacaoNorm === "em_andamento" ||
          situacaoNorm === "em andamento" ||
          situacaoNorm === "andamento"
        ) {
          return ["em andamento", "andamento"];
        }
        if (situacaoNorm === "aberta" || situacaoNorm === "em aberto") {
          return ["aberta", "em aberto"];
        }
        return [situacaoNorm, situacaoNorm.replace(/_/g, " ")];
      })();

      // Normaliza termos de busca para suportar consultas sem acentuação e formatos alternativos
      const buscaNorm = [
        item.objeto,
        item.discriminacao,
        item.licitacaoNumero,
        item.entidadeNome,
        item.modalidade,
        item.modalidade ? item.modalidade.replace(/_/g, " ") : "",
        modalidadeFmt,
        situacaoFmt,
        item.fonteObjeto,
        ...termosSituacao,
        item.ano ? String(item.ano) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return {
        ...item,
        modalidadeFormatada: modalidadeFmt,
        situacaoFormatada: situacaoFmt,
        valorFinal:
          typeof valorNum === "number" && valorNum > 0 ? valorNum : null,
        buscaNormalizada: buscaNorm,
      };
    });
  }, [sortedByRelevance]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tableData.length === 0) return;

    const checkAndOpenLicitacao = (targetNumero?: string | null) => {
      const urlParams = new URLSearchParams(window.location.search);
      const numero = targetNumero ?? urlParams.get("numero");
      if (!numero) return;

      setHighlightedNumero(numero);
      const cleanNum = numero.trim();
      const match = tableData.find((t) => {
        if (!t) return false;
        if (t.licitacaoNumero === cleanNum || t.licitacaoId === cleanNum)
          return true;
        if (t.licitacaoNumero && cleanNum) {
          return (
            t.licitacaoNumero.replace(/^0+/, "") === cleanNum.replace(/^0+/, "")
          );
        }
        return false;
      });

      if (match) {
        setSelectedLicitacaoForItens(match);
      }
    };

    if (!hasCheckedDeepLinkRef.current) {
      hasCheckedDeepLinkRef.current = true;
      checkAndOpenLicitacao();
    }

    const handleCustomSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ numero?: string; id?: string }>;
      const num = customEvent.detail?.numero || customEvent.detail?.id;
      if (num) {
        checkAndOpenLicitacao(num);
      }
    };

    const handlePopState = () => {
      checkAndOpenLicitacao();
    };

    window.addEventListener("licitacao:selected", handleCustomSelect);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("licitacao:selected", handleCustomSelect);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [tableData]);

  const columns: Column<LicitacaoTableRow>[] = [
    {
      header: "Processo",
      accessorKey: "licitacaoNumero",
      sortable: true,
      className: "whitespace-nowrap font-semibold text-slate-900",
      renderCell: (row) => (
        <div className="space-y-1">
          <span className="font-semibold text-slate-900">
            {row.licitacaoNumero || "S/N"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {row.linkSistemaOrigem && (
              <a
                href={row.linkSistemaOrigem}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                title="Acessar sala de disputa pública oficial"
              >
                <span>Disputa</span>
                <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setSelectedLicitacaoForItens(row)}
              className="inline-flex items-center gap-0.5 font-medium text-[11px] text-slate-500 hover:text-slate-800"
              title="Visualizar itens licitados"
            >
              <Package className="h-2.5 w-2.5" aria-hidden="true" />
              <span>Itens</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      header: "Órgão",
      accessorKey: "entidadeNome",
      sortable: true,
      className: "min-w-[150px] max-w-[220px] truncate text-slate-700",
      renderCell: (row) => row.entidadeNome || "—",
    },
    {
      header: "Modalidade",
      accessorKey: "modalidadeFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap",
      renderCell: (row) => (
        <Badge variant="accent">{row.modalidadeFormatada}</Badge>
      ),
    },
    {
      header: "Objeto",
      accessorKey: "objeto",
      sortable: true,
      className: "min-w-[220px] max-w-[340px] text-slate-700",
      renderCell: (row) => (
        <TruncatedCellWithModal
          text={row.objeto}
          modalTitle={`Processo ${row.licitacaoNumero || "S/N"} — Objeto da Licitação`}
          characterThreshold={120}
          maxLines={2}
          badge={getFonteObjetoBadge(row.fonteObjeto)}
          secondaryText={
            row.discriminacao && row.discriminacao !== row.objeto
              ? row.discriminacao
              : undefined
          }
          externalUrl={row.linkSistemaOrigem}
          externalLabel="Sala de Disputa"
        />
      ),
    },
    {
      header: "Abertura",
      accessorKey: "dataAbertura",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-600",
      renderCell: (row) =>
        row.dataAbertura ? fmtDate(row.dataAbertura) : "Não informada",
    },
    {
      header: "Valor Estimado",
      accessorKey: "valorFinal",
      sortable: true,
      align: "right",
      isSerifNumeric: true,
      renderCell: (row) => {
        if (typeof row.valorFinal === "number" && row.valorFinal > 0) {
          return (
            <span className="font-bold font-serif text-slate-900">
              {fmtCurrency(row.valorFinal)}
            </span>
          );
        }
        return (
          <span className="text-slate-400 text-xs italic">Não divulgado</span>
        );
      },
      exportValue: (row) => (row.valorFinal !== null ? row.valorFinal : ""),
    },
    {
      header: "Homologado",
      accessorKey: "valorHomologado",
      sortable: true,
      align: "right",
      isSerifNumeric: true,
      renderCell: (row) => {
        if (
          typeof row.valorHomologado === "number" &&
          row.valorHomologado > 0
        ) {
          const valorEst = row.valorFinal;
          const economia =
            valorEst && row.valorHomologado < valorEst
              ? ((valorEst - row.valorHomologado) / valorEst) * 100
              : null;

          return (
            <div className="space-y-0.5 text-right">
              <span className="font-bold font-serif text-emerald-700">
                {fmtCurrency(row.valorHomologado)}
              </span>
              {economia !== null && (
                <div className="flex justify-end">
                  <span className="inline-block rounded bg-emerald-50 px-1 py-0.5 font-semibold text-[10px] text-emerald-700">
                    -{Math.round(economia)}%
                  </span>
                </div>
              )}
            </div>
          );
        }
        return <span className="text-slate-400 text-xs italic">Pendente</span>;
      },
      exportValue: (row) => (row.valorHomologado ? row.valorHomologado : ""),
    },
    {
      header: "Situação",
      accessorKey: "situacaoFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap",
      renderCell: (row) => (
        <Badge variant="warning">{row.situacaoFormatada}</Badge>
      ),
    },
  ];

  const renderLicitacaoMobileCard = (row: LicitacaoTableRow) => {
    const isHighlighted =
      highlightedNumero &&
      (row.licitacaoNumero === highlightedNumero ||
        row.licitacaoId === highlightedNumero);
    const valorEst = row.valorEstimado ?? row.valorFinal;
    const valorHom = row.valorHomologado;
    const economia =
      valorEst && valorHom && valorHom < valorEst
        ? ((valorEst - valorHom) / valorEst) * 100
        : null;

    return (
      <article
        id={`licitacao-card-${row.licitacaoNumero || row.licitacaoId}`}
        className={cn(
          "flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all",
          isHighlighted && "animate-pulse ring-2 ring-accent ring-offset-2",
        )}
      >
        <div className="space-y-3">
          {/* Linha 1: Badges horizontais com wrap */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="accent">{row.modalidadeFormatada}</Badge>
            <Badge variant="warning">{row.situacaoFormatada}</Badge>
            {row.fonteObjeto === "pncp" && (
              <span
                className="inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-[10px] text-emerald-700"
                title="Objeto des-truncado via PNCP"
              >
                PNCP
              </span>
            )}
            {row.fonteObjeto === "contrato_local" && (
              <span
                className="inline-block rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-[10px] text-indigo-700"
                title="Objeto des-truncado via contrato local"
              >
                Contrato Local
              </span>
            )}
          </div>

          {/* Linha 2: Processo e Órgão empilhados verticalmente */}
          <div>
            <span className="font-bold text-slate-900 text-sm">
              Processo {row.licitacaoNumero || "S/N"}
            </span>
            {row.entidadeNome && (
              <p className="mt-0.5 truncate text-slate-500 text-xs">
                {row.entidadeNome}
              </p>
            )}
          </div>

          {/* Linha 3: Objeto com modal */}
          <div>
            <TruncatedCellWithModal
              text={row.objeto}
              modalTitle={`Processo ${row.licitacaoNumero || "S/N"} — Objeto da Licitação`}
              characterThreshold={120}
              maxLines={3}
              badge={getFonteObjetoBadge(row.fonteObjeto)}
              secondaryText={
                row.discriminacao && row.discriminacao !== row.objeto
                  ? row.discriminacao
                  : undefined
              }
              externalUrl={row.linkSistemaOrigem}
              externalLabel="Sala de Disputa"
            />
          </div>

          {/* Linha 4: Data de abertura */}
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Abertura:{" "}
              {row.dataAbertura ? fmtDate(row.dataAbertura) : "Não informada"}
            </span>
          </div>

          {/* Linha 5: Grade financeira 2 colunas */}
          <div className="grid grid-cols-2 gap-2 border-slate-100 border-t pt-2.5 text-xs">
            <div>
              <span className="block text-[11px] text-slate-400">
                Valor Estimado
              </span>
              <div className="mt-0.5 flex items-center gap-1 font-bold font-serif text-slate-900">
                <Coins
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {valorEst ? fmtCurrency(valorEst) : "Não divulgado"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-400">
                Homologado
              </span>
              {valorHom ? (
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <span className="font-bold font-serif text-emerald-700">
                    {fmtCurrency(valorHom)}
                  </span>
                  {economia !== null && (
                    <span className="inline-block rounded bg-emerald-50 px-1 py-0.5 font-semibold text-[10px] text-emerald-700">
                      -{Math.round(economia)}%
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-0.5 flex justify-end">
                  <span
                    className="inline-block rounded bg-amber-50 px-1.5 py-0.5 font-medium text-[10px] text-amber-800"
                    title="Em disputa pública ou aguardando adjudicação/homologação"
                  >
                    Em disputa
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linha 6: Ações no rodapé */}
        <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedLicitacaoForItens(row)}
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
          >
            <Package
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <span>Ver Itens Licitados</span>
          </button>

          {row.linkSistemaOrigem && (
            <a
              href={row.linkSistemaOrigem}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100"
            >
              <span>Sala de Disputa</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </article>
    );
  };

  const totalProcessos = licitacoes.length;

  return (
    <section
      id="licitacoes-em-andamento"
      aria-labelledby="licitacoes-em-andamento-heading"
      className={cn("scroll-mt-6 space-y-6", className)}
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col justify-between gap-2 border-ink border-t-2 pt-8 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="licitacoes-em-andamento-heading"
              className="font-bold font-serif text-slate-900 text-xl"
            >
              Licitações Abertas e em Andamento
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-slate-600 text-xs leading-relaxed sm:text-sm">
            Audite preventivamente as compras públicas em andamento antes da
            adjudicação e homologação de contratos pelo município. Descrições e
            itens são enriquecidos e integrados diretamente com o{" "}
            <a
              href="https://pncp.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              PNCP (Portal Nacional de Contratações Públicas)
              <ExternalLink className="inline h-3 w-3" />
            </a>
            , com fundamento no{" "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art174"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              Art. 174 da Lei 14.133/2021
              <ExternalLink className="inline h-3 w-3" />
            </a>
            , e cruzados com os contratos locais para eliminação de
            truncamentos.
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
        <div className="space-y-6">
          {/* Top Destaques Cards Grid (4 itens em 2 colunas) */}
          {topDestaques.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-xs tracking-wider">
                  Processos em Destaque por Relevância
                </h3>
                <span className="text-slate-400 text-xs">
                  {topDestaques.length === 1
                    ? "Maior valor estimado"
                    : `Top ${topDestaques.length} de maior valor`}
                </span>
              </div>
              <div
                data-testid="top-destaques-grid"
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                {topDestaques.map((item) => {
                  const valorEst = item.valorEstimado ?? item.valor;
                  const valorHom = item.valorHomologado;
                  const economia = (() => {
                    if (valorEst && valorHom && valorHom < valorEst) {
                      return ((valorEst - valorHom) / valorEst) * 100;
                    }
                    return null;
                  })();

                  const dataAberturaTexto = item.dataAbertura
                    ? fmtDate(item.dataAbertura)
                    : "Abertura não informada";

                  return (
                    <article
                      key={item.licitacaoId}
                      className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Linha 1: Badges horizontais com wrap */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="accent">
                            {fmtLicitacaoModalidade(item.modalidade)}
                          </Badge>
                          <Badge variant="warning">
                            {fmtLicitacaoSituacao(item.situacao)}
                          </Badge>
                          {item.fonteObjeto === "pncp" && (
                            <span
                              className="inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-[10px] text-emerald-700"
                              title="Objeto des-truncado via PNCP"
                            >
                              PNCP
                            </span>
                          )}
                          {item.fonteObjeto === "contrato_local" && (
                            <span
                              className="inline-block rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-[10px] text-indigo-700"
                              title="Objeto des-truncado via contrato local"
                            >
                              Contrato Local
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Processo e Órgão empilhados verticalmente */}
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            Processo {item.licitacaoNumero || "S/N"}
                          </span>
                          {item.entidadeNome && (
                            <p className="mt-0.5 truncate text-slate-500 text-xs">
                              {item.entidadeNome}
                            </p>
                          )}
                        </div>

                        {/* Linha 3: Objeto com modal */}
                        <div>
                          <TruncatedCellWithModal
                            text={item.objeto}
                            modalTitle={`Processo ${item.licitacaoNumero || "S/N"} — Objeto da Licitação`}
                            characterThreshold={120}
                            maxLines={3}
                            badge={getFonteObjetoBadge(item.fonteObjeto)}
                            secondaryText={
                              item.discriminacao &&
                              item.discriminacao !== item.objeto
                                ? item.discriminacao
                                : undefined
                            }
                            externalUrl={item.linkSistemaOrigem}
                            externalLabel="Sala de Disputa"
                          />
                        </div>

                        {/* Linha 4: Data de abertura */}
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Calendar
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Abertura: {dataAberturaTexto}</span>
                        </div>

                        {/* Linha 5: Grade financeira 2 colunas */}
                        <div className="grid grid-cols-2 gap-2 border-slate-100 border-t pt-2.5 text-xs">
                          <div>
                            <span className="block text-[11px] text-slate-400">
                              Valor Estimado
                            </span>
                            <div className="mt-0.5 flex items-center gap-1 font-bold font-serif text-slate-900">
                              <Coins
                                className="h-3.5 w-3.5 text-slate-400"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                {valorEst
                                  ? fmtCurrency(valorEst)
                                  : "Não divulgado"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-[11px] text-slate-400">
                              Homologado
                            </span>
                            {valorHom ? (
                              <div className="mt-0.5 flex items-center justify-end gap-1">
                                <span className="font-bold font-serif text-emerald-700">
                                  {fmtCurrency(valorHom)}
                                </span>
                                {economia !== null && (
                                  <span className="inline-block rounded bg-emerald-50 px-1 py-0.5 font-semibold text-[10px] text-emerald-700">
                                    -{Math.round(economia)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="mt-0.5 flex justify-end">
                                <span
                                  className="inline-block rounded bg-amber-50 px-1.5 py-0.5 font-medium text-[10px] text-amber-800"
                                  title="Em disputa pública ou aguardando adjudicação/homologação"
                                >
                                  Em disputa
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Linha 6: Ações no rodapé */}
                      <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLicitacaoForItens(
                              item as LicitacaoTableRow,
                            )
                          }
                          className="inline-flex items-center gap-1 font-medium text-slate-600 transition-colors hover:text-slate-900"
                        >
                          <Package
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          <span>Ver Itens Licitados</span>
                        </button>

                        {item.linkSistemaOrigem && (
                          <a
                            href={item.linkSistemaOrigem}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            title="Acessar sala de disputa pública externa"
                          >
                            <span>Sala de Disputa</span>
                            <ExternalLink
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela Completa via DenseTable */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 text-xs tracking-wider">
                Relação Completa de Licitações em Aberto
              </h3>
            </div>
            <DenseTable
              data={tableData}
              columns={columns}
              renderMobileCard={renderLicitacaoMobileCard}
              searchPlaceholder="Buscar por objeto, edital, órgão, modalidade ou situação..."
              searchableKeys={[
                "objeto",
                "discriminacao",
                "licitacaoNumero",
                "entidadeNome",
                "modalidadeFormatada",
                "situacaoFormatada",
                "situacao",
                "buscaNormalizada",
              ]}
              pageSize={10}
              sortable={true}
              defaultSortKey="valorFinal"
              defaultSortDir="desc"
              enableExportCsv={true}
              exportFilename="licitacoes_em_andamento.csv"
              recordLabel="licitações"
              rowKey="licitacaoId"
            />
          </div>
        </div>
      )}

      {/* Diálogo / Modal de Itens Licitados via ModalDialog */}
      <ModalDialog
        isOpen={!!selectedLicitacaoForItens}
        onClose={() => setSelectedLicitacaoForItens(null)}
        title={`Itens Licitados — Processo ${selectedLicitacaoForItens?.licitacaoNumero || "S/N"}`}
        subtitle={selectedLicitacaoForItens?.objeto}
        maxWidth="4xl"
        footer={
          selectedLicitacaoForItens ? (
            <div className="flex w-full items-center justify-between text-xs">
              <span className="text-slate-500">
                {itensByLicitacao?.[selectedLicitacaoForItens.licitacaoNumero]
                  ?.length || 0}{" "}
                itens listados
              </span>
              {selectedLicitacaoForItens.linkSistemaOrigem && (
                <a
                  href={selectedLicitacaoForItens.linkSistemaOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>Abrir Sala de Disputa</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedLicitacaoForItens &&
          (() => {
            const itens =
              itensByLicitacao?.[selectedLicitacaoForItens.licitacaoNumero] ??
              [];
            if (itens.length === 0) {
              return (
                <div className="py-12 text-center">
                  <Package
                    className="mx-auto h-10 w-10 text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-medium text-slate-700 text-sm">
                    Nenhum item individual cadastrado para este processo.
                  </p>
                  <p className="mt-1 text-slate-400 text-xs">
                    Os detalhes da contratação podem ser consultados no edital
                    completo ou na sala de disputa pública.
                  </p>
                  {selectedLicitacaoForItens.linkSistemaOrigem && (
                    <div className="mt-4">
                      <a
                        href={selectedLicitacaoForItens.linkSistemaOrigem}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700"
                      >
                        <span>Acessar Sala de Disputa no PNCP</span>
                        <ExternalLink
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </a>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-600 text-xs">
                  <thead className="border-slate-200 border-b bg-slate-100/75 font-semibold text-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-center">Item</th>
                      <th className="px-3 py-2">Descrição</th>
                      <th className="px-3 py-2 text-center">Qtd / Un</th>
                      <th className="px-3 py-2 text-right">Valor Estimado</th>
                      <th className="px-3 py-2 text-right">Homologado</th>
                      <th className="px-3 py-2 text-center">Desconto</th>
                      <th className="px-3 py-2">Fornecedor Vencedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((it) => (
                      <tr key={it.itemId} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                          {it.numeroItem}
                        </td>
                        <td className="min-w-[200px] px-3 py-2.5 font-medium text-slate-800">
                          {it.descricao || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-center">
                          {it.quantidade != null ? it.quantidade : "—"}{" "}
                          {it.unidadeMedida || ""}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-serif">
                          {(() => {
                            const valorExibicao =
                              it.valorTotalEstimado ??
                              (it.valorUnitarioEstimado != null &&
                              it.quantidade != null
                                ? it.valorUnitarioEstimado * it.quantidade
                                : it.valorUnitarioEstimado);
                            if (valorExibicao != null) {
                              return (
                                <>
                                  <span>{fmtCurrency(valorExibicao)}</span>
                                  {it.quantidade != null &&
                                    it.quantidade > 1 &&
                                    it.valorUnitarioEstimado != null && (
                                      <span className="block font-sans text-[10px] text-slate-400">
                                        {fmtCurrency(it.valorUnitarioEstimado)}{" "}
                                        / un
                                      </span>
                                    )}
                                </>
                              );
                            }
                            return "—";
                          })()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold font-serif text-slate-900">
                          {(() => {
                            const valorExibicao =
                              it.valorTotalHomologado ??
                              (it.valorUnitarioHomologado != null &&
                              it.quantidade != null
                                ? it.valorUnitarioHomologado * it.quantidade
                                : it.valorUnitarioHomologado);
                            if (valorExibicao != null) {
                              return (
                                <>
                                  <span>{fmtCurrency(valorExibicao)}</span>
                                  {it.quantidade != null &&
                                    it.quantidade > 1 &&
                                    it.valorUnitarioHomologado != null && (
                                      <span className="block font-normal font-sans text-[10px] text-slate-400">
                                        {fmtCurrency(
                                          it.valorUnitarioHomologado,
                                        )}{" "}
                                        / un
                                      </span>
                                    )}
                                </>
                              );
                            }
                            return "—";
                          })()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-center">
                          {it.percentualDesconto != null ? (
                            <span className="font-semibold text-emerald-700">
                              {it.percentualDesconto}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="min-w-[150px] px-3 py-2.5">
                          {it.fornecedorNome ? (
                            <div>
                              <span className="font-medium text-slate-800">
                                {it.fornecedorNome}
                              </span>
                              {it.fornecedorCpfCnpj && (
                                <span className="block text-[10px] text-slate-400">
                                  {it.fornecedorCpfCnpj}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              Pendente / Não homologado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
      </ModalDialog>
    </section>
  );
}
