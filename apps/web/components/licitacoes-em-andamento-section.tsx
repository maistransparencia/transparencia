"use client";

import { BProgress } from "@bprogress/core";
import type {
  LicitacaoEmAndamentoDTO,
  LicitacaoItemDTO,
  LicitacaoSituacaoCodigo,
} from "@transparencia/db";
import {
  Badge,
  type Column,
  cn,
  DenseTable,
  ExternalLinkPill,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
  fmtLicitacaoSituacao,
  fmtLicitacaoSituacaoCodigo,
  ModalDialog,
} from "@transparencia/ui";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coins,
  ExternalLink,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";

export { fmtLicitacaoSituacao };

export interface LicitacoesEmAndamentoSectionProps {
  licitacoes: LicitacaoEmAndamentoDTO[];
  itensByLicitacao?: Record<string, LicitacaoItemDTO[]>;
  portalSlug?: string;
  ano?: number;
  className?: string;
}

export interface LicitacaoTableRow extends LicitacaoEmAndamentoDTO {
  modalidadeFormatada: string;
  situacaoFormatada: string;
  valorFinal: number | null;
  buscaNormalizada: string;
}

const SITUACAO_BADGE_VARIANT: Record<
  LicitacaoSituacaoCodigo,
  "default" | "warning" | "success"
> = {
  homologada: "success",
  em_andamento: "warning",
  classificada: "default",
  encerrada: "default",
  nao_informada: "default",
  deserta: "default",
  fracassada: "default",
  cancelada: "default",
};

const SEM_VALOR_HOMOLOGADO_TEXTO: Record<LicitacaoSituacaoCodigo, string> = {
  em_andamento: "ainda não homologada",
  classificada: "ainda não homologada",
  nao_informada: "ainda não homologada",
  homologada: "valor não informado",
  encerrada: "—",
  deserta: "—",
  fracassada: "—",
  cancelada: "—",
};

function situacaoBadgeVariant(codigo?: LicitacaoSituacaoCodigo | null) {
  return SITUACAO_BADGE_VARIANT[codigo ?? "nao_informada"];
}

function textoSemValorHomologado(codigo?: LicitacaoSituacaoCodigo | null) {
  return SEM_VALOR_HOMOLOGADO_TEXTO[codigo ?? "nao_informada"];
}

