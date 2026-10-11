"use client";

import type { SituacaoObraFiltro } from "@transparencia/db";
import { AlertTriangle, Building2, MapPinOff, Search, X } from "lucide-react";
import nextDynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type {
  ObraItemViewModel,
  ObraMarkerItem,
  ObrasViewModel,
} from "@/app/[portalSlug]/obras/view-model";
import { ObrasPainelResumo } from "./obras-painel-resumo";

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const ObrasMapaInterativo = nextDynamic(
  () =>
    import("./obras-mapa-interativo").then((mod) => mod.ObrasMapaInterativo),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[450px] w-full animate-pulse items-center justify-center rounded-xl border border-slate-200 bg-slate-100 md:h-[550px]">
        <span className="font-medium text-slate-400 text-sm">
          Carregando mapa interativo...
        </span>
      </div>
    ),
  },
);

export interface ObrasInteractiveSectionProps {
  viewModel: ObrasViewModel;
}

const STATUS_FILTROS: {
  id: SituacaoObraFiltro;
  label: string;
  countKey?: keyof ObrasViewModel["kpis"];
}[] = [
  { id: "todas", label: "Todas", countKey: "totalObras" },
  { id: "em_execucao", label: "Em Execução", countKey: "emExecucao" },
  { id: "paralisada", label: "Paralisadas", countKey: "paralisadas" },
  { id: "concluida", label: "Concluídas", countKey: "concluidas" },
  { id: "cadastrada", label: "Cadastradas", countKey: "cadastradas" },
];

export function ObrasInteractiveSection({
  viewModel,
}: ObrasInteractiveSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<SituacaoObraFiltro>(
    viewModel.filtros.status,
  );
  const [buscaText, setBuscaText] = useState<string>(
    viewModel.filtros.busca ?? "",
  );
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);

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
        valorInvestimentoFormatado: o.valorInvestimentoFormatado,
        percentualExecucaoFormatado: o.percentualExecucaoFormatado,
        orgaoResponsavel: o.orgaoResponsavel,
        dataFimPrevistaFormatada: o.dataFimPrevistaFormatada,
      }));
  }, [filteredObras]);

  const selectedObra = useMemo<ObraItemViewModel | null>(() => {
    if (!selectedObraId) return null;
    return viewModel.obras.find((o) => o.idProjeto === selectedObraId) ?? null;
  }, [selectedObraId, viewModel.obras]);

  // Atualiza parâmetros da URL de forma idempotente
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
    setSelectedObraId(idProjeto);
  };

  const handleClosePainel = () => {
    setSelectedObraId(null);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        {/* Pílulas de Status */}
        <div
          role="tablist"
          aria-label="Filtro por situação da obra"
          className="flex flex-wrap items-center gap-2"
        >
          {STATUS_FILTROS.map((f) => {
            const isSelected = selectedStatus === f.id;
            const count = f.countKey ? viewModel.kpis[f.countKey] : undefined;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleStatusChange(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{f.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                      isSelected
                        ? "bg-slate-800 text-slate-200"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscaText}
            onChange={handleBuscaChange}
            placeholder="Buscar por nome ou órgão..."
            aria-label="Buscar obras públicas"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-9 text-slate-900 text-xs shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Grid Principal: Mapa + Lista Lateral */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna do Mapa (Lado Esquerdo / Topo Mobile) */}
        <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
          <div className="relative h-[420px] w-full rounded-xl md:h-[540px]">
            <ObrasMapaInterativo
              markers={activeMarkers}
              center={viewModel.mapCenter}
              selectedObraId={selectedObraId}
              onSelectObra={handleSelectObra}
            />

            {/* Painel Resumo Flutuante / Integrado ao selecionar obra */}
            {selectedObra && (
              <div className="absolute right-4 bottom-4 left-4 z-40 max-h-[85%] overflow-y-auto md:right-4 md:bottom-4 md:left-auto md:max-w-md">
                <ObrasPainelResumo
                  obra={selectedObra}
                  onClose={handleClosePainel}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-slate-500 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Em Execução
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Paralisada
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                Concluída
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Cadastrada
              </span>
            </div>

            <span className="tabular-nums">
              {activeMarkers.length} georreferenciadas de {filteredObras.length}{" "}
              exibidas
            </span>
          </div>
        </div>

        {/* Coluna da Lista de Obras (Lado Direito / Abaixo Mobile) */}
        <div className="space-y-3 lg:col-span-5 xl:col-span-4">
          <div className="flex items-center justify-between border-slate-200 border-b pb-2">
            <h2 className="font-bold font-serif text-slate-900 text-sm">
              Lista de Obras Públicas ({filteredObras.length})
            </h2>
            {selectedObraId && (
              <button
                type="button"
                onClick={handleClosePainel}
                className="text-blue-600 text-xs hover:underline"
              >
                Limpar seleção
              </button>
            )}
          </div>

          {filteredObras.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
              <p className="font-medium text-slate-700 text-sm">
                Nenhuma obra encontrada para os critérios selecionados.
              </p>
              <p className="mt-1 text-slate-500 text-xs">
                Tente ajustar os filtros ou limpar o termo de busca.
              </p>
              {(selectedStatus !== "todas" || buscaText.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus("todas");
                    setBuscaText("");
                    updateUrlParams("todas", "");
                  }}
                  className="mt-4 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 text-xs hover:bg-slate-200"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {filteredObras.map((obra) => {
                const isSelected = selectedObraId === obra.idProjeto;
                const isParalisada = obra.situacao === "paralisada";

                return (
                  <button
                    key={obra.idProjeto}
                    type="button"
                    onClick={() => handleSelectObra(obra.idProjeto)}
                    aria-label={`Ver detalhes da obra ${obra.nomeObra}`}
                    className={`w-full rounded-xl border p-4 text-left shadow-xs transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold text-[11px] ${obra.situacaoBadgeClasses}`}
                      >
                        {obra.situacaoLabel}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {obra.idProjeto}
                      </span>
                    </div>

                    <h3 className="mt-2 font-bold font-serif text-slate-900 text-sm leading-snug">
                      {obra.nomeObra}
                    </h3>

                    <p className="mt-1 flex items-center gap-1 text-slate-500 text-xs">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span className="truncate">{obra.orgaoResponsavel}</span>
                    </p>

                    {isParalisada && obra.motivoParalisacao && (
                      <div className="mt-2 flex items-start gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                        <span className="line-clamp-2">
                          {obra.motivoParalisacao}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 border-slate-100 border-t pt-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400">
                          Investimento
                        </span>
                        <span className="font-semibold text-slate-900">
                          {obra.valorInvestimentoFormatado}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">
                          Execução Física
                        </span>
                        <span
                          className={`font-semibold ${
                            isParalisada ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {obra.percentualExecucaoFormatado}
                        </span>
                      </div>
                    </div>

                    {!obra.hasCoordinates && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                        <MapPinOff className="h-3 w-3" />
                        <span>Localização não georreferenciada</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
