import { SectionHeader } from "@transparencia/ui";
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
  const { portalName, secoes, hasAlertas, emptyState } = viewModel;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2">
        <h1>Radar Cívico Municipal</h1>
        <p className="lead max-w-none">
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
          className="no-scrollbar bg-page/95 sticky top-0 z-10 -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-3 backdrop-blur-xs sm:mx-0"
        >
          <span className="eyebrow shrink-0">Exercícios:</span>
          <div className="flex items-center gap-2">
            {secoes.map((sec) => (
              <a
                key={sec.ano}
                href={`#ano-${sec.ano}`}
                className="bg-line2 text-mute hover:text-ink inline-flex shrink-0 items-center gap-1.5 px-3 py-1 text-xs font-semibold transition-colors"
              >
                <span>{sec.ano}</span>
                <span className="border-line bg-page text-mute rounded-full border px-1.5 py-0.5 text-xs font-bold">
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
          className="border-line flex items-start gap-4 border-y py-6"
        >
          <div className="text-ok-text shrink-0">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2>{emptyState.title}</h2>
            <p className="text-mute mt-1">{emptyState.message}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {secoes.map((sec) => (
            <section
              key={sec.ano}
              id={`ano-${sec.ano}`}
              data-testid={`radar-secao-ano-${sec.ano}`}
              aria-label={`Exercício ${sec.ano}`}
              className="section scroll-mt-16"
            >
              <SectionHeader
                eyebrow={`${sec.totalAlertas} ${
                  sec.totalAlertas === 1 ? "alerta apurado" : "alertas apurados"
                }${
                  sec.resumoSeveridadeLabel &&
                  sec.resumoSeveridadeLabel !== "Normal"
                    ? ` · ${sec.resumoSeveridadeLabel}`
                    : ""
                }${sec.isCurrentYear ? " · em andamento" : ""}`}
                title={`Exercício ${sec.ano}`}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
