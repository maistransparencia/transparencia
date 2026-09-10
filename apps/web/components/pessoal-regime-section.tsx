import type { PessoalRegimeMetricsDTO } from "@transparencia/db";
import {
  cn,
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  Tooltip,
} from "@transparencia/ui";
import { ExternalLink, Info } from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface PessoalRegimeItem extends PessoalRegimeMetricsDTO {
  categoriaRegimeRotulo?: string;
  variacaoProfissionais?: number | null;
  variacaoFolha?: number | null;
}

export interface PessoalRegimeSectionProps {
  data: PessoalRegimeItem[];
  ano: number;
  portalSlug?: string;
  totalDivergencias?: number;
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
        barBg: "bg-lime-500",
        badge: "border-lime-200 bg-lime-50 text-lime-800",
        dot: "bg-lime-500",
        description: "Concursados em liderança ou chefia",
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
        description:
          "Vínculos excepcionais e provimentos atípicos no portal de origem",
      };
  }
}

export function PessoalRegimeSection({
  data,
  ano,
  portalSlug,
  totalDivergencias,
  className = "",
}: PessoalRegimeSectionProps) {
  if (!data || data.length === 0) {
    return (
      <section
        aria-label="Quadro e Folha por Regime Jurídico"
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-lg text-slate-900">
                Quadro e Folha por Regime Jurídico
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-[11px] text-slate-600">
                Consolidado Municipal
              </span>
            </div>
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
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 ${className}`}
    >
      {/* Header com Contexto e Botão Show Your Work */}
      <div className="visible sm:hidden">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-[11px] text-slate-600">
            Consolidado Municipal
          </span>
          {portalSlug ? (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="pessoal_regime"
              tituloContexto="Regimes e Vínculos Funcionais"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-lg text-slate-900">
              Quadro e Folha por Regime Jurídico
            </h2>
            <span className="hidden sm:inline">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-[11px] text-slate-600">
                Consolidado Municipal
              </span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            Distribuição dos {fmtNumber(totalProfissionais)} profissionais e{" "}
            {fmtCompact(totalFolha)} em proventos por vínculo funcional e regime
            de contratação no exercício de {ano}.
          </p>
        </div>
        <div className="hidden sm:inline">
          {portalSlug ? (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="pessoal_regime"
              tituloContexto="Regimes e Vínculos Funcionais"
            />
          ) : null}
        </div>
      </div>

      {/* Barra de Distribuição Visual Proporcional do Quadro */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span className="font-medium">Proporção no Quadro de Pessoal</span>
          <span>Total: {fmtNumber(totalProfissionais)} servidores</span>
        </div>

        <div
          className="flex h-3 w-full rounded-full"
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Distribuição do quadro por regime funcional"
        >
          {(() => {
            const activeItems = data.filter(
              (item) => item.percentualProfissionais > 0,
            );
            let accumulatedPct = 0;
            return activeItems.map((item, index) => {
              const style = getRegimeStyle(item.categoriaRegime);
              const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;
              const isFirst = index === 0;
              const isLast = index === activeItems.length - 1;
              const centerPct =
                accumulatedPct + item.percentualProfissionais / 2;
              accumulatedPct += item.percentualProfissionais;

              const alignmentClasses = (() => {
                if (centerPct > 65 || isLast) {
                  return "right-0 left-auto translate-x-0";
                }
                if (centerPct < 35 || isFirst) {
                  return "left-0 translate-x-0";
                }
                return "left-1/2 -translate-x-1/2";
              })();

              return (
                <Tooltip
                  key={item.categoriaRegime}
                  position="top"
                  className="block h-full"
                  style={{ width: `${item.percentualProfissionais}%` }}
                  contentClassName={cn(
                    "w-56 border-slate-700 bg-slate-900 p-2.5 shadow-lg",
                    alignmentClasses,
                  )}
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span
                          className={`h-2 w-2 rounded-full ${style.dot}`}
                          aria-hidden="true"
                        />
                        <span>{rotulo}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-slate-300">
                        <span>{fmtPercent(item.percentualProfissionais)}</span>
                        <span className="font-medium text-white">
                          {fmtNumber(item.totalProfissionais)} servidores
                        </span>
                      </div>
                    </div>
                  }
                >
                  <button
                    type="button"
                    aria-label={`${rotulo}: ${fmtPercent(
                      item.percentualProfissionais,
                    )} (${fmtNumber(item.totalProfissionais)} servidores)`}
                    className={`h-full w-full transition-all ${style.barBg} ${
                      isFirst ? "rounded-l-full" : ""
                    } ${
                      isLast ? "rounded-r-full" : ""
                    } cursor-pointer hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-slate-400`}
                  />
                </Tooltip>
              );
            });
          })()}
        </div>
      </div>

      {/* Grid de Cards de Cada Categoria de Regime */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => {
          const style = getRegimeStyle(item.categoriaRegime);
          const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;

          return (
            <div
              key={item.categoriaRegime}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-xs"
            >
              <div>
                {/* Header do Card com Rótulo e Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                      aria-hidden="true"
                    />
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {rotulo}
                    </h3>
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
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoProfissionais !== null &&
                        item.variacaoProfissionais !== undefined && (
                          <span
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] text-slate-600"
                            title={`Variação de ${item.variacaoProfissionais > 0 ? `+${item.variacaoProfissionais}%` : `${item.variacaoProfissionais}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoProfissionais > 0
                              ? `+${item.variacaoProfissionais}%`
                              : `${item.variacaoProfissionais}%`}
                          </span>
                        )}
                      <span className="font-semibold text-slate-900 text-sm">
                        {fmtNumber(item.totalProfissionais)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">
                      Volume em Folha
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoFolha !== null &&
                        item.variacaoFolha !== undefined && (
                          <span
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] text-slate-600"
                            title={`Variação de ${item.variacaoFolha > 0 ? `+${item.variacaoFolha}%` : `${item.variacaoFolha}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoFolha > 0
                              ? `+${item.variacaoFolha}%`
                              : `${item.variacaoFolha}%`}
                          </span>
                        )}
                      <span
                        className="font-semibold text-slate-900 text-sm"
                        title={fmtCurrency(item.totalProventos)}
                      >
                        {fmtCompact(item.totalProventos)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">
                      Provento Médio
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {fmtCurrency(item.proventoMedio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer do Card: Impacto na Folha Total */}
              <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
                <span className="text-slate-400">Impacto na Folha</span>
                <span className="font-medium text-slate-800">
                  {fmtPercent(item.percentualFolha)} da despesa
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota de Auditoria Cívica: 100% data-driven, exibida estritamente quando há divergências registradas */}
      {typeof totalDivergencias === "number" && totalDivergencias > 0 ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-700 sm:p-5">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs leading-relaxed">
            <h4 className="font-semibold text-slate-900 text-sm">
              Harmonização de Vínculos Cadastrais
            </h4>
            <p className="text-slate-600">
              Neste exercício, identificamos{" "}
              <strong className="font-semibold text-slate-900">
                {fmtNumber(totalDivergencias)}{" "}
                {totalDivergencias === 1
                  ? "profissional cadastrado"
                  : "profissionais cadastrados"}
              </strong>{" "}
              com inconsistências de vínculo no portal de origem (como funções
              comissionadas ou temporárias registradas sob categorias atípicas).
              Para garantir rigor fiscal, classificamos cada vínculo com base na
              forma real de provimento e nos preceitos do{" "}
              <a
                href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-slate-800 underline decoration-slate-400 underline-offset-2 transition-colors hover:text-slate-950"
              >
                <span>Art. 37 da Constituição Federal</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
              </a>
              .
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
