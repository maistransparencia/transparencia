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
      <div className="flex flex-col gap-2 border-[#e7e9ee] border-b pb-5">
        <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
          Controle Social e Auditoria Fiscal
        </span>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="font-bold font-serif text-3xl text-slate-900">
            Radar Cívico Municipal
          </h1>
          {hasAlertas && (
            <span className="font-medium text-slate-600 text-xs sm:text-sm">
              <strong className="font-bold text-ink">
                {totalAlertasGeral}
              </strong>{" "}
              {totalAlertasGeral === 1
                ? "alerta apurado em todo o histórico"
                : "alertas apurados em todo o histórico"}
            </span>
          )}
        </div>
        <p className="max-w-3xl text-sm text-subtleText leading-relaxed sm:text-base">
          Histórico consolidado de alertas estatísticos, picos de despesas,
          dispensas de licitação e monitoramento patrimonial de {portalName} ao
          longo de todos os exercícios auditados.
        </p>
      </div>

      {/* Navegação Rápida / Barra de Âncoras por Exercício */}
      {hasAlertas && secoes.length > 1 && (
        <nav
          aria-label="Navegação por exercício"
          className="no-scrollbar sticky top-0 z-10 -mx-4 flex items-center gap-2 overflow-x-auto border-borderLine border-b bg-white/95 px-4 py-3 backdrop-blur-xs sm:mx-0"
        >
          <span className="shrink-0 font-semibold text-slate-500 text-xs uppercase">
            Exercícios:
          </span>
          <div className="flex items-center gap-2">
            {secoes.map((sec) => (
              <a
                key={sec.ano}
                href={`#ano-${sec.ano}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 text-xs transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <span>{sec.ano}</span>
                <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 font-bold text-[10px] text-slate-700">
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
          className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-6"
        >
          <div className="shrink-0 rounded-full bg-emerald-100 p-2 text-emerald-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-emerald-950">
              {emptyState.title}
            </h2>
            <p className="mt-1 text-emerald-800 text-sm leading-relaxed">
              {emptyState.message}
            </p>
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-slate-200 border-b pb-2.5">
                <div className="flex items-center gap-3">
                  <h2
                    id={`heading-ano-${sec.ano}`}
                    className="font-bold font-serif text-ink text-xl tracking-tight sm:text-2xl"
                  >
                    Exercício {sec.ano}
                  </h2>
                  {sec.isCurrentYear && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-medium text-blue-800 text-xs">
                      Em Andamento
                    </span>
                  )}
                </div>
                <div className="font-medium text-slate-600 text-xs">
                  <span className="font-bold text-slate-800">
                    {sec.totalAlertas}
                  </span>{" "}
                  {sec.totalAlertas === 1
                    ? "alerta apurado"
                    : "alertas apurados"}
                  {sec.resumoSeveridadeLabel &&
                    sec.resumoSeveridadeLabel !== "Normal" && (
                      <span className="text-slate-500">
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
