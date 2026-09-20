"use client";

import type {
  PessoalRegimeMetricsDTO,
  ServidorDivergenciaCadastralDTO,
} from "@transparencia/db";
import {
  type Column,
  cn,
  DenseTable,
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  ModalDialog,
  Tooltip,
} from "@transparencia/ui";
import { ExternalLink, Info, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIA_REGIME_LABELS } from "@/lib/constants/pessoal";
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
  servidoresDivergentes?: ServidorDivergenciaCadastralDTO[];
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
  servidoresDivergentes = [],
  className = "",
}: PessoalRegimeSectionProps) {
  const [isDivergenciasModalOpen, setIsDivergenciasModalOpen] = useState(false);

  const divergenciasColumns: Column<ServidorDivergenciaCadastralDTO>[] =
    useMemo(
      () => [
        {
          header: "Matrícula",
          accessorKey: "matricula",
          sortable: true,
          className: "whitespace-nowrap font-mono text-xs text-slate-500",
          renderCell: (row) => row.matricula || "—",
        },
        {
          header: "Cargo / Função",
          accessorKey: "cargo",
          sortable: true,
          className: "min-w-[160px] font-semibold text-slate-900",
          renderCell: (row) => row.cargo || "—",
        },
        {
          header: "Órgão",
          accessorKey: "orgaoNome",
          sortable: true,
          className: "min-w-[140px] text-slate-600",
          renderCell: (row) => row.orgaoNome || "—",
        },
        {
          header: "Vínculo Declarado",
          accessorKey: "vinculo",
          sortable: true,
          className: "whitespace-nowrap",
          renderCell: (row) => (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 text-xs">
              {row.vinculo || row.categoriaFuncional || "Não especificado"}
            </span>
          ),
        },
        {
          header: "Regime Harmonizado",
          accessorKey: "categoriaRegime",
          sortable: true,
          className: "whitespace-nowrap",
          renderCell: (row) => {
            const style = getRegimeStyle(row.categoriaRegime);
            const rotulo =
              CATEGORIA_REGIME_LABELS[
                row.categoriaRegime as keyof typeof CATEGORIA_REGIME_LABELS
              ] ?? row.categoriaRegime;
            return (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px]",
                  style.badge,
                )}
              >
                {rotulo}
              </span>
            );
          },
        },
        {
          header: "Proventos",
          accessorKey: "proventos",
          sortable: true,
          align: "right",
          isSerifNumeric: true,
          renderCell: (row) => (
            <span className="font-bold font-serif text-slate-900">
              {fmtCurrency(row.proventos)}
            </span>
          ),
        },
      ],
      [],
    );

  const renderDivergenciaMobileCard = (
    row: ServidorDivergenciaCadastralDTO,
  ) => {
    const style = getRegimeStyle(row.categoriaRegime);
    const rotulo =
      CATEGORIA_REGIME_LABELS[
        row.categoriaRegime as keyof typeof CATEGORIA_REGIME_LABELS
      ] ?? row.categoriaRegime;
    return (
      <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-bold text-slate-900 text-sm">
                {row.cargo || "Cargo não informado"}
              </span>
              {row.matricula && (
                <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                  #{row.matricula}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[10px]",
                style.badge,
              )}
            >
              {rotulo}
            </span>
          </div>

          <div className="text-slate-600 text-xs">
            {row.orgaoNome && (
              <span className="block text-[11px] text-slate-500">
                {row.orgaoNome}
              </span>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 p-2 text-xs">
            <span className="block font-semibold text-[10px] text-slate-400 uppercase">
              Vínculo Declarado na Origem
            </span>
            <span className="font-medium text-slate-700">
              {row.vinculo || row.categoriaFuncional || "Não especificado"}
            </span>
          </div>

          <div className="flex items-baseline justify-between border-slate-100 border-t pt-2 text-xs">
            <span className="text-[11px] text-slate-400">Proventos Brutos</span>
            <span className="font-bold font-serif text-slate-900 text-sm">
              {fmtCurrency(row.proventos)}
            </span>
          </div>
        </div>
      </article>
    );
  };

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
      id="regime"
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
            {fmtCompact(totalFolha)} na folha mensal de referência por vínculo
            funcional e regime de contratação no exercício de {ano}.
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
      <div className="mt-6 space-y-1">
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
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] text-slate-600"
                            title={`Variação de ${item.variacaoProfissionais > 0 ? `+${item.variacaoProfissionais}%` : `${item.variacaoProfissionais}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoProfissionais > 0
                              ? `+${item.variacaoProfissionais}%`
                              : `${item.variacaoProfissionais}%`}{" "}
                            vs {ano - 1}
                          </span>
                        )}
                      <span className="font-semibold text-slate-900 text-sm">
                        {fmtNumber(item.totalProfissionais)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-500 text-xs">Folha Mensal</span>
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoFolha !== null &&
                        item.variacaoFolha !== undefined && (
                          <span
                            className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] text-slate-600"
                            title={`Variação de ${item.variacaoFolha > 0 ? `+${item.variacaoFolha}%` : `${item.variacaoFolha}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoFolha > 0
                              ? `+${item.variacaoFolha}%`
                              : `${item.variacaoFolha}%`}{" "}
                            vs {ano - 1}
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
                      {fmtCompact(item.proventoMedio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer do Card: Impacto na Folha Total */}
              <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
                <span className="text-slate-400">Impacto na Folha Mensal</span>
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
          <div className="space-y-2 text-xs leading-relaxed">
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
            {servidoresDivergentes && servidoresDivergentes.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsDivergenciasModalOpen(true)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Ver lista de profissionais auditados (
                    {servidoresDivergentes.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal de Auditoria Nominal de Inconsistências de Vínculos */}
      <ModalDialog
        isOpen={isDivergenciasModalOpen}
        onClose={() => setIsDivergenciasModalOpen(false)}
        title={`Profissionais com Divergência Cadastral Auditada — ${ano}`}
        subtitle={`Relação dos ${servidoresDivergentes.length} servidores municipais com harmonização de regime jurídico em ${ano}.`}
        maxWidth="5xl"
        footer={
          <div className="flex w-full items-center justify-between text-slate-500 text-xs">
            <span>{servidoresDivergentes.length} profissionais listados</span>
            <button
              type="button"
              onClick={() => setIsDivergenciasModalOpen(false)}
              className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
            >
              Fechar
            </button>
          </div>
        }
      >
        <DenseTable
          data={servidoresDivergentes}
          columns={divergenciasColumns}
          renderMobileCard={renderDivergenciaMobileCard}
          searchPlaceholder="Buscar por matrícula, cargo ou órgão..."
          searchableKeys={[
            "matricula",
            "cargo",
            "orgaoNome",
            "vinculo",
            "categoriaFuncional",
            "categoriaRegime",
          ]}
          pageSize={10}
          sortable={true}
          defaultSortKey="proventos"
          defaultSortDir="desc"
          enableExportCsv={true}
          exportFilename={`divergencias_cadastrais_pessoal_${ano}.csv`}
          recordLabel="profissionais"
          rowKey="matricula"
        />
      </ModalDialog>
    </section>
  );
}
