"use client";

import type { SituacaoObraFiltro } from "@transparencia/db";
import { fmtCompact, SectionHeader } from "@transparencia/ui";
import { ExternalLink, MapPinOff, X } from "lucide-react";
import nextDynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  ObraItemViewModel,
  ObraMarkerItem,
  ObrasViewModel,
} from "@/app/[portalSlug]/obras/view-model";
import { urlObraCipi } from "@/lib/constants/fontes-oficiais";
import { ObrasDetalheModal } from "./obras-detalhe-modal";

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function formatMonthYear(isoDate: string | null): string {
  if (!isoDate) return "N/D";
  const parts = isoDate.split("-");
  if (parts.length < 2) return isoDate;
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const m = parseInt(parts[1], 10);
  if (m >= 1 && m <= 12) {
    return `${meses[m - 1]}/${parts[0]}`;
  }
  return isoDate;
}

export function formatarPrevisao(
  dataInicio: string | null,
  dataFim: string | null,
): string {
  if (dataInicio && dataFim) {
    return `${formatMonthYear(dataInicio)} → ${formatMonthYear(dataFim)}`;
  }
  if (dataFim) {
    return `até ${formatMonthYear(dataFim)}`;
  }
  if (dataInicio) {
    return `a partir de ${formatMonthYear(dataInicio)}`;
  }
  return "N/D";
}

const ObrasMapaInterativo = nextDynamic(
  () =>
    import("./obras-mapa-interativo").then((mod) => mod.ObrasMapaInterativo),
  {
    ssr: false,
    loading: () => (
      <div className="bg-line2 flex h-full min-h-[580px] w-full animate-pulse items-center justify-center">
        <span className="text-mute2 text-sm font-medium">
          Carregando mapa interativo...
        </span>
      </div>
    ),
  },
);

export interface ObrasInteractiveSectionProps {
  viewModel: ObrasViewModel;
  selectedObraId?: string | null;
  onSelectObra?: (idProjeto: string | null) => void;
}

const STATUS_FILTROS: {
  id: SituacaoObraFiltro;
  label: string;
  dotColor: string;
  countKey?: keyof ObrasViewModel["kpis"];
}[] = [
  { id: "todas", label: "Todas", dotColor: "", countKey: "totalObras" },
  {
    id: "em_execucao",
    label: "Em execução",
    dotColor: "bg-brand-fill",
    countKey: "emExecucao",
  },
  {
    id: "paralisada",
    label: "Paralisada",
    dotColor: "bg-danger-fill",
    countKey: "paralisadas",
  },
  {
    id: "concluida",
    label: "Concluída",
    dotColor: "bg-ok-fill",
    countKey: "concluidas",
  },
  {
    id: "cadastrada",
    label: "Cadastrada",
    dotColor: "bg-mute3",
    countKey: "cadastradas",
  },
  {
    id: "cancelada",
    label: "Cancelada",
    dotColor: "bg-mute3",
    countKey: "canceladas",
  },
];

