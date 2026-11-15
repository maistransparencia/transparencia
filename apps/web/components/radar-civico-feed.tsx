"use client";

import { SectionHeader } from "@transparencia/ui";
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
  critico: { label: "Alta", classe: "text-danger-text" },
  alto: { label: "Média", classe: "text-warn-text" },
};

const SEVERIDADE_PADRAO = { label: "Baixa", classe: "text-mute2" };

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
        className="hover:bg-line2/40 focus-visible:ring-brand flex min-h-11 flex-col gap-2 px-1 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:flex-row sm:items-start sm:gap-4 sm:px-3"
      >
        <span
          data-testid="radar-severidade-badge"
          className={`inline-flex h-5 w-fit shrink-0 items-center gap-1.5 text-xs font-medium tracking-wider uppercase sm:w-24 ${severidade.classe}`}
        >
          <span aria-hidden="true" className="text-xs">
            ■
          </span>
          {severidade.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block font-sans text-sm leading-5 font-bold tracking-tight">
            {card.titulo}
          </span>
          <span className="text-mute2 mt-1 block text-xs leading-snug">
            {card.textoFactual || card.resumoFactual}
          </span>
        </span>
        <span className="text-brand inline-flex h-5 shrink-0 items-center text-xs font-medium">
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
      aria-label="Radar Cívico Municipal"
      className={`w-full ${className ?? ""}`}
    >
      <SectionHeader
        title={`Radar Cívico Municipal (${anoExercicio})`}
        description="Acompanhamento cívico de despesas, contratações e movimentações em relação ao padrão histórico municipal."
        action={
          <Link
            href={`/${portalSlug}/radar`}
            className="text-brand inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
          >
            Ver todos os anos →
          </Link>
        }
      />

      {/* Conteúdo do Feed: Empty State ou Grade de Cards */}
      {!hasAlertas ? (
        <div
          data-testid="radar-empty-state"
          className="border-line flex items-start gap-4 border-y py-6"
        >
          <div className="text-ok-text shrink-0">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold">
              {radar?.emptyState?.title ??
                "Contas e Indicadores em Conformidade Histórica"}
            </h3>
            <p className="text-mute2 mt-1 text-sm leading-relaxed">
              {radar?.emptyState?.message ??
                `Para o exercício de ${anoExercicio}${portalName ? ` em ${portalName}` : ""}, as despesas por função, contratações diretas e o quadro de cargos comissionados encontram-se dentro dos parâmetros históricos esperados, sem desvios estatísticos atípicos apurados. Nenhuma anomalia fiscal ou desvio atípico foi identificado.`}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="text-mute2 hidden gap-4 px-3 pb-2 text-xs tracking-widest uppercase sm:flex"
          >
            <span className="w-16 shrink-0">Nível</span>
            <span>Ocorrência</span>
          </div>
          <ul className="divide-line border-line divide-y border-y">
            {cards.map((card, index) => (
              <RadarLinha
                key={
                  card.id || card.anomaliaId || `${card.tipoAnomalia}-${index}`
                }
                card={card}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
