import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  History,
  Info,
  Layers,
} from "lucide-react";
import Link from "next/link";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";

export interface RadarAnomaliaCardProps {
  card?: RadarCivicoCardItem;
  item?: RadarCivicoCardItem;
  className?: string;
}

function getSeverityBorderClass(grau: string): string {
  if (grau === "critico") return "border-l-rose-500 dark:border-l-rose-400";
  if (grau === "alto") return "border-l-amber-500 dark:border-l-amber-400";
  return "border-l-blue-500 dark:border-l-blue-400";
}

function getSeverityBadgeData(grau: string) {
  if (grau === "critico") {
    return {
      label: "Crítico",
      colorClass:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60",
    };
  }
  if (grau === "alto") {
    return {
      label: "Alto Desvio",
      colorClass:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60",
    };
  }
  return {
    label: "Moderado",
    colorClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60",
  };
}

function SeverityIcon({ grau }: { grau: string }) {
  if (grau === "critico") {
    return (
      <AlertCircle className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    );
  }
  if (grau === "alto") {
    return (
      <AlertTriangle className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    );
  }
  return <Info className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function MethodologyIcon({ tipo }: { tipo: string }) {
  if (tipo === "estoque") {
    return <Layers className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return <History className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 fill-current"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export function RadarAnomaliaCard({
  card: cardProp,
  item: itemProp,
  className,
}: RadarAnomaliaCardProps) {
  const card = cardProp ?? itemProp;
  if (!card) return null;

  const borderClass = getSeverityBorderClass(card.grauSeveridade);
  const badgeSeveridade =
    card.badgeSeveridade ?? getSeverityBadgeData(card.grauSeveridade);
  const metodologiaLabel = card.metodologiaBadge || card.badgeMetodologia || "";

  return (
    <article
      data-testid="radar-anomalia-card"
      data-card-id={card.anomaliaId}
      className={`relative flex h-full flex-col justify-between rounded-xl border border-border bg-card ${borderClass} border-l-4 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${className ?? ""}`}
    >
      <div>
        {/* Badges superiores */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            data-testid="radar-severidade-badge"
            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold text-xs ${badgeSeveridade.colorClass}`}
          >
            <SeverityIcon grau={card.grauSeveridade} />
            {badgeSeveridade.label}
          </span>

          <span
            data-testid="radar-metodologia-badge"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-medium text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <MethodologyIcon tipo={card.tipoMetodologia} />
            {metodologiaLabel}
          </span>
        </div>

        {/* Título do Card */}
        <h3 className="font-semibold text-base text-foreground leading-snug tracking-tight">
          {card.titulo}
        </h3>

        {/* Narrativa Factual Neutra */}
        <p className="mt-2.5 text-muted-foreground text-sm leading-relaxed">
          {card.textoFactual || card.resumoFactual}
        </p>

        {/* Métricas comparativas */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-muted/50 p-2.5 text-xs">
          <div>
            <span className="block text-muted-foreground">Observado</span>
            <span className="block truncate font-semibold text-foreground">
              {card.valorObservadoFormatted}
            </span>
          </div>
          <div>
            <span className="block text-muted-foreground">Esperado</span>
            <span className="block truncate font-semibold text-foreground">
              {card.valorEsperadoFormatted}
            </span>
          </div>
          <div>
            <span className="block text-muted-foreground">Variação</span>
            <span className="block truncate font-semibold text-foreground">
              {card.desvioPercentualFormatted || `${card.desvioPercentual}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Ações / Rodapé */}
      <div className="mt-5 flex items-center justify-between gap-2 border-border/60 border-t pt-3">
        <Link
          href={card.ctaUrl}
          data-testid="radar-cta-link"
          className="inline-flex items-center gap-1 rounded font-semibold text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
        >
          <span>{card.ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>

        <a
          href={card.whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="radar-whatsapp-button"
          aria-label="Compartilhar no WhatsApp"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700 text-xs transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <WhatsAppIcon />
          <span>WhatsApp</span>
        </a>
      </div>
    </article>
  );
}
