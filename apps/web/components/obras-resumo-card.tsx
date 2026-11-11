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
            <h3 className="font-bold">
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

        <div className="border-line mt-4 flex flex-col items-center justify-center border-y p-6 text-center">
          <AlertCircle className="text-mute3 mb-2 h-6 w-6" />
          <p className="text-ink text-sm font-medium">
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
              className="text-brand inline-flex items-center gap-1 text-xs font-semibold hover:underline"
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
        return "bg-brand-fill ring-page";
      case "concluida":
        return "bg-ok-fill ring-page";
      case "paralisada":
        return "bg-danger-fill ring-page";
      default:
        return "bg-mute3 ring-page";
    }
  };

  return (
    <section
      aria-label="Obras Públicas"
      className={`border-ink border-t-2 pt-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h3 className="font-semibold">Obras Públicas</h3>
          <ExternalLinkPill
            href={OBRASGOV_PANEL_URL}
            title="Painel de Obras Públicas do Governo Federal"
            className="px-2.5 py-0.5 text-xs tracking-wider"
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
          className="text-brand inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          <span>Ver mapa e detalhes das obras</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="text-mute2 mt-1 text-xs">
        Painel de obras públicas e investimentos urbanos.
      </p>

      {/* Conteúdo Principal: Métricas + Mini Mapa Estático */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
        {/* Bloco de Métricas Consolidadas */}
        <div className="flex-1 space-y-4">
          <div>
            <span className="text-mute2 text-xs font-medium tracking-widest uppercase">
              Total de Investimento Previsto
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-ink font-sans text-3xl font-bold tracking-tight">
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
              className="bg-track flex h-1.5 w-full overflow-hidden"
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
                <span className="text-ink ml-3.5 font-semibold">
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
                <span className="text-ink ml-3.5 font-semibold">
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
                <span className="text-ink ml-3.5 font-semibold">
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
                <span className="text-ink ml-3.5 font-semibold">
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
            className="group bg-track relative h-28 w-full shrink-0 overflow-hidden transition-colors duration-200 lg:h-auto lg:w-56"
          >
            <Image
              src={tileInfo.url}
              alt="Visão geral cartográfica das obras públicas"
              fill
              sizes="(max-width: 1024px) 100vw, 224px"
              className="mapa-tema-imagem object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div className="bg-page/95 text-ink group-hover:bg-ink group-hover:text-onink absolute right-2 bottom-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium tracking-wider uppercase backdrop-blur-xs transition-colors">
              <MapPin className="h-3 w-3" />
              <span>Mapa · Ver no mapa</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        )}
      </div>

      <p className="text-mute2 mt-4 flex items-center gap-1.5 text-xs">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Painel consolidado de intervenções e investimentos públicos via
          ObrasGov.br.
        </span>
      </p>
    </section>
  );
}
