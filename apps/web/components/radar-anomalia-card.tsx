"use client";

import { Badge, type BadgeVariant, cn } from "@transparencia/ui";
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

function getSeverityBadgeData(grau: string): {
  label: string;
  badgeVariant: BadgeVariant;
} {
  if (grau === "critico") {
    return {
      label: "Atenção Especial",
      badgeVariant: "danger",
    };
  }
  if (grau === "alto") {
    return {
      label: "Atenção",
      badgeVariant: "warning",
    };
  }
  return {
    label: "Acompanhamento",
    badgeVariant: "default",
  };
}

function tomPanel(grau: string) {
  if (grau === "critico") return "panel-danger";
  if (grau === "alto") return "panel-warn";
  return "";
}

function SeverityIcon({ grau }: { grau: string }) {
  if (grau === "critico") {
    return (
      <AlertCircle
        className="text-danger-text mr-1 h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
    );
  }
  if (grau === "alto") {
    return (
      <AlertTriangle
        className="text-warn-text mr-1 h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
    );
  }
  return (
    <Info className="text-mute2 mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  );
}

function MethodologyIcon({ tipo }: { tipo: string }) {
  if (tipo === "estoque") {
    return (
      <Layers
        className="text-mute2 mr-1 h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
    );
  }
  return (
    <Clock
      className="text-mute2 mr-1 h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    />
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="text-ok-text h-3 w-3 shrink-0 fill-current"
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
        "panel panel-top relative flex h-full flex-col justify-between",
        tomPanel(card.grauSeveridade),
        className,
      )}
    >
      <div>
        {/* Badges superiores com alto contraste e elegância */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            data-testid="radar-severidade-badge"
            variant={badgeSeveridade.badgeVariant}
          >
            <SeverityIcon grau={card.grauSeveridade} />
            {badgeSeveridade.label}
          </Badge>

          <Badge data-testid="radar-metodologia-badge">
            <MethodologyIcon tipo={card.tipoMetodologia} />
            {metodologiaLabel}
          </Badge>
        </div>

        {/* Título do Card: tipografia serif elegante */}
        <h3>{card.titulo}</h3>

        {/* Narrativa Factual Neutra */}
        <p className="text-mute mt-2.5 text-xs leading-relaxed sm:text-sm">
          {card.textoFactual || card.resumoFactual}
        </p>

        {/* Tabela de métricas comparativas harmoniosa */}
        <div className="panel mt-4 rounded-md border p-3 text-xs [--panel-border-color:var(--line)] [--panel-border-width:1px] [--panel-padding:0.75rem]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            <div>
              <span className="eyebrow block">Observado</span>
              <span className="text-ink mt-0.5 block truncate font-serif text-sm font-semibold sm:text-base">
                {card.valorObservadoFormatted}
              </span>
            </div>
            <div>
              <span className="eyebrow block">
                {card.esperadoLabel ?? "Média Histórica"}
              </span>
              <span className="text-ink mt-0.5 block truncate font-sans text-xs font-medium sm:text-sm">
                {card.valorEsperadoFormatted}
              </span>
            </div>
            <div className="border-line col-span-2 border-t pt-2 sm:col-span-1 sm:border-0 sm:pt-0">
              <span className="eyebrow block">Variação</span>
              <span className="text-warn-text mt-0.5 block truncate font-sans text-xs font-semibold sm:text-sm">
                {card.desvioPercentualFormatted || `${card.desvioPercentual}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Fundamentação Legal Acessível (Regra 20) */}
        {(() => {
          if (!card.fundamentacaoLegal) return null;
          const links = Array.isArray(card.fundamentacaoLegal)
            ? card.fundamentacaoLegal
            : [card.fundamentacaoLegal];
          if (links.length === 0) return null;
          return (
            <div className="text-mute2 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="mr-0.5">Base legal:</span>
              {links.map((link, idx) => (
                <span key={link.url} className="inline-flex items-center">
                  {idx > 0 && (
                    <>
                      <span className="text-mute3 mx-1" aria-hidden="true">
                        •
                      </span>
                      <span className="sr-only">; </span>
                    </>
                  )}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="radar-legal-link"
                    className="text-brand-text inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
                  >
                    <span>{link.label}</span>
                    <ExternalLink
                      className="h-3 w-3 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Ações / Rodapé perfeitamente balanceado */}
      <div className="border-line2 mt-5 flex items-center justify-between gap-3 border-t pt-3.5">
        <Link
          href={card.ctaUrl}
          onClick={handleCtaClick}
          data-testid="radar-cta-link"
          className="text-brand-text focus-visible:ring-focus-ring inline-flex min-w-0 items-center gap-1 text-xs leading-snug font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          <span>{card.ctaLabel}</span>
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
        </Link>

        <a
          href={card.whatsappShareUrl}
          onClick={handleWhatsAppClick}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="radar-whatsapp-button"
          aria-label="Compartilhar no WhatsApp"
          className="text-ok-text hover:bg-ok-fill/10 focus-visible:ring-focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <WhatsAppIcon />
          <span>WhatsApp</span>
        </a>
      </div>
    </article>
  );
}
