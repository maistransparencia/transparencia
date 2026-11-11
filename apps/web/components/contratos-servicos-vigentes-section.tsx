"use client";

import { BProgress } from "@bprogress/core";
import type { ContratoServicoVigente } from "@transparencia/db";
import {
  Badge,
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

interface ContratosServicosVigentesSectionProps {
  contratos: ContratoServicoVigente[];
  portalSlug?: string;
  ano?: number;
}

type FilterStatus = "em_execucao" | "concluido" | "inexecutado" | "todos";

function statusBadgeVariant(status?: string | null) {
  if (status === "concluido") return "success";
  if (status === "inexecutado") return "danger";
  return "default";
}

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

  const revealRowId =
    highlightedId === null
      ? null
      : (tableData.find(
          (c) =>
            c.contratoServicoId === highlightedId ||
            c.contratoNumero === highlightedId,
        )?.contratoServicoId ?? null);

  if ((!contratos || contratos.length === 0) && !selectedContrato) {
    return null;
  }

  const columns: Column<(typeof tableData)[number]>[] = [
    {
      header: "Fornecedor",
      accessorKey: "fornecedorNome",
      sortable: true,
      className: "min-w-[180px] max-w-[240px] font-semibold text-ink",
      renderCell: (row) => (
        <button
          type="button"
          onClick={() => handleOpenContratoDetails(row)}
          className="cursor-pointer text-left font-semibold text-ink hover:text-brand hover:underline"
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
      className: "min-w-[220px] max-w-[360px] text-ink",
      renderCell: (row) => (
        <p
          className="line-clamp-2 font-normal text-ink text-xs leading-relaxed"
          title={row.objetoDescricao}
        >
          {row.objetoDescricao || "—"}
        </p>
      ),
    },
    {
      header: "Vigência",
      accessorKey: "vigenciaFormatada",
      sortable: true,
      className: "min-w-[120px] numeric text-left text-mute2 tabular-nums",
    },
    {
      header: "Empenhado",
      accessorKey: "totalEmpenhado",
      align: "right",
      sortable: true,
      className: "whitespace-nowrap font-bold numeric tabular-nums",
      renderCell: (row) => fmtCurrency(row.totalEmpenhado),
    },
    {
      header: "Status",
      accessorKey: "statusLabel",
      exportOnly: true,
    },
    {
      header: "Liquidado",
      accessorKey: "totalLiquidado",
      exportOnly: true,
    },
    {
      header: "Pago",
      accessorKey: "totalPago",
      exportOnly: true,
    },
    {
      header: "Saldo Pendente",
      accessorKey: "saldoPendente",
      exportOnly: true,
    },
    {
      header: "% Pago",
      accessorKey: "percentualPago",
      exportOnly: true,
    },
  ];

  const renderContratoExpandedRow = (row: (typeof tableData)[number]) => {
    const percentualPago = Number.isFinite(row.percentualPago)
      ? Math.min(100, Math.max(0, row.percentualPago))
      : 0;
    const inexecutado = row.statusExecucao === "inexecutado";
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(row.statusExecucao)}>
            {row.statusLabel}
          </Badge>
          {(row.valorAditado ?? 0) > 0 && (
            <Badge variant="accent">Com aditamento</Badge>
          )}
        </div>
        <p className="text-ink">{row.objetoDescricao || "—"}</p>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="eyebrow">Contrato</dt>
            <dd className="numeric mt-1 text-left text-ink tabular-nums">
              {row.contratoNumero || "S/N"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Vigência</dt>
            <dd className="numeric mt-1 text-left text-ink tabular-nums">
              {row.vigenciaFormatada || "—"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Pago</dt>
            <dd className="mt-1 font-bold text-ink tabular-nums">
              {fmtCurrency(row.totalPago)}
            </dd>
          </div>
          {!inexecutado && (
            <div>
              <dt className="eyebrow">Saldo</dt>
              <dd className="mt-1 font-bold text-warn-text tabular-nums">
                {fmtCurrency(row.saldoPendente)}
              </dd>
            </div>
          )}
        </dl>
        {!inexecutado && (
          <div className="space-y-1.5">
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="Percentual do empenhado já pago"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentualPago}
            >
              <div
                className="h-full bg-brand-fill"
                style={{
                  width: `${percentualPago > 0 ? Math.max(percentualPago, 1) : 0}%`,
                }}
              />
            </div>
            <p className="caption tabular-nums">
              {fmtPercent(percentualPago)} do empenhado foi pago
            </p>
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => handleOpenContratoDetails(row)}
            className="inline-flex min-h-11 cursor-pointer items-center text-brand-text underline underline-offset-2"
            title="Abrir detalhes completos do contrato"
          >
            Ver detalhes
          </button>
        </div>
      </div>
    );
  };

  return (
    <section id="contratos-servicos-vigentes" className="scroll-mt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-1 border-ink border-t-2 pt-8 sm:flex-row sm:items-baseline">
        <div>
          <h2>Contratos de Serviços Vigentes</h2>
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

      {filteredContratos.length === 0 && (
        <div className="rounded-md border border-line border-dashed p-6 text-center text-mute2 text-sm">
          Nenhum contrato encontrado para a visão "{statusFilter}".
        </div>
      )}

      {/* Tabela Completa via DenseTable (busca, ordenacao, paginacao, csv, highlight) */}
      <DenseTable
        data={tableData}
        columns={columns}
        renderExpandedRow={renderContratoExpandedRow}
        renderMobileRow={(row) => {
          const isMatch =
            Boolean(highlightedId) &&
            (row.contratoServicoId === highlightedId ||
              row.contratoNumero === highlightedId);
          return {
            resumo: (
              <div
                className={cn(
                  "space-y-1",
                  isMatch && "ring-2 ring-brand ring-offset-2",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenContratoDetails(row)}
                    className="min-w-0 cursor-pointer truncate text-left font-bold text-ink text-sm hover:text-brand hover:underline"
                    title="Ver detalhes do contrato"
                  >
                    {row.fornecedorNome}
                  </button>
                  <span className="shrink-0 text-right">
                    <span className="eyebrow block">Empenhado</span>
                    <span className="numeric text-left font-bold text-ink text-sm tabular-nums">
                      {fmtCurrency(row.totalEmpenhado)}
                    </span>
                  </span>
                </div>
                <p className="line-clamp-2 text-ink text-xs leading-snug">
                  {row.objetoDescricao || "—"}
                </p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-mute2 tabular-nums">
                  <Badge variant={statusBadgeVariant(row.statusExecucao)}>
                    {row.statusLabel}
                  </Badge>
                  <span className="numeric text-left">
                    {row.vigenciaFormatada}
                  </span>
                </div>
              </div>
            ),
            detalhes: null,
          };
        }}
        hideCsvOnMobile
        revealRowId={revealRowId}
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
