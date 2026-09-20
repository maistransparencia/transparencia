import { ShieldCheck } from "lucide-react";
import Link from "next/link";
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
        <div
          data-testid="radar-cards-container"
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
      )}
    </section>
  );
}
