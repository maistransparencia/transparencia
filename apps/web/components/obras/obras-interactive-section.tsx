"use client";

import type { SituacaoObraFiltro } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import { ExternalLink, MapPinOff, X } from "lucide-react";
import nextDynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type {
  ObraMarkerItem,
  ObrasViewModel,
} from "@/app/[portalSlug]/obras/view-model";

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
      <div className="flex h-full min-h-[580px] w-full animate-pulse items-center justify-center bg-slate-50">
        <span className="font-medium text-slate-400 text-sm">
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
    dotColor: "bg-blue-600",
    countKey: "emExecucao",
  },
  {
    id: "paralisada",
    label: "Paralisada",
    dotColor: "bg-rose-500",
    countKey: "paralisadas",
  },
  {
    id: "concluida",
    label: "Concluída",
    dotColor: "bg-emerald-600",
    countKey: "concluidas",
  },
  {
    id: "cadastrada",
    label: "Cadastrada",
    dotColor: "bg-slate-400",
    countKey: "cadastradas",
  },
  {
    id: "cancelada",
    label: "Cancelada",
    dotColor: "bg-zinc-400",
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

  const [selectedStatus, setSelectedStatus] = useState<SituacaoObraFiltro>(
    viewModel.filtros.status,
  );
  const [buscaText, setBuscaText] = useState<string>(
    viewModel.filtros.busca ?? "",
  );
  const [internalSelectedObraId, setInternalSelectedObraId] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<"urbana" | "territorio">("urbana");
  const [_mobileTab, _setMobileTab] = useState<"mapa" | "lista">("mapa");
  const _mobileCarouselRef = useRef<HTMLDivElement | null>(null);

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
            normalizeText(obra.orgaoResponsavel).includes(termo);

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
        situacaoColorHex: o.situacaoColorHex,
        latitude: o.latitude as number,
        longitude: o.longitude as number,
        isUrbana: o.isUrbana,
        valorInvestimentoFormatado: o.valorInvestimentoFormatado,
        percentualExecucaoFormatado: o.percentualExecucaoFormatado,
        orgaoResponsavel: o.orgaoResponsavel,
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

  const handleSelectObra = (idProjeto: string) => {
    if (externalOnSelectObra) {
      externalOnSelectObra(idProjeto);
    } else {
      setInternalSelectedObraId(idProjeto);
    }

    // Scroll suave do item na lista ou carrossel se selecionado pelo mapa
    setTimeout(() => {
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
  };

  const subtextoTerritorio = (() => {
    if (viewMode === "territorio") {
      return "Inclui obras em rodovias federais e estaduais que atravessam o município.";
    }
    const count = viewModel.obrasForaUrbanaCount;
    if (count === 1) {
      return `1 obra de órgãos federais e estaduais fica fora da área urbana e não aparece neste enquadramento.`;
    }
    if (count > 1) {
      return `${count} obras de órgãos federais e estaduais ficam fora da área urbana e não aparecem neste enquadramento.`;
    }
    return `Obras georreferenciadas na área urbana do município.`;
  })();

  return (
    <section
      id="secao-mapa-obras"
      className="space-y-4 border-ink border-t-2 pt-8"
    >
      {/* Cabeçalho Externo: Título + Subtexto/Fonte à Esquerda | Seletor de Território à Direita */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold font-serif text-2xl text-slate-900">
              Onde estão as obras
            </h2>
            <a
              href="https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-[11px] text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            >
              <span>Fonte: ObrasGov.br</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-1 text-slate-600 text-sm">{subtextoTerritorio}</p>
        </div>

        {/* Botões de alternância Área Urbana / Todo o Território */}
        <div className="flex shrink-0 items-center space-x-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode("urbana")}
            className={`rounded-md px-3.5 py-1.5 font-semibold text-xs transition-colors ${
              viewMode === "urbana"
                ? "border border-slate-200/80 bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
          >
            Área urbana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("territorio")}
            className={`rounded-md px-3.5 py-1.5 font-semibold text-xs transition-colors ${
              viewMode === "territorio"
                ? "border border-slate-200/80 bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
          >
            Todo o território
          </button>
        </div>
      </div>

      {/* CARD INTEGRADO ÚNICO: Filtros no Topo, Lista à Esquerda e Mapa à Direita */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Barra Superior de Filtros e Busca (Integrada ao Card) */}
        <div className="flex flex-col gap-4 border-slate-200 border-b p-4 md:flex-row md:items-center md:justify-between">
          {/* Pílulas de Status */}
          <div
            role="tablist"
            aria-label="Filtro por situação da obra"
            className="flex flex-wrap items-center gap-1.5"
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
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-xs transition-colors ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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

          {/* Campo de Busca */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={buscaText}
              onChange={handleBuscaChange}
              placeholder="Buscar obra ou órgão"
              aria-label="Buscar obras públicas"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {buscaText.length > 0 && (
              <button
                type="button"
                onClick={handleClearBusca}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Área Principal Integrada: Lista na Esquerda | Mapa na Direita */}
        <div className="grid min-h-[580px] grid-cols-1 lg:grid-cols-12">
          {/* Coluna Esquerda: Lista de Obras */}
          <div className="flex flex-col border-slate-200 border-r lg:col-span-5">
            {/* Sub-cabeçalho da Lista */}
            <div className="flex items-center justify-between border-slate-100 border-b px-4 py-2.5 text-slate-500 text-xs">
              <span className="font-medium tabular-nums">
                {filteredObras.length} de {viewModel.obras.length} obras
              </span>
              <span>Maior valor primeiro</span>
            </div>

            {/* Lista Scrollável de Obras */}
            <div
              ref={cardListRef}
              className="max-h-[580px] flex-1 divide-y divide-slate-100 overflow-y-auto"
            >
              {filteredObras.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MapPinOff className="mb-2 h-7 w-7 text-slate-400" />
                  <p className="font-medium text-slate-700 text-xs">
                    Nenhuma obra encontrada
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
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
                        isSelected ? "bg-slate-50/90" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectObra(obra.idProjeto)}
                        className="w-full text-left"
                      >
                        {/* Linha 1: Dot de Status + Título à Esquerda | Valor Compacto à Direita */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: obra.situacaoColorHex }}
                            />
                            <div className="line-clamp-2 font-bold text-slate-900 text-xs leading-snug sm:text-sm">
                              {obra.nomeObra}
                            </div>
                          </div>

                          <span className="shrink-0 font-bold text-slate-900 text-xs tabular-nums sm:text-sm">
                            {fmtCompact(obra.valorInvestimentoPrevisto)}
                          </span>
                        </div>

                        {/* Linha 2: Situação · Órgão à Esquerda | Percentual à Direita */}
                        <div className="mt-1 flex items-center justify-between pl-4 text-slate-500 text-xs">
                          <span className="truncate">
                            {obra.situacaoLabel} · {obra.orgaoResponsavel}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {obra.percentualExecucaoFisica !== null
                              ? `${Math.round(pct)}% físico`
                              : "Sem medição"}
                          </span>
                        </div>

                        {/* Linha 3: Barra de Progresso Físico */}
                        <div className="mt-2 pl-4">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                                backgroundColor: obra.situacaoColorHex,
                              }}
                              className="h-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      </button>

                      {/* BOX EXPANDIDO DE DETALHES (quando selecionado - Conforme Screenshot 1) */}
                      {isSelected && (
                        <div className="mt-3 ml-4 space-y-2.5 rounded-lg border border-slate-200 bg-white p-3.5 text-xs shadow-2xs">
                          <div>
                            <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                              Órgão Responsável
                            </span>
                            <span className="font-medium text-slate-900 text-xs">
                              {obra.orgaoResponsavel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                                Previsão
                              </span>
                              <span className="font-medium text-slate-900 text-xs">
                                {formatarPrevisao(
                                  obra.dataInicioPrevista,
                                  obra.dataFimPrevista,
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                                Última Medição
                              </span>
                              <span className="font-medium text-slate-900 text-xs">
                                {obra.dataUltimaMedicaoFormatada || "N/D"}
                              </span>
                            </div>
                          </div>

                          {/* Link Oficial para o Cadastro de Obras */}
                          <div className="border-slate-100 border-t pt-2">
                            <a
                              href={`https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/${encodeURIComponent(obra.idProjeto)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-blue-600 text-xs hover:text-blue-800 hover:underline"
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

          {/* Coluna Direita: Mapa Leaflet Integrado */}
          <div className="relative h-full min-h-[580px] lg:col-span-7">
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
        </div>
      </div>
    </section>
  );
}
