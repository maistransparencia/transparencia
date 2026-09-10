import type { PessoalRegimeMetricsDTO } from "@transparencia/db";
import {
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
} from "@transparencia/ui";
import { Users } from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface PessoalRegimeItem extends PessoalRegimeMetricsDTO {
  categoriaRegimeRotulo?: string;
}

export interface PessoalRegimeSectionProps {
  data: PessoalRegimeItem[];
  ano: number;
  portalSlug?: string;
  entidades?: string;
  className?: string;
}

interface RegimeStyle {
  barBg: string;
  badge: string;
  dot: string;
  description: string;
}

function getRegimeStyle(categoria: string): RegimeStyle {
  switch (categoria) {
    case "efetivo_concurso":
      return {
        barBg: "bg-emerald-500",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
        dot: "bg-emerald-500",
        description: "Servidores estatutários concursados",
      };
    case "efetivo_comissao":
      return {
        barBg: "bg-teal-500",
        badge: "border-teal-200 bg-teal-50 text-teal-800",
        dot: "bg-teal-500",
        description: "Concursados em liderança ou chefia (FG/CC)",
      };
    case "comissionado":
      return {
        barBg: "bg-amber-500",
        badge: "border-amber-200 bg-amber-50 text-amber-800",
        dot: "bg-amber-500",
        description: "Livre nomeação externa (confiança)",
      };
    case "contrato_temporario":
      return {
        barBg: "bg-sky-500",
        badge: "border-sky-200 bg-sky-50 text-sky-800",
        dot: "bg-sky-500",
        description: "Contratos temporários de interesse público",
      };
    case "agente_politico":
      return {
        barBg: "bg-violet-500",
        badge: "border-violet-200 bg-violet-50 text-violet-800",
        dot: "bg-violet-500",
        description: "Prefeito, secretários e dirigentes eletivos",
      };
    case "rpps_inativos":
      return {
        barBg: "bg-indigo-500",
        badge: "border-indigo-200 bg-indigo-50 text-indigo-800",
        dot: "bg-indigo-500",
        description: "Aposentados e pensionistas do RPPS",
      };
    default:
      return {
        barBg: "bg-slate-400",
        badge: "border-slate-200 bg-slate-50 text-slate-700",
        dot: "bg-slate-400",
        description: "Outros vínculos e situações cadastrais",
      };
  }
}

export function PessoalRegimeSection({
  data,
  ano,
  portalSlug,
  entidades,
  className = "",
}: PessoalRegimeSectionProps) {
  if (!data || data.length === 0) {
    return (
      <section
        aria-label="Quadro e Folha por Regime Jurídico"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-bold text-ink text-xl tracking-tight">
              Quadro e Folha por Regime Jurídico
            </h2>
            <p className="mt-1 text-slate-500 text-xs sm:text-sm">
              Sem dados de regime funcional disponíveis para o exercício de{" "}
              {ano}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const totalProfissionais = data.reduce(
    (acc, item) => acc + item.totalProfissionais,
    0,
  );
  const totalFolha = data.reduce((acc, item) => acc + item.totalProventos, 0);

  return (
    <section
      aria-label="Quadro e Folha por Regime Jurídico"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
    >
      {/* Header com Contexto e Botão Show Your Work */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </span>
            <h2 className="font-bold text-ink text-xl tracking-tight">
              Quadro e Folha por Regime Jurídico
            </h2>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            Distribuição dos {fmtNumber(totalProfissionais)} profissionais e{" "}
            {fmtCompact(totalFolha)} em proventos por vínculo funcional e regime
            de contratação no exercício de {ano}.
          </p>
        </div>

        {portalSlug ? (
          <ShowYourWorkButton
            portalSlug={portalSlug}
            ano={ano}
            tipo="pessoal_regime"
            entidades={entidades}
            tituloContexto="Regimes e Vínculos Funcionais"
          />
        ) : null}
      </div>

      {/* Barra de Distribuição Visual Proporcional do Quadro */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span className="font-medium">Proporção no Quadro de Pessoal</span>
          <span>Total: {fmtNumber(totalProfissionais)} servidores</span>
        </div>

        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Distribuição do quadro por regime funcional"
        >
          {data
            .filter((item) => item.percentualProfissionais > 0)
            .map((item) => {
              const style = getRegimeStyle(item.categoriaRegime);
              const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;
              return (
                <div
                  key={item.categoriaRegime}
                  className={`h-full transition-all ${style.barBg}`}
                  style={{ width: `${item.percentualProfissionais}%` }}
                  title={`${rotulo}: ${fmtPercent(
                    item.percentualProfissionais,
                  )} (${fmtNumber(item.totalProfissionais)} servidores)`}
                />
              );
            })}
        </div>
      </div>

      {/* Grid de Cards de Cada Categoria de Regime */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((item) => {
          const style = getRegimeStyle(item.categoriaRegime);
          const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;

          return (
            <div
              key={item.categoriaRegime}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all hover:border-[#cbd0db] hover:bg-white hover:shadow-xs"
            >
              <div>
                {/* Header do Card com Rótulo e Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                      aria-hidden="true"
                    />
                    <h3 className="font-semibold text-ink text-sm">{rotulo}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] ${style.badge}`}
                  >
                    {fmtPercent(item.percentualProfissionais)}
                  </span>
                </div>

                <p className="mt-1 text-slate-500 text-xs">
                  {style.description}
                </p>

                {/* Métricas Principais: Profissionais e Proventos */}
                <div className="mt-4 space-y-2 border-slate-100 border-t pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">
                      Profissionais
                    </span>
                    <span className="font-mono font-semibold text-ink text-sm">
                      {fmtNumber(item.totalProfissionais)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">
                      Volume em Folha
                    </span>
                    <span
                      className="font-mono font-semibold text-ink text-sm"
                      title={fmtCurrency(item.totalProventos)}
                    >
                      {fmtCompact(item.totalProventos)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">
                      Provento Médio
                    </span>
                    <span className="font-mono font-semibold text-ink text-sm">
                      {fmtCurrency(item.proventoMedio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer do Card: Impacto na Folha Total */}
              <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
                <span className="text-slate-400">Impacto na Folha</span>
                <span className="font-medium text-slate-700">
                  {fmtPercent(item.percentualFolha)} da despesa
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
