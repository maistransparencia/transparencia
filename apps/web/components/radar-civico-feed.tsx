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
  critico: { label: "Alta", classe: "text-danger" },
  alto: { label: "Média", classe: "text-warn" },
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
        className="flex min-h-11 flex-col gap-2 px-1 py-4 transition-colors hover:bg-line2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset sm:flex-row sm:items-start sm:gap-4 sm:px-3"
      >
        <span
          data-testid="radar-severidade-badge"
          className={`inline-flex h-5 w-fit shrink-0 items-center gap-1.5 font-medium font-mono text-[10px] uppercase tracking-wider sm:w-16 ${severidade.classe}`}
        >
          <span aria-hidden="true" className="text-[8px]">
            ■
          </span>
          {severidade.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold font-sans text-ink text-sm leading-5 tracking-tight">
            {card.titulo}
          </span>
          <span className="mt-1 block text-mute2 text-xs leading-snug">
            {card.textoFactual || card.resumoFactual}
          </span>
        </span>
        <span className="inline-flex h-5 shrink-0 items-center font-medium text-brand text-xs">
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
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand text-xs hover:underline"
          >
            Ver todos os anos →
          </Link>
        }
      />

      {/* Conteúdo do Feed: Empty State ou Grade de Cards */}
      {!hasAlertas ? (
        <div
          data-testid="radar-empty-state"
          className="flex items-start gap-4 border-line border-y py-6"
        >
          <div className="shrink-0 rounded-full bg-ok/10 p-2 text-ok">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-ink">
              {radar?.emptyState?.title ??
                "Contas e Indicadores em Conformidade Histórica"}
            </h3>
            <p className="mt-1 text-mute2 text-sm leading-relaxed">
              {radar?.emptyState?.message ??
                `Para o exercício de ${anoExercicio}${portalName ? ` em ${portalName}` : ""}, as despesas por função, contratações diretas e o quadro de cargos comissionados encontram-se dentro dos parâmetros históricos esperados, sem desvios estatísticos atípicos apurados. Nenhuma anomalia fiscal ou desvio atípico foi identificado.`}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden gap-4 px-3 pb-2 font-mono text-[10px] text-mute2 uppercase tracking-widest sm:flex"
          >
            <span className="w-16 shrink-0">Nível</span>
            <span>Ocorrência</span>
          </div>
          <ul className="divide-y divide-line border-line border-y">
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
