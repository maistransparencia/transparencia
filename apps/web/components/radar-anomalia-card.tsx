"use client";

import { cn } from "@transparencia/ui";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
  Info,
  Layers,
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect } from "react";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";

export interface RadarAnomaliaCardProps {
  card?: RadarCivicoCardItem;
  item?: RadarCivicoCardItem;
  className?: string;
  funnelSource?: string;
}

function getSeverityBadgeData(grau: string) {
  if (grau === "critico") {
    return {
      label: "Atenção Especial",
      colorClass: "bg-rose-50 text-rose-900 border-rose-200",
    };
  }
  if (grau === "alto") {
    return {
      label: "Atenção",
      colorClass: "bg-amber-50 text-amber-950 border-amber-300",
    };
  }
  return {
    label: "Acompanhamento",
    colorClass: "bg-slate-100 text-slate-800 border-slate-200",
  };
}

function SeverityIcon({ grau }: { grau: string }) {
  if (grau === "critico") {
    return (
      <AlertCircle
        className="mr-1 h-3.5 w-3.5 shrink-0 text-rose-700"
        aria-hidden="true"
      />
    );
  }
  if (grau === "alto") {
    return (
      <AlertTriangle
        className="mr-1 h-3.5 w-3.5 shrink-0 text-amber-700"
        aria-hidden="true"
      />
    );
  }
  return (
    <Info
      className="mr-1 h-3.5 w-3.5 shrink-0 text-slate-600"
      aria-hidden="true"
    />
  );
}

function MethodologyIcon({ tipo }: { tipo: string }) {
  if (tipo === "estoque") {
    return (
      <Layers
        className="mr-1 h-3.5 w-3.5 shrink-0 text-slate-500"
        aria-hidden="true"
      />
    );
  }
  return (
    <Clock
      className="mr-1 h-3.5 w-3.5 shrink-0 text-slate-500"
      aria-hidden="true"
    />
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 fill-current text-[#25D366]"
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
  funnelSource = "home_radar_civico",
}: RadarAnomaliaCardProps) {
  const card = cardProp ?? itemProp;

  useEffect(() => {
    if (!card) return;
    try {
      posthog.capture("civic_radar_card_viewed", {
        anomaliaId: card.anomaliaId,
        tipoAnomalia: card.tipoAnomalia,
        grauSeveridade: card.grauSeveridade,
        dimensaoReferencia: card.dimensaoReferencia,
        ctaUrl: card.ctaUrl,
        source: funnelSource,
      });
    } catch {
      // Ignora falhas de telemetria
    }
  }, [card, funnelSource]);

  const handleCtaClick = () => {
    if (!card) return;
    try {
      posthog.capture("civic_radar_card_clicked", {
        anomaliaId: card.anomaliaId,
        tipoAnomalia: card.tipoAnomalia,
        grauSeveridade: card.grauSeveridade,
        dimensaoReferencia: card.dimensaoReferencia,
        ctaUrl: card.ctaUrl,
      });
      posthog.capture("funnel_home_to_internal_page", {
        from: funnelSource,
        to: card.ctaUrl,
        anomaliaId: card.anomaliaId,
        tipoAnomalia: card.tipoAnomalia,
      });
    } catch {
      // Ignora falhas de telemetria
    }
  };

  const handleWhatsAppClick = () => {
    if (!card) return;
    try {
      posthog.capture("civic_radar_whatsapp_shared", {
        anomaliaId: card.anomaliaId,
        tipoAnomalia: card.tipoAnomalia,
        grauSeveridade: card.grauSeveridade,
      });
    } catch {
      // Ignora falhas de telemetria
    }
  };

  if (!card) return null;

  const badgeSeveridade =
    card.badgeSeveridade ?? getSeverityBadgeData(card.grauSeveridade);
  const metodologiaLabel = card.metodologiaBadge || card.badgeMetodologia || "";

  return (
    <article
      data-testid="radar-anomalia-card"
      data-card-id={card.anomaliaId}
      className={cn(
        "relative flex h-full flex-col justify-between rounded-[14px] border border-borderLine bg-cardBg p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      <div>
        {/* Badges superiores com alto contraste e elegância */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            data-testid="radar-severidade-badge"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium text-xs shadow-xs",
              badgeSeveridade.colorClass,
            )}
          >
            <SeverityIcon grau={card.grauSeveridade} />
            {badgeSeveridade.label}
          </span>

          <span
            data-testid="radar-metodologia-badge"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 text-xs shadow-xs"
          >
            <MethodologyIcon tipo={card.tipoMetodologia} />
            {metodologiaLabel}
          </span>
        </div>

        {/* Título do Card: tipografia serif elegante */}
        <h3 className="font-bold font-serif text-base text-ink leading-snug tracking-tight sm:text-lg">
          {card.titulo}
        </h3>

        {/* Narrativa Factual Neutra */}
        <p className="mt-2.5 text-slate-600 text-xs leading-relaxed sm:text-sm">
          {card.textoFactual || card.resumoFactual}
        </p>

        {/* Tabela de métricas comparativas harmoniosa */}
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#f8f9fb] p-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                Observado
              </span>
              <span className="mt-0.5 block truncate font-bold font-serif text-ink text-sm sm:text-base">
                {card.valorObservadoFormatted}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                {card.esperadoLabel ?? "Média Histórica"}
              </span>
              <span className="mt-0.5 block truncate font-medium font-sans text-slate-700 text-xs sm:text-sm">
                {card.valorEsperadoFormatted}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                Variação
              </span>
              <span className="mt-0.5 block truncate font-bold font-sans text-amber-900 text-xs sm:text-sm">
                {card.desvioPercentualFormatted || `${card.desvioPercentual}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Fundamentação Legal Acessível (Regra 20) */}
        {card.fundamentacaoLegal && (
          <div className="mt-3 flex items-center text-slate-500 text-xs">
            <span className="mr-1">Base legal:</span>
            <a
              href={card.fundamentacaoLegal.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="radar-legal-link"
              className="inline-flex items-center gap-1 font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-accent hover:decoration-accent"
            >
              <span>{card.fundamentacaoLegal.label}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      {/* Ações / Rodapé perfeitamente balanceado */}
      <div className="mt-5 flex items-center justify-between gap-3 border-[#f4f5f7] border-t pt-3.5">
        <Link
          href={card.ctaUrl}
          onClick={handleCtaClick}
          data-testid="radar-cta-link"
          className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-accent text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
        >
          <span className="truncate">{card.ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>

        <a
          href={card.whatsappShareUrl}
          onClick={handleWhatsAppClick}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="radar-whatsapp-button"
          aria-label="Compartilhar no WhatsApp"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300 bg-[#eefaf3] px-2.5 py-1.5 font-semibold text-[#1e6f43] text-[11px] shadow-xs transition-colors hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <WhatsAppIcon />
          <span>WhatsApp</span>
        </a>
      </div>
    </article>
  );
}
