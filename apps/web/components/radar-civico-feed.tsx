import { ShieldCheck, Sparkles } from "lucide-react";
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
  ano?: number;
  className?: string;
}

export function RadarCivicoFeed({
  radar,
  cards: cardsProp,
  items,
  radarCivicoFeedData,
  portalName,
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
      <div className="flex flex-col gap-2 border-[#e7e9ee] border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-blue-50 px-2.5 py-0.5 font-medium text-accent text-xs">
              <Sparkles className="h-3 w-3" />
              Controle Social Ativo
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700">
              Exercício {anoExercicio}
            </span>
          </div>
          <h2
            id="radar-civico-heading"
            className="flex items-center gap-2 font-bold font-serif text-ink text-xl tracking-tight"
          >
            Radar Cívico Municipal
          </h2>
          <p className="mt-0.5 text-sm text-subtleText">
            Acompanhamento cívico de despesas, contratações e movimentações em
            relação ao padrão histórico municipal.
          </p>
        </div>
      </div>

      {/* Conteúdo do Feed: Empty State ou Grade de Cards */}
      {!hasAlertas ? (
        <div
          data-testid="radar-empty-state"
          className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 transition-colors dark:border-emerald-900/60 dark:bg-emerald-950/20"
        >
          <div className="shrink-0 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-emerald-950 dark:text-emerald-200">
              {radar?.emptyState?.title ??
                "Contas e Indicadores em Conformidade Histórica"}
            </h3>
            <p className="mt-1 text-emerald-800 text-sm leading-relaxed dark:text-emerald-300">
              {radar?.emptyState?.message ??
                `Para o exercício de ${anoExercicio}${portalName ? ` em ${portalName}` : ""}, as despesas por função, contratações diretas e o quadro de cargos comissionados encontram-se dentro dos parâmetros históricos esperados, sem desvios estatísticos atípicos apurados. Nenhuma anomalia fiscal ou desvio atípico foi identificado.`}
            </p>
          </div>
        </div>
      ) : (
        <div
          data-testid="radar-cards-container"
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-lg pb-2 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
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
