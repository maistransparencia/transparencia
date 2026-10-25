"use client";

import type { ResumoObrasDTO } from "@transparencia/db";
import {
  corDoGrafico,
  ExternalLinkPill,
  fmtCompact,
  fmtNumber,
} from "@transparencia/ui";
import { AlertCircle, ArrowRight, Info, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { getTileCoordinates, projectCoordToTilePercent } from "@/lib/tile-calc";

const OBRASGOV_PANEL_URL =
  "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html";

export interface ObraMiniMapMarker {
  id: string;
  situacao: string;
  latitude: number;
  longitude: number;
}

export interface ObrasResumoCardProps {
  resumo?: ResumoObrasDTO | null;
  detailUrl: string;
  markers?: ObraMiniMapMarker[];
  center?: [number, number];
  className?: string;
}

export function ObrasResumoCard({
  resumo,
  detailUrl,
  markers,
  center,
  className = "",
}: ObrasResumoCardProps) {
  if (!resumo || resumo.totalObras <= 0) {
    return (
      <section
        aria-label="Obras Públicas e Investimentos Urbanos"
        className={`border-line border-t py-5 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-base text-ink tracking-tight">
              Obras Públicas e Investimentos Urbanos
            </h3>
            <p className="text-mute2 text-xs">
              Painel oficial de intervenções urbanas (ObrasGov.br)
            </p>
          </div>
          <ExternalLinkPill
            href={OBRASGOV_PANEL_URL}
            title="Painel de Obras Públicas do Governo Federal"
          >
            ObrasGov.br
          </ExternalLinkPill>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center border-line border-y p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-mute3" />
          <p className="font-medium text-ink text-sm">
            Nenhuma obra ou intervenção pública registrada no ObrasGov.br para o
            período.
          </p>
          <div className="mt-3">
            <Link
              href={detailUrl}
              onClick={() => {
                try {
                  posthog.capture("obras_card_cta_clicked", {
                    detailUrl,
                    totalObras: 0,
                  });
                  posthog.capture("funnel_home_to_internal_page", {
                    from: "obras_resumo_card_empty_state",
                    to: detailUrl,
                  });
                } catch {
                  // Silencia erros de telemetria
                }
              }}
              className="inline-flex items-center gap-1 font-semibold text-brand text-xs hover:underline"
            >
              <span>Ver mapa e detalhes das obras</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const {
    totalObras,
    emExecucao,
    paralisadas,
    concluidas,
    cadastradas,
    valorTotalInvestimento,
    valorEmExecucao,
    valorParalisadas,
    valorConcluidas,
    valorCadastradas,
  } = resumo;

  const totalCategoriasValor =
    valorEmExecucao + valorConcluidas + valorCadastradas + valorParalisadas;
  const isDistribuicaoPorValor = totalCategoriasValor > 0;

  const { pctEmExecucao, pctConcluidas, pctCadastradas, pctParalisadas } =
    (() => {
      if (totalCategoriasValor > 0) {
        const baseValor =
          valorTotalInvestimento > 0
            ? valorTotalInvestimento
            : totalCategoriasValor;
        return {
          pctEmExecucao: Math.min(
            Math.max((valorEmExecucao / baseValor) * 100, 0),
            100,
          ),
          pctConcluidas: Math.min(
            Math.max((valorConcluidas / baseValor) * 100, 0),
            100,
          ),
          pctCadastradas: Math.min(
            Math.max((valorCadastradas / baseValor) * 100, 0),
            100,
          ),
          pctParalisadas: Math.min(
            Math.max((valorParalisadas / baseValor) * 100, 0),
            100,
          ),
        };
      }
      if (totalObras > 0) {
        return {
          pctEmExecucao: Math.min(
            Math.max((emExecucao / totalObras) * 100, 0),
            100,
          ),
          pctConcluidas: Math.min(
            Math.max((concluidas / totalObras) * 100, 0),
            100,
          ),
          pctCadastradas: Math.min(
            Math.max((cadastradas / totalObras) * 100, 0),
            100,
          ),
          pctParalisadas: Math.min(
            Math.max((paralisadas / totalObras) * 100, 0),
            100,
          ),
        };
      }
      return {
        pctEmExecucao: 0,
        pctConcluidas: 0,
        pctCadastradas: 0,
        pctParalisadas: 0,
      };
    })();

  const labelPrefixo = isDistribuicaoPorValor
    ? "Distribuição do investimento"
    : "Distribuição das obras";
  const ariaLabel = `${labelPrefixo}: ${Math.round(pctEmExecucao)}% em execução, ${Math.round(pctConcluidas)}% concluídas, ${Math.round(pctCadastradas)}% não iniciadas, ${Math.round(pctParalisadas)}% paralisadas`;

  // Mini Mapa Estático (Projeção Web Mercator via ArcGIS Light Gray Base)
  const tileInfo = center ? getTileCoordinates(center[0], center[1], 14) : null;

  const validMarkers = (markers ?? [])
    .filter(
      (m) =>
        Number.isFinite(m.latitude) &&
        Number.isFinite(m.longitude) &&
        m.latitude !== 0 &&
        m.longitude !== 0,
    )
    .flatMap((m) => {
      if (!tileInfo) return [];
      const { xPercent, yPercent } = projectCoordToTilePercent(
        m.latitude,
        m.longitude,
        tileInfo,
      );
      return [
        {
          ...m,
          xPercent,
          yPercent,
        },
      ];
    });

  const getMarkerBgClass = (situacao: string) => {
    switch (situacao) {
      case "em_execucao":
        return "bg-brand ring-brand/40";
      case "concluida":
        return "bg-ok ring-ok/40";
      case "paralisada":
        return "bg-danger ring-danger/40";
      default:
        return "bg-mute3 ring-line";
    }
  };

  return (
    <section
      aria-label="Obras Públicas"
      className={`border-ink border-t-2 pt-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h3 className="font-semibold font-serif text-base text-ink sm:text-lg">
            Obras Públicas
          </h3>
          <ExternalLinkPill
            href={OBRASGOV_PANEL_URL}
            title="Painel de Obras Públicas do Governo Federal"
            className="px-2.5 py-0.5 font-mono text-[10px] tracking-wider"
          >
            ObrasGov.br
          </ExternalLinkPill>
        </div>
        <Link
          href={detailUrl}
          onClick={() => {
            try {
              posthog.capture("obras_card_cta_clicked", {
                detailUrl,
                totalObras,
              });
              posthog.capture("funnel_home_to_internal_page", {
                from: "obras_resumo_card_footer",
                to: detailUrl,
              });
            } catch {
              // Silencia erros de telemetria
            }
          }}
          className="inline-flex items-center gap-1 font-medium text-brand text-xs hover:underline"
        >
          <span>Ver mapa e detalhes das obras</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-1 text-mute2 text-xs">
        Painel de obras públicas e investimentos urbanos.
      </p>

      {/* Conteúdo Principal: Métricas + Mini Mapa Estático */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
        {/* Bloco de Métricas Consolidadas */}
        <div className="flex-1 space-y-4">
          <div>
            <span className="font-medium font-mono text-[10px] text-mute2 uppercase tracking-widest">
              Total de Investimento Previsto
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-bold font-sans text-3xl text-ink tracking-tight">
                {fmtCompact(valorTotalInvestimento)}
              </p>
              <span className="text-mute2 text-xs">
                {fmtNumber(totalObras)} {totalObras === 1 ? "obra" : "obras"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Barra Proporcional Empilhada */}
            <div
              className="flex h-1.5 w-full overflow-hidden bg-track"
              role="progressbar"
              aria-valuenow={Math.round(pctConcluidas)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={ariaLabel}
            >
              {pctEmExecucao > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    backgroundColor: corDoGrafico("brand"),
                    width: `${pctEmExecucao}%`,
                  }}
                />
              )}
              {pctConcluidas > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    backgroundColor: corDoGrafico("ok"),
                    width: `${pctConcluidas}%`,
                  }}
                />
              )}
              {pctCadastradas > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    backgroundColor: corDoGrafico("mute3"),
                    width: `${pctCadastradas}%`,
                  }}
                />
              )}
              {pctParalisadas > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    backgroundColor: corDoGrafico("danger"),
                    width: `${pctParalisadas}%`,
                  }}
                />
              )}
            </div>

            {/* Legendas com Contadores e Montantes */}
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ backgroundColor: corDoGrafico("brand") }}
                  />
                  <span className="text-mute2">Em execução:</span>
                </div>
                <span className="ml-3.5 font-semibold text-ink">
                  {fmtNumber(emExecucao)} ({fmtCompact(valorEmExecucao)})
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ backgroundColor: corDoGrafico("ok") }}
                  />
                  <span className="text-mute2">Concluídas:</span>
                </div>
                <span className="ml-3.5 font-semibold text-ink">
                  {fmtNumber(concluidas)} ({fmtCompact(valorConcluidas)})
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ backgroundColor: corDoGrafico("mute3") }}
                  />
                  <span className="text-mute2">Não iniciadas:</span>
                </div>
                <span className="ml-3.5 font-semibold text-ink">
                  {fmtNumber(cadastradas)} ({fmtCompact(valorCadastradas)})
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ backgroundColor: corDoGrafico("danger") }}
                  />
                  <span className="text-mute2">Paralisadas:</span>
                </div>
                <span className="ml-3.5 font-semibold text-ink">
                  {fmtNumber(paralisadas)} ({fmtCompact(valorParalisadas)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Mapa Estático Clicável (Mobile: faixa horizontal, Desktop: lateral direita) */}
        {tileInfo && (
          <Link
            href={detailUrl}
            onClick={() => {
              try {
                posthog.capture("obras_mini_map_clicked", {
                  detailUrl,
                  totalObras,
                  markersCount: validMarkers.length,
                  emExecucao,
                  concluidas,
                  paralisadas,
                  cadastradas,
                });
                posthog.capture("funnel_home_to_internal_page", {
                  from: "obras_mini_map",
                  to: detailUrl,
                });
              } catch {
                // Silencia erros de telemetria
              }
            }}
            aria-label="Ver no mapa interativo de obras públicas"
            className="group relative h-28 w-full shrink-0 overflow-hidden bg-track transition-colors duration-200 lg:h-auto lg:w-56"
          >
            <Image
              src={tileInfo.url}
              alt="Visão geral cartográfica das obras públicas"
              fill
              sizes="(max-width: 1024px) 100vw, 224px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />

            {/* Marcadores sobrepostos */}
            <div className="pointer-events-none absolute inset-0">
              {validMarkers.slice(0, 15).map((m) => (
                <span
                  key={m.id}
                  style={{
                    left: `${m.xPercent}%`,
                    top: `${m.yPercent}%`,
                  }}
                  className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 transition-transform duration-300 group-hover:scale-125 ${getMarkerBgClass(m.situacao)}`}
                />
              ))}
            </div>

            {/* Affordance Badge Flutuante */}
            <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 bg-page/95 px-2 py-1 font-medium font-mono text-[9px] text-ink uppercase tracking-wider backdrop-blur-xs transition-colors group-hover:bg-ink group-hover:text-onink">
              <MapPin className="h-3 w-3" />
              <span>Mapa · Ver no mapa</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-mute2 text-xs">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Painel consolidado de intervenções e investimentos públicos via
          ObrasGov.br.
        </span>
      </p>
    </section>
  );
}
