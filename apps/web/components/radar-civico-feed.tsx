"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import type {
  RadarCivicoCardItem,
  RadarCivicoFeedViewModel,
} from "@/app/[portalSlug]/view-model";

export interface RadarCivicoFeedProps {
  radar?: RadarCivicoFeedViewModel;
  cards?: RadarCivicoCardItem[];
  items?: RadarCivicoCardItem[];
  radarCivicoFeedData?: RadarCivicoCardItem[];
  portalName?: string;
  portalSlug?: string;
  ano?: number;
  className?: string;
}

const SEVERIDADE_POR_GRAU: Record<string, { label: string; classe: string }> = {
  critico: {
    label: "Alta",
    classe: "border-rose-200 bg-rose-50 text-rose-900",
  },
  alto: {
    label: "Média",
    classe: "border-amber-300 bg-amber-50 text-amber-950",
  },
};

const SEVERIDADE_PADRAO = {
  label: "Baixa",
  classe: "border-slate-200 bg-slate-100 text-slate-800",
};

function registrarClique(card: RadarCivicoCardItem) {
  try {
    posthog.capture("civic_radar_card_clicked", {
      anomaliaId: card.anomaliaId,
      tipoAnomalia: card.tipoAnomalia,
      grauSeveridade: card.grauSeveridade,
      dimensaoReferencia: card.dimensaoReferencia,
      ctaUrl: card.ctaUrl,
    });
    posthog.capture("funnel_home_to_internal_page", {
      from: "home_radar_civico",
      to: card.ctaUrl,
      anomaliaId: card.anomaliaId,
      tipoAnomalia: card.tipoAnomalia,
    });
  } catch {
    // Ignora falhas de telemetria
  }
}

function RadarLinha({ card }: { card: RadarCivicoCardItem }) {
  const severidade =
    SEVERIDADE_POR_GRAU[card.grauSeveridade] ?? SEVERIDADE_PADRAO;
  return (
    <li>
      <Link
        href={card.ctaUrl}
        onClick={() => registrarClique(card)}
        data-testid="radar-linha"
        data-card-id={card.anomaliaId}
        className="flex min-h-11 flex-col gap-2 rounded-2xl border border-[#e7e9ee] bg-white p-3 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-row sm:items-center sm:gap-4 sm:px-4"
      >
        <span
          data-testid="radar-severidade-badge"
          className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 font-medium text-xs ${severidade.classe}`}
        >
          {severidade.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink text-sm tracking-tight sm:text-base">
            {card.titulo}
          </span>
          <span className="mt-0.5 block text-subtleText text-xs leading-snug sm:text-sm">
            {card.textoFactual || card.resumoFactual}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center font-semibold text-accent text-sm">
          Entender →
        </span>
      </Link>
    </li>
  );
}

export function RadarCivicoFeed({
  radar,
  cards: cardsProp,
  items,
  radarCivicoFeedData,
  portalName,
  portalSlug,
  ano,
  className,
}: RadarCivicoFeedProps) {
  const cards = cardsProp ?? items ?? radar?.cards ?? radarCivicoFeedData ?? [];
  const hasAlertas = cards.length > 0;
  const anoExercicio = ano ?? new Date().getFullYear();

  return (
    <section
      data-testid="radar-civico-feed-section"
      aria-labelledby="radar-civico-heading"
      className={`w-full space-y-4 ${className ?? ""}`}
    >
      {/* Cabeçalho da Seção */}
      <div className="space-y-2 border-[#1a1d21] border-t-2 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="radar-civico-heading"
              className="font-bold font-serif text-ink text-xl"
            >
              Radar Cívico Municipal ({anoExercicio})
            </h2>
          </div>

          <Link
            href={`/${portalSlug}/radar`}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent text-xs hover:underline"
          >
            Ver todos os anos →
          </Link>
        </div>

        <p className="mt-0.5 text-sm text-subtleText">
          Acompanhamento cívico de despesas, contratações e movimentações em
          relação ao padrão histórico municipal.
        </p>
      </div>

      {/* Conteúdo do Feed: Empty State ou Grade de Cards */}
      {!hasAlertas ? (
        <div
          data-testid="radar-empty-state"
          className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-6"
        >
          <div className="shrink-0 rounded-full bg-emerald-100 p-2 text-emerald-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-emerald-950">
              {radar?.emptyState?.title ??
                "Contas e Indicadores em Conformidade Histórica"}
            </h3>
            <p className="mt-1 text-emerald-800 text-sm leading-relaxed">
              {radar?.emptyState?.message ??
                `Para o exercício de ${anoExercicio}${portalName ? ` em ${portalName}` : ""}, as despesas por função, contratações diretas e o quadro de cargos comissionados encontram-se dentro dos parâmetros históricos esperados, sem desvios estatísticos atípicos apurados. Nenhuma anomalia fiscal ou desvio atípico foi identificado.`}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {cards.map((card, index) => (
            <RadarLinha
              key={
                card.id || card.anomaliaId || `${card.tipoAnomalia}-${index}`
              }
              card={card}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
