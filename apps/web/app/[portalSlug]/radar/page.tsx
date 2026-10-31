import { Badge } from "@transparencia/ui";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { RadarAnomaliaCard } from "@/components/radar-anomalia-card";
import { createPortalMetadata } from "@/lib/metadata";
import { loadRadarData } from "./loader";
import { buildRadarHistoricoViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface RadarPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ entidades?: string }>;
}

export async function generateMetadata({
  params,
}: RadarPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Radar Cívico", portalSlug, {
    description:
      "Histórico completo de anomalias fiscais, variações atípicas e monitoramento de riscos das contas municipais ao longo dos exercícios.",
    path: "/radar",
    keywords: [
      "radar cívico",
      "anomalias fiscais",
      "alertas contábeis",
      "gastos públicos",
      "auditoria cidadã",
    ],
  });
}

export default async function RadarPage({
  params,
  searchParams,
}: RadarPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadRadarData(portalSlug, resolvedSearchParams);
  const viewModel = buildRadarHistoricoViewModel(rawData);
  const { portalName, totalAlertasGeral, secoes, hasAlertas, emptyState } =
    viewModel;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2 border-line border-b pb-5">
        <p className="eyebrow text-brand-text!">
          Controle Social e Auditoria Fiscal
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h1>Radar Cívico Municipal</h1>
          {hasAlertas && (
            <span className="font-medium text-mute text-xs sm:text-sm">
              <strong className="font-bold text-ink">
                {totalAlertasGeral}
              </strong>{" "}
              {totalAlertasGeral === 1
                ? "alerta apurado em todo o histórico"
                : "alertas apurados em todo o histórico"}
            </span>
          )}
        </div>
        <p className="lead">
          Há algum gasto ou situação em {portalName} que merece um olhar mais
          atento? Cada aviso abaixo é um indício para você conferir, não uma
          acusação: ele aparece quando um valor foge do padrão do próprio
          município ao longo dos anos.
        </p>
      </div>

      {/* Navegação Rápida / Barra de Âncoras por Exercício */}
      {hasAlertas && secoes.length > 1 && (
        <nav
          aria-label="Navegação por exercício"
          className="no-scrollbar sticky top-0 z-10 -mx-4 flex items-center gap-2 overflow-x-auto border-line border-b bg-page/95 px-4 py-3 backdrop-blur-xs sm:mx-0"
        >
          <span className="eyebrow shrink-0">Exercícios:</span>
          <div className="flex items-center gap-2">
            {secoes.map((sec) => (
              <a
                key={sec.ano}
                href={`#ano-${sec.ano}`}
                className="inline-flex shrink-0 items-center gap-1.5 bg-line2 px-3 py-1 font-semibold text-mute text-xs transition-colors hover:text-ink"
              >
                <span>{sec.ano}</span>
                <span className="rounded-full border border-line bg-page px-1.5 py-0.5 font-bold text-mute text-xs">
                  {sec.totalAlertas}
                </span>
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Conteúdo: Empty State Global ou Seções Anuais */}
      {!hasAlertas ? (
        <div
          data-testid="radar-empty-state"
          className="flex items-start gap-4 border-line border-y py-6"
        >
          <div className="shrink-0 text-ok-text">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2>{emptyState.title}</h2>
            <p className="mt-1 text-mute">{emptyState.message}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {secoes.map((sec) => (
            <section
              key={sec.ano}
              id={`ano-${sec.ano}`}
              data-testid={`radar-secao-ano-${sec.ano}`}
              aria-labelledby={`heading-ano-${sec.ano}`}
              className="scroll-mt-16 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-line border-b pb-2.5">
                <div className="flex items-center gap-3">
                  <h2 id={`heading-ano-${sec.ano}`}>Exercício {sec.ano}</h2>
                  {sec.isCurrentYear && (
                    <Badge variant="accent">Em Andamento</Badge>
                  )}
                </div>
                <div className="font-medium text-mute text-xs">
                  <span className="font-bold text-ink">{sec.totalAlertas}</span>{" "}
                  {sec.totalAlertas === 1
                    ? "alerta apurado"
                    : "alertas apurados"}
                  {sec.resumoSeveridadeLabel &&
                    sec.resumoSeveridadeLabel !== "Normal" && (
                      <span className="text-mute2">
                        {" "}
                        ({sec.resumoSeveridadeLabel})
                      </span>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sec.cards.map((card) => (
                  <RadarAnomaliaCard
                    key={card.id || card.anomaliaId}
                    card={card}
                    funnelSource="radar_historico"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
