"use client";

import { BProgress } from "@bprogress/core";
import type { ContratoServicoVigente } from "@transparencia/db";
import {
  type Column,
  cn,
  DenseTable,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  SegmentedButton,
} from "@transparencia/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContratoDetalhesModal } from "./contrato-detalhes-modal";
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("contrato:loaded", { detail: { id: cleanTerm } }),
          );
          BProgress.done();
        }
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
        if (typeof window !== "undefined") {
          BProgress.start();
        }
        try {
          const res = await fetch(
            `/api/${encodeURIComponent(targetSlug)}/contratos/details?numero=${encodeURIComponent(cleanTerm)}${targetAno ? `&ano=${targetAno}` : ""}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.contrato) {
              setSelectedContrato(data.contrato);
              scrollAndHighlight(data.contrato);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("contrato:loaded", {
                    detail: { id: cleanTerm },
                  }),
                );
              }
              return;
            }
          }
        } catch (_err) {
          // fallback gracioso
        } finally {
          setLoadingDetails(false);
          if (typeof window !== "undefined") {
            BProgress.done();
          }
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("contrato:loaded", { detail: { id: cleanTerm } }),
          );
          BProgress.done();
        }
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
          className="cursor-pointer text-left font-medium text-ink hover:text-blue-600 hover:underline"
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
            className="line-clamp-2 font-normal text-ink text-xs leading-relaxed"
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
      className: "whitespace-nowrap font-medium text-ink text-xs",
    },
    {
      header: "Vigência",
      accessorKey: "vigenciaFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-mute2",
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
          <p className="text-mute2 text-xs leading-relaxed sm:text-sm">
            Principais contratos de serviços de terceiros em execução, ordenados
            pelo menor valor pago e maior saldo pendente para evidenciar
            potenciais exposições fiscais.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-medium text-mute2 text-xs">
          {filteredContratos.length} de {contratos.length}{" "}
          {contratos.length === 1 ? "contrato" : "contratos"}
        </span>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-line border-b pb-3">
        <span className="font-semibold text-ink text-xs">
          Status de Execução:
        </span>
        <SegmentedButton
          onClick={() => setStatusFilter("em_execucao")}
          active={statusFilter === "em_execucao"}
          size="sm"
        >
          Em Execução ({counts.em_execucao})
        </SegmentedButton>
        <SegmentedButton
          onClick={() => setStatusFilter("concluido")}
          active={statusFilter === "concluido"}
          size="sm"
        >
          Concluídos ({counts.concluido})
        </SegmentedButton>
        <SegmentedButton
          onClick={() => setStatusFilter("inexecutado")}
          active={statusFilter === "inexecutado"}
          size="sm"
        >
          Não Executados ({counts.inexecutado})
        </SegmentedButton>
        <SegmentedButton
          onClick={() => setStatusFilter("todos")}
          active={statusFilter === "todos"}
          size="sm"
        >
          Todos ({counts.todos})
        </SegmentedButton>
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
        <div className="rounded-md border border-line border-dashed p-6 text-center text-mute2 text-sm">
          Nenhum contrato encontrado para a visão "{statusFilter}".
        </div>
      )}

      {/* Tabela Completa via DenseTable (busca, ordenacao, paginacao, csv, highlight) */}
      <DenseTable
        data={tableData}
        columns={columns}
        renderMobileRow={(row) => {
          const isMatch =
            Boolean(highlightedId) &&
            (row.contratoServicoId === highlightedId ||
              row.contratoNumero === highlightedId);
          return {
            resumo: (
              <div
                className={cn(
                  "space-y-0.5",
                  isMatch && "ring-2 ring-brand ring-offset-2",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-bold text-ink text-sm">
                    {row.fornecedorNome}
                  </span>
                  <span className="shrink-0 font-bold font-serif text-ink text-sm">
                    {fmtCurrency(row.totalPago)}
                  </span>
                </div>
                <p className="line-clamp-2 text-ink text-xs leading-snug">
                  {row.objetoDescricao || "—"}
                </p>
                <div className="flex items-baseline justify-between gap-3 text-[11px] text-mute2">
                  <span className="font-semibold">{row.statusLabel}</span>
                  <span>{row.vigenciaFormatada}</span>
                </div>
              </div>
            ),
            detalhes: (
              <div className="space-y-3">
                <dl className="grid grid-cols-2 gap-2 border-line border-t pt-2.5 text-xs">
                  <div>
                    <dt className="text-[11px] text-mute2">Empenhado</dt>
                    <dd className="font-bold font-serif text-ink">
                      {fmtCurrency(row.totalEmpenhado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-mute2">Liquidado</dt>
                    <dd className="font-bold font-serif text-ink">
                      {fmtCurrency(row.totalLiquidado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-mute2">Saldo Pendente</dt>
                    <dd className="font-bold font-serif text-ink">
                      {fmtCurrency(row.saldoPendente)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-mute2">% Pago</dt>
                    <dd className="font-bold font-serif text-ink">
                      {fmtPercent(row.percentualPago)}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => handleOpenContratoDetails(row)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-pill px-3 py-1 font-medium text-ink text-xs hover:border-mute3"
                  title="Abrir detalhes completos do contrato"
                >
                  Detalhes
                </button>
              </div>
            ),
          };
        }}
        hideSearch
        rowClassName={(row) => {
          const isMatch =
            Boolean(highlightedId) &&
            (row.contratoServicoId === highlightedId ||
              row.contratoNumero === highlightedId);
          return isMatch
            ? "bg-line2 border-l-4 border-l-warn font-medium"
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
      <ContratoDetalhesModal
        contrato={selectedContrato}
        isOpen={Boolean(selectedContrato)}
        onClose={handleCloseModal}
        onBack={openedFromSearch ? handleCloseModal : undefined}
        backLabel="Voltar aos resultados da busca"
        openedFromSearch={openedFromSearch}
        ano={ano}
        portalSlug={portalSlug}
      />
    </section>
  );
}
