"use client";

import type { ContratoServicoVigente } from "@transparencia/db";
import {
  Badge,
  type Column,
  DenseTable,
  fmtCpfCnpj,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  ModalDialog,
} from "@transparencia/ui";
import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContratoServicoVigenteCard } from "./contrato-servico-vigente-card";

interface ContratosServicosVigentesSectionProps {
  contratos: ContratoServicoVigente[];
  portalSlug?: string;
  ano?: number;
}

type FilterStatus = "em_execucao" | "concluido" | "inexecutado" | "todos";

export function ContratosServicosVigentesSection({
  contratos,
  portalSlug,
  ano,
}: ContratosServicosVigentesSectionProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("em_execucao");
  const [selectedContrato, setSelectedContrato] =
    useState<ContratoServicoVigente | null>(null);
  const [openedFromSearch, setOpenedFromSearch] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [_loadingDetails, setLoadingDetails] = useState(false);

  const hasCheckedDeepLinkRef = useRef(false);

  const handleOpenContratoDetails = useCallback((c: ContratoServicoVigente) => {
    setSelectedContrato(c);
    setOpenedFromSearch(false);
    if (typeof window !== "undefined") {
      const term = c.contratoNumero || c.contratoServicoId;
      if (term) {
        const url = new URL(window.location.href);
        url.searchParams.set("contratoNumero", term);
        url.hash = "contratos-servicos-vigentes";
        window.history.pushState({}, "", url.pathname + url.search + url.hash);
      }
    }
  }, []);

  const checkAndOpenContrato = useCallback(
    async (
      targetTerm?: string | null,
      searchDetail?: {
        id?: string;
        numero?: string;
        contratoNumero?: string;
        objeto?: string;
        fornecedorNome?: string | null;
        fornecedorCnpj?: string | null;
        valor?: number;
        status?: string | null;
        dataInicio?: string | null;
        vencimentoAtual?: string | null;
        ano?: number;
        portalSlug?: string;
        fromSearch?: boolean;
      },
    ) => {
      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const hash = typeof window !== "undefined" ? window.location.hash : "";

      const term =
        targetTerm ??
        urlParams?.get("contratoNumero") ??
        urlParams?.get("contratoId") ??
        (hash === "#contratos-servicos-vigentes"
          ? urlParams?.get("numero")
          : null);

      if (!term && !searchDetail) {
        setSelectedContrato(null);
        setHighlightedId(null);
        return;
      }

      const cleanTerm = (
        term ??
        searchDetail?.contratoNumero ??
        searchDetail?.numero ??
        searchDetail?.id ??
        ""
      ).trim();
      if (!cleanTerm) return;

      const scrollAndHighlight = (c: ContratoServicoVigente) => {
        const matchedId = c.contratoServicoId || c.contratoNumero || cleanTerm;
        setHighlightedId(matchedId);

        // Se o contrato tem status diferente do filtro corrente, expande para todos
        if (
          statusFilter !== "todos" &&
          (c.statusExecucao || "em_execucao") !== statusFilter
        ) {
          setStatusFilter("todos");
        }

        if (typeof window !== "undefined") {
          const section = document.getElementById(
            "contratos-servicos-vigentes",
          );
          if (section && typeof section.scrollIntoView === "function") {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      };

      // 1. Tentar encontrar nos contratos pré-carregados
      const match = (contratos || []).find((c) => {
        if (!c) return false;
        if (
          searchDetail?.ano &&
          (c.ano ?? ano) &&
          (c.ano ?? ano) !== searchDetail.ano
        ) {
          return false;
        }
        if (c.contratoServicoId && c.contratoServicoId === cleanTerm)
          return true;
        if (c.contratoNumero && c.contratoNumero === cleanTerm) return true;
        if (c.contratoNumero && cleanTerm) {
          return (
            c.contratoNumero.replace(/^0+/, "") === cleanTerm.replace(/^0+/, "")
          );
        }
        return false;
      });

      if (match) {
        setSelectedContrato(match);
        scrollAndHighlight(match);
        return;
      }

      // 2. Buscar via API caso não conste na lista
      const urlAno = urlParams?.get("ano")
        ? Number(urlParams.get("ano"))
        : undefined;
      const targetSlug = searchDetail?.portalSlug || portalSlug;
      const targetAno = searchDetail?.ano || urlAno || ano;

      if (targetSlug) {
        setLoadingDetails(true);
        try {
          const res = await fetch(
            `/api/${encodeURIComponent(targetSlug)}/contratos/details?numero=${encodeURIComponent(cleanTerm)}${targetAno ? `&ano=${targetAno}` : ""}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.contrato) {
              setSelectedContrato(data.contrato);
              scrollAndHighlight(data.contrato);
              return;
            }
          }
        } catch (_err) {
          // fallback gracioso
        } finally {
          setLoadingDetails(false);
        }
      }

      // 3. Fallback com dados da busca
      if (searchDetail) {
        const rawStatus = searchDetail.status || "em_execucao";
        const statusExecucao = (() => {
          if (rawStatus === "inexecutado") return "inexecutado";
          if (rawStatus === "concluido") return "concluido";
          return "em_execucao";
        })();

        const fallbackContrato: ContratoServicoVigente = {
          contratoServicoId: searchDetail.id || cleanTerm,
          portalSlug: targetSlug || "",
          ano: targetAno || new Date().getFullYear(),
          contratoNumero:
            searchDetail.contratoNumero || searchDetail.numero || cleanTerm,
          fornecedorNome: searchDetail.fornecedorNome || "",
          fornecedorCnpj: searchDetail.fornecedorCnpj || "",
          objetoDescricao: searchDetail.objeto || "",
          dataInicio: searchDetail.dataInicio || null,
          vencimentoAtual: searchDetail.vencimentoAtual || null,
          totalEmpenhado: searchDetail.valor || 0,
          totalLiquidado: 0,
          totalPago: 0,
          saldoPendente: searchDetail.valor || 0,
          percentualPago: 0,
          statusExecucao,
        };
        setSelectedContrato(fallbackContrato);
        scrollAndHighlight(fallbackContrato);
      }
    },
    [contratos, portalSlug, ano, statusFilter],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedContrato(null);
    setOpenedFromSearch(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has("contratoNumero") ||
        url.searchParams.has("contratoId")
      ) {
        url.searchParams.delete("contratoNumero");
        url.searchParams.delete("contratoId");
      }
      if (ano) {
        url.searchParams.set("ano", String(ano));
      } else {
        url.searchParams.delete("ano");
      }
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.search ? url.search : "") + (url.hash || ""),
      );
    }
  }, [ano]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!hasCheckedDeepLinkRef.current) {
      hasCheckedDeepLinkRef.current = true;
      checkAndOpenContrato();
    }

    const handleCustomSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{
        numero?: string;
        id?: string;
        contratoNumero?: string;
        fromSearch?: boolean;
        objeto?: string;
        fornecedorNome?: string | null;
        fornecedorCnpj?: string | null;
        valor?: number;
        status?: string | null;
        ano?: number;
        portalSlug?: string;
      }>;
      const term =
        customEvent.detail?.contratoNumero ||
        customEvent.detail?.numero ||
        customEvent.detail?.id;
      if (term) {
        if (customEvent.detail?.fromSearch) {
          setOpenedFromSearch(true);
        }
        checkAndOpenContrato(term, customEvent.detail);
      }
    };

    const handlePopState = () => {
      checkAndOpenContrato();
    };

    window.addEventListener("contrato:selected", handleCustomSelect);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("contrato:selected", handleCustomSelect);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [checkAndOpenContrato]);

  const counts = useMemo(() => {
    if (!Array.isArray(contratos)) {
      return { em_execucao: 0, concluido: 0, inexecutado: 0, todos: 0 };
    }
    const res = {
      em_execucao: 0,
      concluido: 0,
      inexecutado: 0,
      todos: contratos.length,
    };
    for (const c of contratos) {
      const st = c.statusExecucao || "em_execucao";
      if (st in res) {
        res[st as keyof typeof res]++;
      }
    }
    return res;
  }, [contratos]);

  const filteredContratos = useMemo(() => {
    if (!Array.isArray(contratos)) return [];
    if (statusFilter === "todos") return contratos;
    return contratos.filter(
      (c) => (c.statusExecucao || "em_execucao") === statusFilter,
    );
  }, [contratos, statusFilter]);

  const tableData = useMemo(() => {
    if (!Array.isArray(filteredContratos)) return [];
    return filteredContratos.map((c) => ({
      ...c,
      statusLabel: (() => {
        if (c.statusExecucao === "inexecutado") return "Não Executado";
        if (c.statusExecucao === "concluido") return "Concluído";
        return "Em Execução";
      })(),
      vigenciaFormatada: (() => {
        if (c.dataInicio && c.vencimentoAtual) {
          return `${fmtDate(c.dataInicio)} – ${fmtDate(c.vencimentoAtual)}`;
        }
        if (c.vencimentoAtual) {
          return `Até ${fmtDate(c.vencimentoAtual)}`;
        }
        if (c.dataInicio) {
          return `A partir de ${fmtDate(c.dataInicio)}`;
        }
        return "";
      })(),
    }));
  }, [filteredContratos]);

  if ((!contratos || contratos.length === 0) && !selectedContrato) {
    return null;
  }

  const top3 = filteredContratos.slice(0, 3);

  const columns: Column<(typeof tableData)[number]>[] = [
    {
      header: "Fornecedor",
      accessorKey: "fornecedorNome",
      sortable: true,
      className: "min-w-[180px] max-w-[220px]",
      renderCell: (row) => (
        <button
          type="button"
          onClick={() => handleOpenContratoDetails(row)}
          className="cursor-pointer text-left font-medium text-slate-900 hover:text-blue-600 hover:underline"
          title="Ver detalhes do contrato"
        >
          {row.fornecedorNome}
        </button>
      ),
    },
    {
      header: "Objeto",
      accessorKey: "objetoDescricao",
      sortable: true,
      className: "min-w-[220px] max-w-[320px]",
      renderCell: (row) => (
        <div className="space-y-1">
          <p
            className="line-clamp-2 font-normal text-slate-700 text-xs leading-relaxed"
            title={row.objetoDescricao}
          >
            {row.objetoDescricao || "—"}
          </p>
          <button
            type="button"
            onClick={() => handleOpenContratoDetails(row)}
            className="inline-flex cursor-pointer items-center gap-1 font-medium text-blue-600 text-xs hover:text-blue-800 hover:underline"
            title="Abrir detalhes completos do contrato"
          >
            <span>Detalhes</span>
          </button>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "statusLabel",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-700 text-xs",
    },
    {
      header: "Vigência",
      accessorKey: "vigenciaFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-600",
    },
    {
      header: "Empenhado",
      accessorKey: "totalEmpenhado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Liquidado",
      accessorKey: "totalLiquidado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Pago",
      accessorKey: "totalPago",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Saldo Pendente",
      accessorKey: "saldoPendente",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "% Pago",
      accessorKey: "percentualPago",
      format: "percent",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
  ];

  return (
    <section id="contratos-servicos-vigentes" className="scroll-mt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-1 border-ink border-t-2 pt-8 sm:flex-row sm:items-baseline">
        <div>
          <h2 className="font-bold font-serif text-ink text-xl tracking-tight">
            Contratos de Serviços Vigentes
          </h2>
          <p className="text-slate-600 text-xs leading-relaxed sm:text-sm">
            Principais contratos de serviços de terceiros em execução, ordenados
            pelo menor valor pago e maior saldo pendente para evidenciar
            potenciais exposições fiscais.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-borderLine bg-gray-100 px-2.5 py-1 font-medium text-subtleText text-xs">
          {filteredContratos.length} de {contratos.length}{" "}
          {contratos.length === 1 ? "contrato" : "contratos"}
        </span>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-slate-200/80 border-b pb-3">
        <span className="font-semibold text-slate-700 text-xs">
          Status de Execução:
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter("em_execucao")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            statusFilter === "em_execucao"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Em Execução ({counts.em_execucao})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("concluido")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            statusFilter === "concluido"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Concluídos ({counts.concluido})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("inexecutado")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            statusFilter === "inexecutado"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Não Executados ({counts.inexecutado})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("todos")}
          className={`rounded-lg px-3 py-1 font-medium text-xs transition-colors ${
            statusFilter === "todos"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos ({counts.todos})
        </button>
      </div>

      {/* Top 3 Cards Grid */}
      {top3.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top3.map((c, idx) => (
            <ContratoServicoVigenteCard
              key={
                c.contratoServicoId ||
                `${c.fornecedorNome}-${c.fornecedorCnpj}-${idx}`
              }
              contrato={c}
              onOpenDetails={() => handleOpenContratoDetails(c)}
              isHighlighted={
                Boolean(highlightedId) &&
                (c.contratoServicoId === highlightedId ||
                  c.contratoNumero === highlightedId)
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-300 border-dashed p-6 text-center text-slate-500 text-sm">
          Nenhum contrato encontrado para a visão "{statusFilter}".
        </div>
      )}

      {/* Tabela Completa via DenseTable (busca, ordenacao, paginacao, csv, highlight) */}
      <DenseTable
        data={tableData}
        columns={columns}
        renderMobileCard={(row) => (
          <ContratoServicoVigenteCard
            contrato={row}
            onOpenDetails={() => handleOpenContratoDetails(row)}
            isHighlighted={
              Boolean(highlightedId) &&
              (row.contratoServicoId === highlightedId ||
                row.contratoNumero === highlightedId)
            }
          />
        )}
        rowClassName={(row) => {
          const isMatch =
            Boolean(highlightedId) &&
            (row.contratoServicoId === highlightedId ||
              row.contratoNumero === highlightedId);
          return isMatch
            ? "bg-amber-50/70 border-l-4 border-l-amber-500 font-medium"
            : undefined;
        }}
        searchPlaceholder="Buscar por fornecedor, CNPJ ou objeto..."
        searchableKeys={[
          "contratoNumero",
          "fornecedorNome",
          "fornecedorCnpj",
          "objetoDescricao",
        ]}
        pageSize={10}
        sortable={true}
        enableExportCsv={true}
        exportFilename="contratos_servicos_vigentes.csv"
        rowKey="contratoServicoId"
      />

      {/* Modal de Detalhes 360° do Contrato */}
      {selectedContrato && (
        <ModalDialog
          isOpen={Boolean(selectedContrato)}
          onClose={handleCloseModal}
          onBack={openedFromSearch ? handleCloseModal : undefined}
          backLabel="Voltar aos resultados da busca"
          zIndex={openedFromSearch ? "z-[60]" : undefined}
          title={`Contrato nº ${selectedContrato.contratoNumero || "S/N"}`}
          subtitle={selectedContrato.fornecedorNome}
          badge={(() => {
            const status = selectedContrato.statusExecucao;
            if (status === "concluido") {
              return <Badge variant="success">Concluído</Badge>;
            }
            if (status === "inexecutado") {
              return <Badge variant="danger">Não Executado</Badge>;
            }
            return <Badge variant="accent">Em Execução</Badge>;
          })()}
          maxWidth="4xl"
        >
          <div className="space-y-6 py-2">
            {selectedContrato.ano && ano && selectedContrato.ano !== ano && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Este contrato pertence ao exercício de{" "}
                    <strong className="font-semibold">
                      {selectedContrato.ano}
                    </strong>{" "}
                    (você está navegando no painel de{" "}
                    <strong className="font-semibold">{ano}</strong>).
                  </span>
                </div>
                <Link
                  href={`/${portalSlug || "portal"}/licitacoes?ano=${selectedContrato.ano}&contratoNumero=${encodeURIComponent(selectedContrato.contratoNumero || selectedContrato.contratoServicoId || "")}#contratos-servicos-vigentes`}
                  className="inline-flex items-center gap-1 font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 transition-colors hover:text-amber-950"
                >
                  <span>Mudar painel para {selectedContrato.ano}</span>
                </Link>
              </div>
            )}

            {/* Bloco 1: Fornecedor, Órgão, Vigência, Licitação de Origem e Ano */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  Fornecedor
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 text-sm">
                  {selectedContrato.fornecedorNome}
                </p>
                <p className="text-slate-600 text-xs">
                  CNPJ/CPF:{" "}
                  <span className="font-mono text-slate-800">
                    {fmtCpfCnpj(selectedContrato.fornecedorCnpj) ||
                      "Não informado"}
                  </span>
                </p>
                {selectedContrato.orgaoNome && (
                  <p className="mt-1 text-slate-600 text-xs">
                    Órgão Responsável:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedContrato.orgaoNome}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  Vigência Contratual
                </span>
                <p className="mt-0.5 font-medium text-slate-900 text-sm">
                  {(() => {
                    if (
                      selectedContrato.dataInicio &&
                      selectedContrato.vencimentoAtual
                    ) {
                      return `${fmtDate(selectedContrato.dataInicio)} até ${fmtDate(selectedContrato.vencimentoAtual)}`;
                    }
                    if (selectedContrato.vencimentoAtual) {
                      return `Até ${fmtDate(selectedContrato.vencimentoAtual)}`;
                    }
                    if (selectedContrato.dataInicio) {
                      return `A partir de ${fmtDate(selectedContrato.dataInicio)}`;
                    }
                    return "Vigência não informada";
                  })()}
                </p>
                {selectedContrato.ano && (
                  <p className="text-slate-600 text-xs">
                    Exercício de referência:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedContrato.ano}
                    </span>
                  </p>
                )}
                {selectedContrato.licitacaoNumero && (
                  <div className="mt-1 flex items-center gap-1.5 text-slate-600 text-xs">
                    <span>Processo Licitatório:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const licNum = selectedContrato.licitacaoNumero;
                        if (!licNum) return;
                        const contratoNum = selectedContrato.contratoNumero;
                        const contratoAno = selectedContrato.ano;

                        if (typeof window !== "undefined") {
                          const url = new URL(window.location.href);
                          url.searchParams.delete("contratoNumero");
                          url.searchParams.delete("contratoId");
                          url.searchParams.set("numero", licNum);
                          url.hash = "licitacoes-em-andamento";
                          window.history.pushState(
                            {},
                            "",
                            url.pathname + url.search + url.hash,
                          );
                        }

                        setSelectedContrato(null);
                        window.dispatchEvent(
                          new CustomEvent("licitacao:selected", {
                            detail: {
                              numero: licNum,
                              portalSlug,
                              ano: contratoAno,
                              fromContrato: {
                                contratoNumero: contratoNum,
                                ano: contratoAno,
                                portalSlug,
                              },
                            },
                          }),
                        );
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-blue-700 underline decoration-blue-300 hover:text-blue-900 hover:decoration-blue-500"
                      title="Ver detalhes do processo licitatório vinculado"
                    >
                      <span>{selectedContrato.licitacaoNumero}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco de Rastreabilidade Orçamentária e Fonte de Recursos */}
            {(selectedContrato.fontePrincipal ||
              selectedContrato.fontesRecursos ||
              selectedContrato.programaNome ||
              selectedContrato.projetoAtividadeNome) && (
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900 text-xs uppercase tracking-wider">
                    Fonte de Recursos &amp; Destinação Orçamentária
                  </span>
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/_ato2021-2024/2021/lei/l14133.htm#art92"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs hover:underline"
                    title="Art. 92, VIII da Lei 14.133/2021"
                  >
                    <span>Art. 92 da Lei 14.133/21</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>

                {/* Origem dos Recursos */}
                {(selectedContrato.fontePrincipal ||
                  selectedContrato.fontesRecursos) && (
                  <div className="mt-2.5 space-y-1.5">
                    <span className="font-medium text-slate-600 text-xs">
                      Origem dos Recursos:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedContrato.fontePrincipal && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-2.5 py-1 font-semibold text-blue-950 text-xs shadow-2xs">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                          {selectedContrato.fontePrincipal}
                          <span className="rounded bg-blue-100 px-1 py-0.5 font-normal text-[10px] text-blue-800">
                            Principal
                          </span>
                        </span>
                      )}
                      {(() => {
                        const raw = selectedContrato.fontesRecursos ?? "";
                        const allFontes = raw
                          .split(";")
                          .map((f) => f.trim())
                          .filter(
                            (f) =>
                              f.length > 0 &&
                              f !== selectedContrato.fontePrincipal,
                          );
                        if (allFontes.length === 0) return null;
                        return allFontes.map((fonte) => (
                          <span
                            key={fonte}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 font-normal text-slate-700 text-xs"
                          >
                            {fonte}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Destinação Orçamentária / Programática */}
                {(selectedContrato.programaNome ||
                  selectedContrato.projetoAtividadeNome) && (
                  <div className="mt-3.5 grid grid-cols-1 gap-2.5 border-blue-200/60 border-t pt-3 text-xs sm:grid-cols-2">
                    {selectedContrato.programaNome && (
                      <div>
                        <span className="font-medium text-[10px] text-slate-500 uppercase tracking-wider">
                          Programa Orçamentário
                        </span>
                        <p className="mt-0.5 font-medium text-slate-800 leading-snug">
                          {selectedContrato.programaNome}
                        </p>
                      </div>
                    )}
                    {selectedContrato.projetoAtividadeNome && (
                      <div>
                        <span className="font-medium text-[10px] text-slate-500 uppercase tracking-wider">
                          Ação / Projeto-Atividade
                        </span>
                        <p className="mt-0.5 font-medium text-slate-800 leading-snug">
                          {selectedContrato.projetoAtividadeNome}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bloco 2: Objeto Integral */}
            <div className="min-w-0">
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                Objeto Integral do Contrato
              </span>
              <div className="mt-1.5 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 text-sm leading-relaxed shadow-2xs [overflow-wrap:anywhere] [word-break:break-word] sm:p-4">
                {selectedContrato.objetoDescricao || "Objeto não informado."}
              </div>
            </div>

            {/* Bloco 3: Grid de Métricas Fiscais e Execução Financeira */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Execução Financeira e Orçamentária
                </h3>
                {selectedContrato.valorContrato !== undefined &&
                  selectedContrato.valorContrato > 0 && (
                    <div className="flex items-baseline gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50/60 px-3 py-1 text-right">
                      <span className="font-semibold text-[11px] text-blue-900 uppercase tracking-wider">
                        Valor Contratado:
                      </span>
                      <span className="font-bold font-serif text-base text-blue-950 sm:text-lg">
                        {fmtCurrency(selectedContrato.valorContrato)}
                      </span>
                    </div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Empenhado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                    {fmtCurrency(selectedContrato.totalEmpenhado)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Liquidado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                    {fmtCurrency(selectedContrato.totalLiquidado)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Pago
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-emerald-700 sm:text-lg">
                    {fmtCurrency(selectedContrato.totalPago)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Saldo Pendente
                  </span>
                  <p className="mt-1 font-semibold font-serif text-amber-700 text-base sm:text-lg">
                    {fmtCurrency(selectedContrato.saldoPendente)}
                  </p>
                </div>
              </div>

              {/* Barra de Progresso e Percentual Pago */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Percentual Pago da Despesa
                  </span>
                  <span className="font-semibold font-serif text-slate-900 text-sm">
                    {fmtPercent(selectedContrato.percentualPago)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, selectedContrato.percentualPago || 0))}%`,
                    }}
                  />
                </div>
                {selectedContrato.valorAditado !== undefined &&
                  selectedContrato.valorAditado > 0 && (
                    <p className="mt-2.5 text-slate-600 text-xs">
                      Valor Aditado:{" "}
                      <strong className="font-semibold text-slate-800">
                        {fmtCurrency(selectedContrato.valorAditado)}
                      </strong>
                    </p>
                  )}
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