function ValorHomologadoCelula({
  valorHomologado,
  economia,
  situacaoCodigo,
}: {
  valorHomologado?: number | null;
  economia: number | null;
  situacaoCodigo?: LicitacaoSituacaoCodigo | null;
}) {
  if (!valorHomologado || valorHomologado <= 0) {
    return (
      <span className="text-mute2 text-xs">
        {textoSemValorHomologado(situacaoCodigo)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <span className="font-bold font-serif text-ok">
        {fmtCurrency(valorHomologado)}
      </span>
      {economia !== null && (
        <span className="inline-block rounded-sm bg-ok/10 px-1 py-0.5 font-semibold text-[10px] text-ok">
          -{Math.round(economia)}%
        </span>
      )}
    </span>
  );
}

function calcularEconomia(
  valorEstimado?: number | null,
  valorHomologado?: number | null,
): number | null {
  if (valorEstimado && valorHomologado && valorHomologado < valorEstimado) {
    return ((valorEstimado - valorHomologado) / valorEstimado) * 100;
  }
  return null;
}

function getFonteObjetoBadge(fonteObjeto?: string | null): string | undefined {
  if (fonteObjeto === "pncp") return "PNCP";
  if (fonteObjeto === "contrato_local") return "Contrato Local";
  return undefined;
}

interface FromContratoState {
  contratoNumero?: string;
  ano?: number;
  portalSlug?: string;
}

export function LicitacoesEmAndamentoSection({
  licitacoes = [],
  itensByLicitacao,
  portalSlug,
  ano,
  className,
}: LicitacoesEmAndamentoSectionProps) {
  const [selectedLicitacaoForItens, setSelectedLicitacaoForItens] =
    useState<LicitacaoTableRow | null>(null);
  const [openedFromSearch, setOpenedFromSearch] = useState(false);
  const [fromContrato, setFromContrato] = useState<FromContratoState | null>(
    null,
  );
  const [highlightedNumero, setHighlightedNumero] = useState<string | null>(
    null,
  );

  const handleCloseModal = useCallback(() => {
    setSelectedLicitacaoForItens(null);
    setOpenedFromSearch(false);
    setFromContrato(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("numero")) {
        url.searchParams.delete("numero");
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

  const handleBack = useCallback(() => {
    if (fromContrato) {
      const contratoInfo = { ...fromContrato };
      setSelectedLicitacaoForItens(null);
      setOpenedFromSearch(false);
      setFromContrato(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("numero");
        if (contratoInfo.contratoNumero) {
          url.searchParams.set("contratoNumero", contratoInfo.contratoNumero);
        }
        url.hash = "contratos-servicos-vigentes";
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash,
        );
      }
      window.dispatchEvent(
        new CustomEvent("contrato:selected", {
          detail: {
            numero: contratoInfo.contratoNumero,
            contratoNumero: contratoInfo.contratoNumero,
            ano: contratoInfo.ano,
            portalSlug: contratoInfo.portalSlug || portalSlug,
          },
        }),
      );
    } else if (openedFromSearch) {
      handleCloseModal();
    }
  }, [fromContrato, openedFromSearch, handleCloseModal, portalSlug]);

  const handleOpenRowDetails = useCallback((row: LicitacaoTableRow) => {
    setOpenedFromSearch(false);
    setFromContrato(null);
    setSelectedLicitacaoForItens(row);
    if (typeof window !== "undefined" && row.licitacaoNumero) {
      const url = new URL(window.location.href);
      url.searchParams.set("numero", row.licitacaoNumero);
      url.hash = "licitacoes-em-andamento";
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);
  const [dynamicItensByLicitacao, setDynamicItensByLicitacao] = useState<
    Record<string, LicitacaoItemDTO[]>
  >({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const hasCheckedDeepLinkRef = useRef(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);

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

  // Mapeamento enriquecido para a tabela
  const tableData: LicitacaoTableRow[] = useMemo(() => {
    return sortedByRelevance.map((item) => {
      const valorNum = item.valorEstimado ?? item.valor ?? null;
      const modalidadeFmt = fmtLicitacaoModalidade(item.modalidade);
      const situacaoFmt = fmtLicitacaoSituacaoCodigo(
        item.situacaoCodigo,
        item.situacao,
      );

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

  // Top 4 para cards de destaque
  const topDestaques: LicitacaoTableRow[] = useMemo(() => {
    return tableData.slice(0, 4);
  }, [tableData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tableData.length === 0) return;

    const checkAndOpenLicitacao = async (
      targetNumero?: string | null,
      searchDetail?: {
        id?: string;
        numero?: string;
        objeto?: string;
        modalidade?: string | null;
        status?: string | null;
        statusCodigo?: LicitacaoSituacaoCodigo | null;
        valor?: number;
        linkSistemaOrigem?: string | null;
        ano?: number;
        portalSlug?: string;
      },
    ) => {
      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const numero = targetNumero ?? urlParams?.get("numero");
      if (!numero && !searchDetail) {
        setSelectedLicitacaoForItens(null);
        setOpenedFromSearch(false);
        setFromContrato(null);
        setHighlightedNumero(null);
        return;
      }
      if (!numero) return;

      setHighlightedNumero(numero);
      const cleanNum = numero.trim();
      const match = tableData.find((t) => {
        if (!t) return false;
        if (
          searchDetail?.ano &&
          (t.ano ?? ano) &&
          (t.ano ?? ano) !== searchDetail.ano
        ) {
          return false;
        }
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("licitacao:loaded", { detail: { id: cleanNum } }),
          );
          BProgress.done();
        }
        return;
      }

      // Se não estiver na tabela pré-carregada (ex: processo já homologado), busca via API ou constrói a partir dos dados do evento
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
            `/api/${encodeURIComponent(targetSlug)}/licitacoes/details?numero=${encodeURIComponent(cleanNum)}${targetAno ? `&ano=${targetAno}` : ""}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.licitacao) {
              const item = data.licitacao;
              const modalidadeFmt = fmtLicitacaoModalidade(item.modalidade);
              const situacaoFmt = fmtLicitacaoSituacaoCodigo(
                item.situacaoCodigo,
                item.situacao,
              );
              const tableRow: LicitacaoTableRow = {
                ...item,
                modalidadeFormatada: modalidadeFmt,
                situacaoFormatada: situacaoFmt,
                valorFinal: item.valorEstimado ?? item.valor ?? null,
                buscaNormalizada: "",
              };
              if (Array.isArray(data.itens) && data.itens.length > 0) {
                setDynamicItensByLicitacao((prev) => ({
                  ...prev,
                  [item.licitacaoNumero]: data.itens,
                }));
              }
              setSelectedLicitacaoForItens(tableRow);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("licitacao:loaded", {
                    detail: { id: cleanNum },
                  }),
                );
              }
              return;
            }
          }
        } catch (_err) {
          // Fallback silencioso para dados de busca se a requisição falhar
        } finally {
          setLoadingDetails(false);
          if (typeof window !== "undefined") {
            BProgress.done();
          }
        }
      }

      // Fallback gracioso com dados da busca caso a API falhe ou não tenha portalSlug
      if (searchDetail && (searchDetail.numero || searchDetail.objeto)) {
        const modalidadeFmt = fmtLicitacaoModalidade(searchDetail.modalidade);
        const situacaoCodigoBusca =
          searchDetail.statusCodigo ?? "nao_informada";
        const situacaoFmt = fmtLicitacaoSituacaoCodigo(
          situacaoCodigoBusca,
          searchDetail.status,
        );
        const fallbackRow: LicitacaoTableRow = {
          licitacaoId: searchDetail.id || cleanNum,
          portalSlug: targetSlug || "",
          ano: targetAno || new Date().getFullYear(),
          empresaId: "",
          entidadeNome: null,
          licitacaoNumero: searchDetail.numero || cleanNum,
          modalidade: searchDetail.modalidade || "",
          objeto: searchDetail.objeto || "",
          discriminacao: null,
          valor: searchDetail.valor ?? null,
          valorEstimado: searchDetail.valor ?? null,
          valorHomologado:
            situacaoCodigoBusca === "homologada"
              ? (searchDetail.valor ?? null)
              : null,
          situacao: searchDetail.status || "",
          situacaoCodigo: situacaoCodigoBusca,
          dataAbertura: null,
          carona: null,
          fonteObjeto: "municipal",
          linkSistemaOrigem: searchDetail.linkSistemaOrigem || null,
          modalidadeFormatada: modalidadeFmt,
          situacaoFormatada: situacaoFmt,
          valorFinal: searchDetail.valor ?? null,
          buscaNormalizada: "",
        };
        setSelectedLicitacaoForItens(fallbackRow);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("licitacao:loaded", { detail: { id: cleanNum } }),
          );
          BProgress.done();
        }
      }
    };

    if (!hasCheckedDeepLinkRef.current) {
      hasCheckedDeepLinkRef.current = true;
      checkAndOpenLicitacao();
    }

    const handleCustomSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{
        numero?: string;
        id?: string;
        fromSearch?: boolean;
        fromContrato?: FromContratoState;
        objeto?: string;
        modalidade?: string | null;
        status?: string | null;
        statusCodigo?: LicitacaoSituacaoCodigo | null;
        valor?: number;
        linkSistemaOrigem?: string | null;
        ano?: number;
        portalSlug?: string;
      }>;
      const num = customEvent.detail?.numero || customEvent.detail?.id;
      if (num) {
        if (customEvent.detail?.fromContrato) {
          setFromContrato(customEvent.detail.fromContrato);
          setOpenedFromSearch(false);
        } else if (customEvent.detail?.fromSearch) {
          setOpenedFromSearch(true);
          setFromContrato(null);
        } else {
          setOpenedFromSearch(false);
          setFromContrato(null);
        }
        checkAndOpenLicitacao(num, customEvent.detail);
      }
    };

    const handlePopState = () => {
      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const numero = urlParams?.get("numero");
      if (!numero) {
        setSelectedLicitacaoForItens(null);
        setOpenedFromSearch(false);
        setFromContrato(null);
        setHighlightedNumero(null);
        return;
      }
      checkAndOpenLicitacao();
    };

    window.addEventListener("licitacao:selected", handleCustomSelect);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("licitacao:selected", handleCustomSelect);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [tableData, portalSlug, ano]);

  const columns: Column<LicitacaoTableRow>[] = [
    {
      header: "Processo",
      accessorKey: "licitacaoNumero",
      sortable: true,
      className: "whitespace-nowrap font-semibold text-ink",
      renderCell: (row) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleOpenRowDetails(row)}
            className="cursor-pointer text-left font-semibold text-ink hover:text-blue-600 hover:underline"
            title="Ver detalhes da licitação"
          >
            {row.licitacaoNumero || "S/N"}
          </button>
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
              onClick={() => handleOpenRowDetails(row)}
              className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-[11px] text-mute2 hover:text-ink"
              title="Visualizar detalhes da licitação"
            >
              <span>Detalhes</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      header: "Órgão",
      accessorKey: "entidadeNome",
      sortable: true,
      className: "min-w-[150px] max-w-[220px] truncate text-ink",
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
      className: "min-w-[220px] max-w-[340px] text-ink",
      renderCell: (row) => (
        <div className="space-y-1">
          <p
            className="line-clamp-2 text-ink text-xs leading-relaxed"
            title={row.objeto}
          >
            {row.objeto || "—"}
          </p>
          {((fonteObjeto) =>
            fonteObjeto && (
              <div className="flex items-center gap-2">
                <span className="rounded bg-line2 px-1.5 py-0.5 text-[10px] text-mute2">
                  {getFonteObjetoBadge(row.fonteObjeto)}
                </span>
              </div>
            ))(getFonteObjetoBadge(row.fonteObjeto))}
        </div>
      ),
    },
    {
      header: "Abertura",
      accessorKey: "dataAbertura",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-mute2",
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
            <span className="font-bold font-serif text-ink">
              {fmtCurrency(row.valorFinal)}
            </span>
          );
        }
        return <span className="text-mute3 text-xs italic">Não divulgado</span>;
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
        return (
          <div className="text-right">
            <ValorHomologadoCelula
              valorHomologado={row.valorHomologado}
              situacaoCodigo={row.situacaoCodigo}
              economia={calcularEconomia(row.valorFinal, row.valorHomologado)}
            />
          </div>
        );
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
        <Badge variant={situacaoBadgeVariant(row.situacaoCodigo)}>
          {row.situacaoFormatada}
        </Badge>
      ),
    },
  ];

  const renderLicitacaoMobileRow = (row: LicitacaoTableRow) => {
    const isHighlighted =
      highlightedNumero &&
      (row.licitacaoNumero === highlightedNumero ||
        row.licitacaoId === highlightedNumero);
    const valorEst = row.valorEstimado ?? row.valorFinal;
    const valorHom = row.valorHomologado;
    const economia = calcularEconomia(valorEst, valorHom);

    return {
      resumo: (
        <div
          id={`licitacao-card-${row.licitacaoNumero || row.licitacaoId}`}
          className={cn(
            "space-y-0.5",
            isHighlighted && "animate-pulse ring-2 ring-brand ring-offset-2",
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-bold text-ink text-sm">
              Processo {row.licitacaoNumero || "S/N"}
            </span>
            <span className="shrink-0 font-bold font-serif text-ink text-sm">
              {valorEst ? fmtCurrency(valorEst) : "Não divulgado"}
            </span>
          </div>
          <p className="line-clamp-2 text-ink text-xs leading-snug">
            {row.objeto}
          </p>
          <div className="flex items-baseline justify-between gap-3 text-[11px] text-mute2">
            <span className="font-semibold">{row.situacaoFormatada}</span>
            <span>
              Abertura:{" "}
              {row.dataAbertura ? fmtDate(row.dataAbertura) : "Não informada"}
            </span>
          </div>
        </div>
      ),
      detalhes: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="accent">{row.modalidadeFormatada}</Badge>
            {getFonteObjetoBadge(row.fonteObjeto) && (
              <Badge>{getFonteObjetoBadge(row.fonteObjeto)}</Badge>
            )}
          </div>
          {row.entidadeNome && (
            <p className="text-mute2 text-xs">{row.entidadeNome}</p>
          )}
          <dl className="grid grid-cols-2 gap-2 border-line border-t pt-2.5 text-xs">
            <div>
              <dt className="text-[11px] text-mute2">Valor Estimado</dt>
              <dd className="mt-0.5 font-bold font-serif text-ink">
                {valorEst ? fmtCurrency(valorEst) : "Não divulgado"}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-[11px] text-mute2">Homologado</dt>
              <dd className="mt-0.5">
                <ValorHomologadoCelula
                  valorHomologado={valorHom}
                  situacaoCodigo={row.situacaoCodigo}
                  economia={economia}
                />
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenRowDetails(row)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-pill px-3 py-1 font-medium text-ink text-xs hover:border-mute3"
              title="Visualizar detalhes da licitação"
            >
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Detalhes</span>
            </button>
            {row.linkSistemaOrigem && (
              <ExternalLinkPill href={row.linkSistemaOrigem}>
                Sala de Disputa
              </ExternalLinkPill>
            )}
          </div>
        </div>
      ),
    };
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
              className="font-bold font-serif text-ink text-xl"
            >
              Licitações Abertas e em Andamento
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-mute2 text-xs leading-relaxed sm:text-sm">
            Audite preventivamente as compras públicas em andamento antes da
            adjudicação e homologação de contratos pelo município. Descrições e
            itens são enriquecidos e integrados diretamente com o{" "}
            <a
              href={FONTES_OFICIAIS.pncp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              PNCP (Portal Nacional de Contratações Públicas)
              <ExternalLink className="inline h-3 w-3" />
            </a>
            , com fundamento no{" "}
            <a
              href={urlLegislacao("lei14133", "art174")}
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
          className="shrink-0 font-medium text-mute2 text-xs"
          aria-live="polite"
        >
          {totalProcessos}{" "}
          {totalProcessos === 1 ? "processo em aberto" : "processos em aberto"}
        </span>
      </div>

      {totalProcessos === 0 ? (
        <div className="rounded-md border border-line bg-page p-8 text-center">
          <p className="font-medium text-ink text-sm">
            Nenhuma licitação em andamento ou aberta encontrada para este
            exercício.
          </p>
          <p className="mt-1 text-mute3 text-xs">
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
                <h3 className="font-semibold text-ink text-xs tracking-wider">
                  Processos em Destaque por Relevância
                </h3>
                <span className="text-mute3 text-xs">
                  {topDestaques.length === 1
                    ? "Maior valor estimado"
                    : `Top ${topDestaques.length} de maior valor`}
                </span>
              </div>
              <div
                data-testid="top-destaques-grid"
                className="grid grid-cols-1 gap-x-8 md:grid-cols-2"
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
                      className="flex flex-col justify-between border-line border-t py-5"
                    >
                      <div className="space-y-3">
                        {/* Linha 1: Badges horizontais com wrap */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="accent">
                            {item.modalidadeFormatada ||
                              fmtLicitacaoModalidade(item.modalidade)}
                          </Badge>
                          <Badge
                            variant={situacaoBadgeVariant(item.situacaoCodigo)}
                          >
                            {item.situacaoFormatada}
                          </Badge>
                          {item.fonteObjeto === "pncp" && (
                            <span
                              className="inline-block rounded-sm border border-ok/40 px-2 py-0.5 font-semibold text-[10px] text-ok"
                              title="Objeto des-truncado via PNCP"
                            >
                              PNCP
                            </span>
                          )}
                          {item.fonteObjeto === "contrato_local" && (
                            <span
                              className="inline-block rounded-sm border border-line px-2 py-0.5 font-semibold text-[10px] text-mute2"
                              title="Objeto des-truncado via contrato local"
                            >
                              Contrato Local
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Processo e Órgão empilhados verticalmente */}
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenRowDetails(item)}
                            className="cursor-pointer text-left font-bold text-ink text-sm hover:text-blue-600 hover:underline"
                            title="Ver detalhes da licitação"
                          >
                            Processo {item.licitacaoNumero || "S/N"}
                          </button>
                          {item.entidadeNome && (
                            <p className="mt-0.5 truncate text-mute2 text-xs">
                              {item.entidadeNome}
                            </p>
                          )}
                        </div>

                        {/* Linha 3: Objeto */}
                        <div>
                          <p
                            className="line-clamp-3 text-ink text-xs leading-relaxed"
                            title={item.objeto}
                          >
                            {item.objeto}
                          </p>
                        </div>

                        {/* Linha 4: Data de abertura */}
                        <div className="flex items-center gap-1.5 text-mute2 text-xs">
                          <Calendar
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Abertura: {dataAberturaTexto}</span>
                        </div>

                        {/* Linha 5: Grade financeira 2 colunas */}
                        <div className="grid grid-cols-2 gap-2 border-line border-t pt-2.5 text-xs">
                          <div>
                            <span className="block text-[11px] text-mute3">
                              Valor Estimado
                            </span>
                            <div className="mt-0.5 flex items-center gap-1 font-bold font-serif text-ink">
                              <Coins
                                className="h-3.5 w-3.5 text-mute3"
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
                            <span className="block text-[11px] text-mute3">
                              Homologado
                            </span>
                            <div className="mt-0.5">
                              <ValorHomologadoCelula
                                valorHomologado={valorHom}
                                situacaoCodigo={item.situacaoCodigo}
                                economia={economia}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linha 6: Ações no rodapé */}
                      <div className="mt-3 flex items-center justify-between border-line border-t pt-2.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenRowDetails(item)}
                          className="inline-flex cursor-pointer items-center gap-1 font-medium text-mute2 transition-colors hover:text-ink"
                          title="Visualizar detalhes da licitação"
                        >
                          <Package
                            className="h-3.5 w-3.5 text-mute3"
                            aria-hidden="true"
                          />
                          <span>Detalhes</span>
                        </button>

                        {item.linkSistemaOrigem && (
                          <ExternalLinkPill href={item.linkSistemaOrigem}>
                            Sala de Disputa
                          </ExternalLinkPill>
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
              <h3 className="font-semibold text-ink text-xs tracking-wider">
                Relação Completa de Licitações em Aberto
              </h3>
            </div>
            <DenseTable
              data={tableData}
              columns={columns}
              renderMobileRow={renderLicitacaoMobileRow}
              hideSearch
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
        onClose={handleCloseModal}
        onBack={fromContrato || openedFromSearch ? handleBack : undefined}
        backLabel={
          fromContrato
            ? `Voltar ao Contrato${fromContrato.contratoNumero ? ` nº ${fromContrato.contratoNumero}` : ""}`
            : "Voltar aos resultados da busca"
        }
        zIndex={openedFromSearch || fromContrato ? "z-[60]" : undefined}
        title={`Processo ${selectedLicitacaoForItens?.licitacaoNumero || "S/N"}`}
        subtitle={
          selectedLicitacaoForItens?.entidadeNome || "Licitação Pública"
        }
        badge={(() => {
          if (!selectedLicitacaoForItens) return undefined;
          const { situacaoCodigo, situacaoFormatada } =
            selectedLicitacaoForItens;
          return (
            <Badge variant={situacaoBadgeVariant(situacaoCodigo)}>
              {situacaoFormatada}
            </Badge>
          );
        })()}
        maxWidth="5xl"
        footer={
          selectedLicitacaoForItens ? (
            <div className="flex w-full items-center justify-between text-xs">
              <span className="text-mute2">
                {(
                  dynamicItensByLicitacao[
                    selectedLicitacaoForItens.licitacaoNumero
                  ] ??
                  itensByLicitacao?.[selectedLicitacaoForItens.licitacaoNumero]
                )?.length || 0}{" "}
                itens listados
              </span>
              {selectedLicitacaoForItens.linkSistemaOrigem && (
                <a
                  href={selectedLicitacaoForItens.linkSistemaOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>Abrir Sala de Disputa no PNCP</span>
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
              dynamicItensByLicitacao[
                selectedLicitacaoForItens.licitacaoNumero
              ] ??
              itensByLicitacao?.[selectedLicitacaoForItens.licitacaoNumero] ??
              [];

            return (
              <div className="space-y-6 py-2">
                {selectedLicitacaoForItens.ano &&
                  ano &&
                  selectedLicitacaoForItens.ano !== ano && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Este processo pertence ao exercício de{" "}
                          <strong className="font-semibold">
                            {selectedLicitacaoForItens.ano}
                          </strong>{" "}
                          (você está navegando no painel de{" "}
                          <strong className="font-semibold">{ano}</strong>).
                        </span>
                      </div>
                      <Link
                        href={`/${portalSlug || "portal"}/licitacoes?ano=${selectedLicitacaoForItens.ano}&numero=${encodeURIComponent(selectedLicitacaoForItens.licitacaoNumero || "")}#licitacoes-em-andamento`}
                        className="inline-flex items-center gap-1 font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 transition-colors hover:text-amber-950"
                      >
                        <span>
                          Mudar painel para {selectedLicitacaoForItens.ano}
                        </span>
                      </Link>
                    </div>
                  )}

                {/* Bloco 1: Órgão, Modalidade, Abertura e Ano */}
                <div className="grid grid-cols-1 gap-4 rounded-md border border-line bg-line2 p-3.5 sm:grid-cols-2 sm:gap-6 sm:p-4 lg:grid-cols-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                      Órgão Licitante
                    </span>
                    <p className="mt-0.5 break-words font-semibold text-ink text-sm [overflow-wrap:anywhere] [word-break:break-word]">
                      {selectedLicitacaoForItens.entidadeNome ||
                        "Não informado"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                      Modalidade
                    </span>
                    <p className="mt-0.5 break-words font-medium text-ink text-sm [overflow-wrap:anywhere] [word-break:break-word]">
                      {selectedLicitacaoForItens.modalidadeFormatada ||
                        fmtLicitacaoModalidade(
                          selectedLicitacaoForItens.modalidade,
                        )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                      Data de Abertura
                    </span>
                    <p className="mt-0.5 font-medium text-ink text-sm">
                      {selectedLicitacaoForItens.dataAbertura
                        ? fmtDate(selectedLicitacaoForItens.dataAbertura)
                        : "Não informada"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                      Exercício
                    </span>
                    <p className="mt-0.5 font-medium text-ink text-sm">
                      {selectedLicitacaoForItens.ano || "—"}
                    </p>
                  </div>
                </div>

                {/* Bloco de Rastreabilidade Orçamentária e Fonte de Recursos */}
                {selectedLicitacaoForItens.fontesRecursos && (
                  <div className="rounded-md border border-blue-200/80 bg-blue-50/50 p-3.5 sm:p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-900 text-xs uppercase tracking-wider">
                        Fonte de Recursos / Destinação Orçamentária
                      </span>
                      <a
                        href={urlLegislacao("lei14133Ato20212024", "art18")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs hover:underline"
                        title="Art. 18, VIII da Lei 14.133/2021"
                      >
                        <span>Art. 18 da Lei 14.133/21</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedLicitacaoForItens.fontesRecursos
                        .split(";")
                        .map((fonte) => fonte.trim())
                        .filter((cleanFonte) => cleanFonte.length > 0)
                        .map((cleanFonte) => (
                          <span
                            key={cleanFonte}
                            className="inline-flex items-center rounded-md border border-blue-200 bg-page px-2.5 py-1 font-medium text-blue-900 text-xs"
                          >
                            {cleanFonte}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Bloco 2: Objeto Integral da Licitação */}
                <div className="min-w-0">
                  <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                    Objeto Integral da Licitação
                  </span>
                  <div className="mt-1.5 whitespace-pre-wrap break-words rounded-md border border-line bg-page p-3.5 text-ink text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word] sm:p-4">
                    {selectedLicitacaoForItens.objeto ||
                      "Objeto não informado."}
                  </div>
                  {selectedLicitacaoForItens.discriminacao &&
                    selectedLicitacaoForItens.discriminacao !==
                      selectedLicitacaoForItens.objeto && (
                      <div className="mt-2 break-words text-mute2 text-xs [overflow-wrap:anywhere] [word-break:break-word]">
                        <span className="font-semibold text-mute2">
                          Detalhamento complementar:{" "}
                        </span>
                        <span>{selectedLicitacaoForItens.discriminacao}</span>
                      </div>
                    )}
                </div>

                {/* Bloco 3: Grid de Valores Financeiros */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="min-w-0 rounded-md border border-line bg-page p-3.5">
                    <span className="font-medium text-mute2 text-xs">
                      Valor Estimado
                    </span>
                    <p className="mt-1 font-semibold font-serif text-base text-ink sm:text-lg">
                      {selectedLicitacaoForItens.valorFinal
                        ? fmtCurrency(selectedLicitacaoForItens.valorFinal)
                        : selectedLicitacaoForItens.valorEstimado
                          ? fmtCurrency(selectedLicitacaoForItens.valorEstimado)
                          : selectedLicitacaoForItens.valor
                            ? fmtCurrency(selectedLicitacaoForItens.valor)
                            : "Não divulgado"}
                    </p>
                  </div>

                  <div className="rounded-md border border-line bg-page p-3.5">
                    <span className="font-medium text-mute2 text-xs">
                      Valor Homologado
                    </span>
                    <p className="mt-1 font-semibold font-serif text-base text-ink sm:text-lg">
                      {selectedLicitacaoForItens.valorHomologado
                        ? fmtCurrency(selectedLicitacaoForItens.valorHomologado)
                        : textoSemValorHomologado(
                            selectedLicitacaoForItens.situacaoCodigo,
                          )}
                    </p>
                  </div>

                  <div className="rounded-md border border-line bg-page p-3.5">
                    <span className="font-medium text-mute2 text-xs">
                      Economia Obtida
                    </span>
                    {(() => {
                      const est =
                        selectedLicitacaoForItens.valorFinal ??
                        selectedLicitacaoForItens.valorEstimado ??
                        selectedLicitacaoForItens.valor;
                      const hom = selectedLicitacaoForItens.valorHomologado;
                      if (est && hom && est > hom) {
                        const diff = est - hom;
                        const pct = (diff / est) * 100;
                        return (
                          <p className="mt-1 font-semibold font-serif text-base text-emerald-700 sm:text-lg">
                            {fmtCurrency(diff)}{" "}
                            <span className="font-sans text-xs">
                              (-{pct.toFixed(1)}%)
                            </span>
                          </p>
                        );
                      }
                      return (
                        <p className="mt-1 font-semibold text-mute3 text-sm">
                          —
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Bloco 4: Itens Licitados */}
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-ink text-sm">
                    Itens Licitados
                  </h3>
                  {(() => {
                    if (itens.length === 0) {
                      return (
                        <div className="rounded-md border border-line bg-page py-10 text-center">
                          <Package
                            className="mx-auto h-9 w-9 text-mute3"
                            aria-hidden="true"
                          />
                          <p className="mt-2.5 font-medium text-ink text-sm">
                            {loadingDetails
                              ? "Carregando detalhes e itens da contratação..."
                              : "Nenhum item individual cadastrado para este processo."}
                          </p>
                          <p className="mt-1 text-mute3 text-xs">
                            Os detalhes da contratação podem ser consultados no
                            edital completo ou na sala de disputa pública.
                          </p>
                          {selectedLicitacaoForItens.linkSistemaOrigem && (
                            <div className="mt-4">
                              <a
                                href={
                                  selectedLicitacaoForItens.linkSistemaOrigem
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs transition-colors hover:bg-blue-700"
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
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-mute2 text-xs">
                          <span className="font-medium text-mute2">
                            {itens.length}{" "}
                            {itens.length === 1
                              ? "item listado"
                              : "itens listados"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="hidden font-medium text-[11px] text-mute3 sm:inline">
                              Navegar colunas:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const el = tableScrollRef.current;
                                if (!el) return;
                                if (typeof el.scrollBy === "function") {
                                  el.scrollBy({
                                    left: -240,
                                    behavior: "smooth",
                                  });
                                } else {
                                  el.scrollLeft -= 240;
                                }
                              }}
                              aria-label="Rolar tabela para a esquerda"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-page text-mute2 transition-colors hover:bg-line2 hover:text-ink active:bg-line2"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const el = tableScrollRef.current;
                                if (!el) return;
                                if (typeof el.scrollBy === "function") {
                                  el.scrollBy({
                                    left: 240,
                                    behavior: "smooth",
                                  });
                                } else {
                                  el.scrollLeft += 240;
                                }
                              }}
                              aria-label="Rolar tabela para a direita"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-page text-mute2 transition-colors hover:bg-line2 hover:text-ink active:bg-line2"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={tableScrollRef}
                          className="overflow-x-auto rounded-md border border-line bg-page"
                        >
                          <table className="w-full min-w-[780px] text-left text-mute2 text-xs">
                            <thead className="border-line border-b bg-line2 font-semibold text-ink uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2 text-center">Item</th>
                                <th className="px-3 py-2">Descrição</th>
                                <th className="px-3 py-2 text-center">
                                  Qtd / Un
                                </th>
                                <th className="px-3 py-2 text-right">
                                  Valor Estimado
                                </th>
                                <th className="px-3 py-2 text-right">
                                  Homologado
                                </th>
                                <th className="px-3 py-2 text-center">
                                  Desconto
                                </th>
                                <th className="px-3 py-2">
                                  Fornecedor Vencedor
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {itens.map((it) => (
                                <tr key={it.itemId} className="hover:bg-line2">
                                  <td className="px-3 py-2.5 text-center font-bold text-ink">
                                    {it.numeroItem}
                                  </td>
                                  <td className="min-w-[200px] px-3 py-2.5 font-medium text-ink">
                                    {it.descricao || "—"}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-center">
                                    {it.quantidade != null
                                      ? it.quantidade
                                      : "—"}{" "}
                                    {it.unidadeMedida || ""}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-serif">
                                    {(() => {
                                      const valorExibicao =
                                        it.valorTotalEstimado ??
                                        (it.valorUnitarioEstimado != null &&
                                        it.quantidade != null
                                          ? it.valorUnitarioEstimado *
                                            it.quantidade
                                          : it.valorUnitarioEstimado);
                                      if (valorExibicao != null) {
                                        return (
                                          <>
                                            <span>
                                              {fmtCurrency(valorExibicao)}
                                            </span>
                                            {it.quantidade != null &&
                                              it.quantidade > 1 &&
                                              it.valorUnitarioEstimado !=
                                                null && (
                                                <span className="block font-sans text-[10px] text-mute3">
                                                  {fmtCurrency(
                                                    it.valorUnitarioEstimado,
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
                                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold font-serif text-ink">
                                    {(() => {
                                      const valorExibicao =
                                        it.valorTotalHomologado ??
                                        (it.valorUnitarioHomologado != null &&
                                        it.quantidade != null
                                          ? it.valorUnitarioHomologado *
                                            it.quantidade
                                          : it.valorUnitarioHomologado);
                                      if (valorExibicao != null) {
                                        return (
                                          <>
                                            <span>
                                              {fmtCurrency(valorExibicao)}
                                            </span>
                                            {it.quantidade != null &&
                                              it.quantidade > 1 &&
                                              it.valorUnitarioHomologado !=
                                                null && (
                                                <span className="block font-normal font-sans text-[10px] text-mute3">
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
                                        <span className="font-medium text-ink">
                                          {it.fornecedorNome}
                                        </span>
                                        {it.fornecedorCpfCnpj && (
                                          <span className="block text-[10px] text-mute3">
                                            {it.fornecedorCpfCnpj}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-mute3 italic">
                                        Pendente / Não homologado
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
      </ModalDialog>
    </section>
  );
}