export function ObrasInteractiveSection({
  viewModel,
  selectedObraId: externalSelectedObraId,
  onSelectObra: externalOnSelectObra,
}: ObrasInteractiveSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardListRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const [selectedStatus, setSelectedStatus] = useState<SituacaoObraFiltro>(
    viewModel.filtros.status,
  );
  const [buscaText, setBuscaText] = useState<string>(
    viewModel.filtros.busca ?? "",
  );
  // Filtros que este componente já enviou à URL e cujo eco do servidor ainda não chegou
  const pendingFiltrosRef = useRef<{ status: string; busca: string }[]>([]);
  useEffect(() => {
    const status = viewModel.filtros.status;
    const busca = viewModel.filtros.busca ?? "";
    const pending = pendingFiltrosRef.current;
    const echoIndex = pending.findIndex(
      (f) => f.status === status && f.busca === busca,
    );
    if (echoIndex >= 0) {
      // Eco de uma mudança feita aqui: descarta até ela e não sobrescreve o estado local
      pendingFiltrosRef.current = pending.slice(echoIndex + 1);
      return;
    }
    // Navegação externa (ex.: link "Ver no mapa" do hero): alinha status e busca com a URL
    pendingFiltrosRef.current = [];
    setSelectedStatus(status);
    setBuscaText(busca);
  }, [viewModel.filtros.status, viewModel.filtros.busca]);
  const [internalSelectedObraId, setInternalSelectedObraId] = useState<
    string | null
  >(null);
  const [detalheModalObra, setDetalheModalObra] =
    useState<ObraItemViewModel | null>(null);
  const hasCheckedDeepLinkRef = useRef(false);
  const [viewMode, setViewMode] = useState<"urbana" | "territorio">("urbana");
  const [mobileTab, setMobileTab] = useState<"mapa" | "lista">("mapa");
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);

  const activeSelectedObraId =
    externalSelectedObraId !== undefined
      ? externalSelectedObraId
      : internalSelectedObraId;

  // Filtra as obras no client-side para resposta instantânea com suporte a acentuação
  const filteredObras = useMemo(() => {
    return viewModel.obras.filter((obra) => {
      const matchStatus =
        selectedStatus === "todas" ? true : obra.situacao === selectedStatus;

      const termo = normalizeText(buscaText.trim());
      const matchBusca =
        termo.length < 2
          ? true
          : normalizeText(obra.nomeObra).includes(termo) ||
            normalizeText(obra.idProjeto).includes(termo) ||
            (obra.executorNome
              ? normalizeText(obra.executorNome).includes(termo)
              : false) ||
            (obra.orgaoResponsavel
              ? normalizeText(obra.orgaoResponsavel).includes(termo)
              : false);

      return matchStatus && matchBusca;
    });
  }, [viewModel.obras, selectedStatus, buscaText]);

  // Marcadores georreferenciados correspondentes às obras filtradas
  const activeMarkers = useMemo<ObraMarkerItem[]>(() => {
    return filteredObras
      .filter(
        (o) => o.hasCoordinates && o.latitude !== null && o.longitude !== null,
      )
      .map((o) => ({
        idProjeto: o.idProjeto,
        nomeObra: o.nomeObra,
        situacao: o.situacao,
        situacaoLabel: o.situacaoLabel,
        situacaoCorPreenchimento: o.situacaoCorPreenchimento,
        latitude: o.latitude as number,
        longitude: o.longitude as number,
        isUrbana: o.isUrbana,
        valorInvestimentoFormatado: o.valorInvestimentoFormatado,
        percentualExecucaoFormatado: o.percentualExecucaoFormatado,
        orgaoResponsavel: o.executorNome || o.orgaoResponsavel,
        executorNome: o.executorNome || null,
        dataFimPrevistaFormatada: o.dataFimPrevistaFormatada,
      }));
  }, [filteredObras]);

  // Atualiza parâmetros da URL preservando o filtro de ano existente
  const updateUrlParams = (
    novoStatus: SituacaoObraFiltro,
    novoTexto: string,
  ) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (novoStatus !== "todas") {
      params.set("status", novoStatus);
    } else {
      params.delete("status");
    }

    if (novoTexto.trim().length >= 2) {
      params.set("busca", novoTexto.trim());
    } else {
      params.delete("busca");
    }

    pendingFiltrosRef.current = [
      ...pendingFiltrosRef.current,
      {
        status: novoStatus,
        busca: novoTexto.trim().length >= 2 ? novoTexto.trim() : "",
      },
    ];
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleStatusChange = (status: SituacaoObraFiltro) => {
    setSelectedStatus(status);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    updateUrlParams(status, buscaText);
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBuscaText(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateUrlParams(selectedStatus, val);
    }, 300);
  };

  const handleClearBusca = () => {
    setBuscaText("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    updateUrlParams(selectedStatus, "");
  };

  const handleSelectObra = useCallback(
    (idProjeto: string) => {
      const nextId = activeSelectedObraId === idProjeto ? null : idProjeto;
      if (externalOnSelectObra) {
        externalOnSelectObra(nextId);
      } else {
        setInternalSelectedObraId(nextId);
      }

      if (!nextId) return;

      // Scroll suave do item na lista ou carrossel se selecionado pelo mapa
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        const el = document.getElementById(`obra-item-${idProjeto}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        const mobileCard = document.getElementById(`mobile-card-${idProjeto}`);
        if (mobileCard) {
          mobileCard.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      }, 50);
    },
    [activeSelectedObraId, externalOnSelectObra],
  );

  const handleOpenDetalheModal = useCallback((obra: ObraItemViewModel) => {
    setDetalheModalObra(obra);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("idProjeto", obra.idProjeto);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const handleCloseDetalheModal = useCallback(() => {
    setDetalheModalObra(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("idProjeto")) {
        url.searchParams.delete("idProjeto");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : "") + (url.hash || ""),
        );
      }
    }
  }, []);

  // Deep linking para abrir o modal de detalhes diretamente via query string ?idProjeto=...
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkUrlDeepLink = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const idProjetoParam = urlParams.get("idProjeto");
      if (idProjetoParam) {
        const found = viewModel.obras.find(
          (o) => o.idProjeto === idProjetoParam,
        );
        if (found) {
          setDetalheModalObra(found);
          handleSelectObra(found.idProjeto);
        }
      }
    };

    if (!hasCheckedDeepLinkRef.current) {
      hasCheckedDeepLinkRef.current = true;
      checkUrlDeepLink();
    }

    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const idProjetoParam = urlParams.get("idProjeto");
      if (idProjetoParam) {
        const found = viewModel.obras.find(
          (o) => o.idProjeto === idProjetoParam,
        );
        if (found) {
          setDetalheModalObra(found);
        }
      } else {
        setDetalheModalObra(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [viewModel.obras, handleSelectObra]);

  const subtextoTerritorio = (() => {
    if (viewMode === "territorio") {
      return "Exibe todas as intervenções mapeadas no território municipal e em rodovias.";
    }
    const count = viewModel.obrasForaUrbanaCount;
    if (count === 1) {
      return `1 obra localizada fora do perímetro urbano central.`;
    }
    if (count > 1) {
      return `${count} obras localizadas fora do perímetro urbano central.`;
    }
    return `Obras georreferenciadas na área urbana do município.`;
  })();

  return (
    <section
      id="secao-mapa-obras"
      className="scroll-mt-20 space-y-4 lg:scroll-mt-4"
    >
      <SectionHeader
        title="Onde estão as obras"
        description={subtextoTerritorio}
        className="pb-1"
      />
      <div className="lg:hidden">
        {/* Controles à Direita: Mobile Toggle [Mapa | Lista] ou Desktop Selector [Área urbana | Todo o território] */}
        <div>
          {/* Mobile Toggle: [Mapa | Lista] (apenas em telas < lg) */}
          <div className="border-line bg-line2 grid grid-cols-2 gap-1 rounded-md border p-1 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileTab("mapa");
                setTimeout(() => {
                  window.dispatchEvent(new Event("resize"));
                }, 50);
              }}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mobileTab === "mapa"
                  ? "border-line bg-page text-ink border"
                  : "text-mute hover:bg-track hover:text-ink"
              }`}
            >
              Mapa
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("lista")}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mobileTab === "lista"
                  ? "border-line bg-page text-ink border"
                  : "text-mute hover:bg-track hover:text-ink"
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* CARD INTEGRADO ÚNICO: Filtros no Topo, Lista à Esquerda e Mapa à Direita */}
      <div className="space-y-4">
        {/* Barra de filtros, sem moldura */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Pílulas de Status */}
          <div
            role="tablist"
            aria-label="Filtro por situação da obra"
            className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center"
          >
            {STATUS_FILTROS.map((f) => {
              const isSelected = selectedStatus === f.id;
              const count = f.countKey ? viewModel.kpis[f.countKey] : undefined;
              if (
                f.id === "cancelada" &&
                (count === undefined || count === 0)
              ) {
                return null;
              }
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleStatusChange(f.id)}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:justify-start ${
                    isSelected
                      ? "border-ink bg-ink text-onink border"
                      : "border-line bg-page text-mute hover:bg-line2 border"
                  }`}
                >
                  {f.dotColor && !isSelected && (
                    <span className={`h-2 w-2 rounded-full ${f.dotColor}`} />
                  )}
                  <span>{f.label}</span>
                  {typeof count === "number" && (
                    <span className="tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop Selector: Área Urbana / Todo o Território (apenas em telas lg+) */}
          <div className="border-line bg-line2 hidden shrink-0 items-center space-x-1 rounded-md border p-1 lg:flex">
            <button
              type="button"
              onClick={() => setViewMode("urbana")}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "urbana"
                  ? "border-line bg-page text-ink border"
                  : "text-mute hover:bg-track hover:text-ink"
              }`}
            >
              Área urbana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("territorio")}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "territorio"
                  ? "border-line bg-page text-ink border"
                  : "text-mute hover:bg-track hover:text-ink"
              }`}
            >
              Todo o território
            </button>
          </div>
        </div>

        {/* Área Principal Integrada: Lista na Esquerda | Mapa na Direita */}
        <div className="border-line bg-page grid min-h-[580px] grid-cols-1 overflow-hidden rounded-md border lg:grid-cols-12">
          {/* Coluna de Lista:
              - No desktop (lg+): sempre visível ocupando 5 colunas com borda à direita
              - No mobile (< lg): visível apenas se mobileTab === "lista", ocupando largura total (100%)
          */}
          <div
            className={`border-line flex-col lg:col-span-5 lg:flex lg:border-r ${
              mobileTab === "lista" ? "flex w-full" : "hidden"
            }`}
          >
            {/* Campo de Busca */}
            <div className="border-line relative w-full border-b">
              <input
                type="text"
                value={buscaText}
                onChange={handleBuscaChange}
                placeholder="Buscar obra ou órgão"
                aria-label="Buscar obras públicas"
                className="bg-page text-ink placeholder:text-mute2 focus-visible:outline-brand-fill w-full py-3 pr-10 pl-4 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2"
              />
              {buscaText.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBusca}
                  aria-label="Limpar busca"
                  className="text-mute2 hover:text-mute absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sub-cabeçalho da Lista */}
            <div className="border-line text-mute2 flex items-center justify-between border-b px-4 py-2.5 text-xs">
              <span className="font-medium tabular-nums">
                {filteredObras.length} de {viewModel.obras.length} obras
              </span>
              <span>Maior valor primeiro</span>
            </div>

            {/* Lista Scrollável de Obras */}
            <div
              ref={cardListRef}
              className="divide-line max-h-[580px] flex-1 divide-y overflow-y-auto"
            >
              {filteredObras.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MapPinOff className="text-mute2 mb-2 h-7 w-7" />
                  <p className="text-mute text-xs font-medium">
                    Nenhuma obra encontrada
                  </p>
                  <p className="text-mute2 mt-0.5 text-xs">
                    Tente alterar os filtros de situação ou o termo de busca.
                  </p>
                </div>
              ) : (
                filteredObras.map((obra) => {
                  const isSelected = activeSelectedObraId === obra.idProjeto;
                  const pct = obra.percentualExecucaoFisica ?? 0;

                  return (
                    <div
                      key={obra.idProjeto}
                      id={`obra-item-${obra.idProjeto}`}
                      className={`w-full p-4 text-left transition-colors ${
                        isSelected ? "bg-line2" : "hover:bg-line2"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectObra(obra.idProjeto)}
                        className="w-full cursor-pointer text-left"
                      >
                        {/* Linha 1: Dot de Status + Título à Esquerda | Valor Compacto à Direita */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: obra.situacaoCorPreenchimento,
                              }}
                            />
                            <div className="text-ink line-clamp-2 text-xs leading-snug font-bold sm:text-sm">
                              {obra.nomeObra}
                            </div>
                          </div>

                          <span className="text-ink shrink-0 text-xs font-bold tabular-nums sm:text-sm">
                            {fmtCompact(obra.valorInvestimentoPrevisto)}
                          </span>
                        </div>

                        {/* Linha 2: Situação · Órgão Executor à Esquerda | Percentual à Direita */}
                        <div className="text-mute2 mt-1 flex items-center justify-between pl-4 text-xs">
                          <span className="truncate">
                            {obra.situacaoLabel} ·{" "}
                            {obra.executorNome || obra.orgaoResponsavel}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {obra.percentualExecucaoFisica !== null
                              ? `${Math.round(pct)}% físico`
                              : "Sem medição"}
                          </span>
                        </div>

                        {/* Linha 3: Barra de Progresso Físico */}
                        <div className="mt-2 pl-4">
                          <div className="bg-line2 h-1 w-full overflow-hidden">
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                                backgroundColor: obra.situacaoCorPreenchimento,
                              }}
                              className="h-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      </button>

                      {/* BOX EXPANDIDO DE DETALHES (quando selecionado) */}
                      {isSelected && (
                        <div className="border-line bg-page relative mt-3 ml-4 space-y-2.5 border p-3.5 pr-8 text-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectObra(obra.idProjeto);
                            }}
                            aria-label="Fechar detalhes da obra"
                            className="text-mute2 hover:bg-line2 hover:text-mute absolute top-2.5 right-2.5 cursor-pointer rounded p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <div>
                            <span className="text-mute2 block text-xs font-semibold tracking-wider uppercase">
                              Órgão Executor
                            </span>
                            <span className="text-ink text-xs font-medium">
                              {obra.executorNome || obra.orgaoResponsavel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-mute2 block text-xs font-semibold tracking-wider uppercase">
                                Previsão
                              </span>
                              <span className="text-ink text-xs font-medium">
                                {formatarPrevisao(
                                  obra.dataInicioPrevista,
                                  obra.dataFimPrevista,
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-mute2 block text-xs font-semibold tracking-wider uppercase">
                                Última Medição
                              </span>
                              <span className="text-ink text-xs font-medium">
                                {obra.dataUltimaMedicaoFormatada || "N/D"}
                              </span>
                            </div>
                          </div>

                          {/* Ações: Detalhes da Obra + Link Oficial ObrasGov */}
                          <div className="border-line flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetalheModal(obra)}
                              className="text-brand-text inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
                            >
                              <span>Ver detalhes</span>
                              <span aria-hidden="true">&rarr;</span>
                            </button>

                            <a
                              href={urlObraCipi(obra.idProjeto)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-mute2 hover:text-ink inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            >
                              <span>Ver no Cadastro de Obras</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna do Mapa:
              - No desktop (lg+): sempre visível ocupando 7 colunas
              - No mobile (< lg): visível apenas se mobileTab === "mapa", com carrossel horizontal de cards abaixo
          */}
          <div
            className={`flex-col lg:col-span-7 lg:flex ${
              mobileTab === "mapa" ? "flex w-full" : "hidden"
            }`}
          >
            {/* Container do Mapa Leaflet */}
            <div className="relative h-[65svh] min-h-[380px] w-full sm:h-[450px] lg:h-full lg:min-h-[580px]">
              {/* Botão flutuante toggle no mapa (visível no mobile para alternar área urbana / território) */}
              <div className="absolute top-3 left-15 z-10 lg:hidden">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) =>
                      prev === "urbana" ? "territorio" : "urbana",
                    )
                  }
                  className="border-line bg-page/95 text-ink cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold backdrop-blur-xs"
                >
                  {viewMode === "urbana"
                    ? "Ver todo o território"
                    : "Ver área urbana"}
                </button>
              </div>

              <ObrasMapaInterativo
                markers={activeMarkers}
                center={viewModel.mapCenter}
                urbanBounds={viewModel.urbanBounds}
                territorioBounds={viewModel.territorioBounds}
                viewMode={viewMode}
                selectedObraId={activeSelectedObraId}
                onSelectObra={handleSelectObra}
              />
            </div>

            {/* Carrossel Horizontal Mobile de Cards (apenas no mobile quando o mapa está ativo) */}
            <div className="border-line bg-line2 border-t p-4 lg:hidden">
              <div
                ref={mobileCarouselRef}
                className="flex snap-x snap-mandatory scrollbar-none gap-3 overflow-x-auto pb-2"
              >
                {filteredObras.length === 0 ? (
                  <div className="border-line bg-page w-full border p-6 text-center">
                    <p className="text-mute text-xs font-medium">
                      Nenhuma obra encontrada
                    </p>
                  </div>
                ) : (
                  filteredObras.map((obra, idx) => {
                    const isSelected = activeSelectedObraId === obra.idProjeto;
                    const pct = obra.percentualExecucaoFisica ?? 0;

                    return (
                      <div
                        key={obra.idProjeto}
                        id={`mobile-card-${obra.idProjeto}`}
                        className={`bg-page w-[85%] max-w-[320px] shrink-0 snap-center border p-4 transition-all ${
                          isSelected
                            ? "border-brand-fill ring-brand-fill ring-2"
                            : "border-line"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectObra(obra.idProjeto)}
                          className="w-full cursor-pointer text-left"
                        >
                          {/* Topo do Card: Dot + Status | Contador X/Total */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-mute flex items-center gap-1.5 font-medium">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    obra.situacaoCorPreenchimento,
                                }}
                              />
                              <span>{obra.situacaoLabel}</span>
                            </div>
                            <span className="text-mute2 tabular-nums">
                              {idx + 1}/{filteredObras.length}
                            </span>
                          </div>

                          {/* Título da Obra (2 linhas) */}
                          <h3 className="mt-2.5 line-clamp-2 min-h-[2.5rem]">
                            {obra.nomeObra}
                          </h3>

                          {/* Órgão Executor */}
                          <p className="text-mute2 mt-1 truncate text-xs">
                            {obra.executorNome || obra.orgaoResponsavel}
                          </p>

                          {/* Barra de Progresso Físico */}
                          <div className="mt-3">
                            <div className="text-mute2 mb-1 flex items-center justify-end text-xs">
                              <span>
                                {obra.percentualExecucaoFisica !== null
                                  ? `${Math.round(pct)}% físico`
                                  : "Sem medição"}
                              </span>
                            </div>
                            <div className="bg-line2 h-1.5 w-full overflow-hidden">
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, pct))}%`,
                                  backgroundColor:
                                    obra.situacaoCorPreenchimento,
                                }}
                                className="h-full transition-all duration-300"
                              />
                            </div>
                          </div>
                        </button>

                        {/* Rodapé: Valor à esquerda + Link Detalhes à direita */}
                        <div className="border-line mt-3.5 flex items-center justify-between border-t pt-3">
                          <span className="text-ink text-sm font-bold tabular-nums">
                            {fmtCompact(obra.valorInvestimentoPrevisto)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetalheModal(obra);
                            }}
                            className="text-brand-text inline-flex cursor-pointer items-center gap-1 text-xs font-semibold"
                          >
                            <span>Ver detalhes</span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Legenda de apoio */}
              <p className="text-mute2 mt-2 text-center text-xs">
                Deslize os cards ou toque num ponto do mapa
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes da Obra vinculado à URL ?idProjeto=... */}
      <ObrasDetalheModal
        isOpen={Boolean(detalheModalObra)}
        onClose={handleCloseDetalheModal}
        obra={detalheModalObra}
        portalSlug={viewModel.portalSlug}
      />
    </section>
  );
}
