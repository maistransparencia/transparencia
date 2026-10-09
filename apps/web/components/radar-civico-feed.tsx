"use client";

import { cn } from "@transparencia/ui";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  RadarCivicoCardItem,
  RadarCivicoFeedViewModel,
} from "@/app/[portalSlug]/view-model";
import { RadarAnomaliaCard } from "./radar-anomalia-card";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isScrollingProgrammatic = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || cards.length <= 1 || isScrollingProgrammatic.current) {
      return;
    }

    const isAtEnd =
      container.scrollLeft + container.clientWidth >=
      container.scrollWidth - 10;
    if (isAtEnd) {
      setActiveIndex(cards.length - 1);
      return;
    }

    const scrollLeft = container.scrollLeft;
    const firstChild = container.firstElementChild as HTMLElement | null;
    const cardWidth = firstChild?.clientWidth ?? 0;

    if (cardWidth > 0) {
      const step = cardWidth + 16;
      const newIndex = Math.min(
        cards.length - 1,
        Math.max(0, Math.round(scrollLeft / step)),
      );
      setActiveIndex(newIndex);
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll > 0) {
      const newIndex = Math.min(
        cards.length - 1,
        Math.max(0, Math.round((scrollLeft / maxScroll) * (cards.length - 1))),
      );
      setActiveIndex(newIndex);
    }
  };

  const scrollToCard = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const targetIndex = Math.max(0, Math.min(index, cards.length - 1));
    const targetChild = container.children[targetIndex] as
      | HTMLElement
      | undefined;

    isScrollingProgrammatic.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingProgrammatic.current = false;
    }, 400);

    if (targetChild && typeof targetChild.scrollIntoView === "function") {
      targetChild.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    } else if (typeof container.scrollTo === "function") {
      const cardWidth = targetChild?.clientWidth || 300;
      container.scrollTo({
        left: targetIndex * (cardWidth + 16),
        behavior: "smooth",
      });
    } else {
      const cardWidth = targetChild?.clientWidth || 300;
      container.scrollLeft = targetIndex * (cardWidth + 16);
    }

    setActiveIndex(targetIndex);
  };

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
        <div className="space-y-3">
          <div
            ref={containerRef}
            data-testid="radar-cards-container"
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-lg pb-2 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card, index) => (
              <div
                key={
                  card.id || card.anomaliaId || `${card.tipoAnomalia}-${index}`
                }
                className="w-[85vw] shrink-0 snap-start sm:w-[360px] md:w-auto md:max-w-none"
              >
                <RadarAnomaliaCard card={card} />
              </div>
            ))}
          </div>

          {cards.length > 1 && (
            <div
              data-testid="radar-scroll-indicator"
              className="flex items-center justify-between pt-1 md:hidden"
            >
              <div className="flex items-center gap-1.5 text-subtleText text-xs">
                <span
                  className="font-medium"
                  data-testid="radar-scroll-counter"
                >
                  {activeIndex + 1} de {cards.length} alertas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5"
                  role="tablist"
                  aria-label="Navegação dos alertas do radar"
                >
                  {cards.map((card, index) => {
                    const cardKey =
                      card.id ||
                      card.anomaliaId ||
                      `${card.tipoAnomalia}-${index}`;
                    const isActive = activeIndex === index;
                    return (
                      <button
                        key={`radar-dot-${cardKey}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Ir para alerta ${index + 1} de ${cards.length}`}
                        onClick={() => scrollToCard(index)}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          isActive
                            ? "w-5 bg-accent"
                            : "w-1.5 bg-neutral-300 hover:bg-neutral-400",
                        )}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={() => scrollToCard(activeIndex - 1)}
                    aria-label="Alerta anterior"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeIndex === cards.length - 1}
                    onClick={() => scrollToCard(activeIndex + 1)}
                    aria-label="Próximo alerta"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
