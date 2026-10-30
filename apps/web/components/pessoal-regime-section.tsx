"use client";

import type {
  PessoalRegimeMetricsDTO,
  ServidorDivergenciaCadastralDTO,
} from "@transparencia/db";
import {
  AlertBox,
  Badge,
  type Column,
  cn,
  DenseTable,
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  ModalDialog,
  SectionHeader,
  Tooltip,
} from "@transparencia/ui";
import { ExternalLink, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { urlLegislacao } from "@/lib/constants/legislacao";
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
        barBg: "bg-ok-fill",
        badge: "border-ok-text/40 bg-ok-fill/10 text-ok-text",
        dot: "bg-ok-fill",
        description: "Servidores estatutários concursados",
      };
    case "efetivo_comissao":
      return {
        barBg: "bg-brand-fill",
        badge: "border-brand/40 bg-brand/10 text-brand",
        dot: "bg-brand-fill",
        description: "Concursados em liderança ou chefia",
      };
    case "comissionado":
      return {
        barBg: "bg-warn-fill",
        badge: "border-warn-text/40 bg-warn-fill/10 text-warn-text",
        dot: "bg-warn-fill",
        description: "Livre nomeação externa (confiança)",
      };
    case "contrato_temporario":
      return {
        barBg: "bg-mute2",
        badge: "border-line bg-line2/40 text-mute2",
        dot: "bg-mute2",
        description: "Contratos temporários de interesse público",
      };
    case "agente_politico":
      return {
        barBg: "bg-ink",
        badge: "border-line bg-line2/40 text-mute2",
        dot: "bg-ink",
        description: "Prefeito, secretários e dirigentes eletivos",
      };
    case "rpps_inativos":
      return {
        barBg: "bg-faint",
        badge: "border-line bg-line2/40 text-mute2",
        dot: "bg-faint",
        description: "Aposentados e pensionistas do RPPS",
      };
    default:
      return {
        barBg: "bg-pill",
        badge: "border-line bg-line2/40 text-mute2",
        dot: "bg-pill",
        description:
          "Vínculos excepcionais e provimentos atípicos no portal de origem",
      };
  }
}

const MESES_NOME: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

export function PessoalRegimeSection({
  data,
  ano,
  portalSlug,
  totalDivergencias,
  servidoresDivergentes = [],
  className = "",
}: PessoalRegimeSectionProps) {
  const [isDivergenciasModalOpen, setIsDivergenciasModalOpen] = useState(false);

  const mesTexto = (() => {
    const mesRef = data?.[0]?.mesReferencia;
    if (mesRef && MESES_NOME[mesRef]) {
      return `${MESES_NOME[mesRef]} de ${ano}`;
    }
    return `exercício de ${ano}`;
  })();

  const divergenciasColumns: Column<ServidorDivergenciaCadastralDTO>[] =
    useMemo(
      () => [
        {
          header: "Matrícula",
          accessorKey: "matricula",
          sortable: true,
          className: "whitespace-nowrap text-xs text-mute2",
          renderCell: (row) => row.matricula || "—",
        },
        {
          header: "Cargo / Função",
          accessorKey: "cargo",
          sortable: true,
          className: "min-w-[160px] font-semibold text-ink",
          renderCell: (row) => row.cargo || "—",
        },
        {
          header: "Órgão",
          accessorKey: "orgaoNome",
          sortable: true,
          className: "min-w-[140px] text-mute",
          renderCell: (row) => row.orgaoNome || "—",
        },
        {
          header: "Vínculo Declarado",
          accessorKey: "vinculo",
          sortable: true,
          className: "whitespace-nowrap",
          renderCell: (row) => (
            <Badge>
              {row.vinculo || row.categoriaFuncional || "Não especificado"}
            </Badge>
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
                  "inline-flex items-center rounded-sm border px-2 py-0.5 font-medium text-[11px]",
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
            <span className="font-semibold font-serif text-ink">
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
      <article className="flex flex-col justify-between border-line border-y py-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-ink text-sm">
                {row.cargo || "Cargo não informado"}
              </span>
              {row.matricula && (
                <span className="ml-1.5 text-[11px] text-mute2">
                  #{row.matricula}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-sm border px-2 py-0.5 font-medium text-[11px]",
                style.badge,
              )}
            >
              {rotulo}
            </span>
          </div>

          <div className="text-mute text-xs">
            {row.orgaoNome && (
              <span className="block text-[11px] text-mute2">
                {row.orgaoNome}
              </span>
            )}
          </div>

          <div className="bg-line2 p-2 text-xs">
            <span className="eyebrow block">Vínculo Declarado na Origem</span>
            <span className="font-medium text-ink">
              {row.vinculo || row.categoriaFuncional || "Não especificado"}
            </span>
          </div>

          <div className="flex items-baseline justify-between border-line border-t pt-2 text-xs">
            <span className="caption">Proventos Brutos</span>
            <span className="font-semibold font-serif text-ink text-sm">
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
        className={cn("space-y-4", className)}
      >
        <SectionHeader
          title="Quadro e Folha por Regime Jurídico"
          action={<Badge>Consolidado Municipal</Badge>}
          description={`Sem dados de regime funcional disponíveis para o exercício de ${ano}.`}
        />
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
      className={cn("space-y-6", className)}
    >
      <SectionHeader
        title="Quadro e Folha por Regime Jurídico"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Consolidado Municipal</Badge>
            {portalSlug ? (
              <ShowYourWorkButton
                portalSlug={portalSlug}
                ano={ano}
                tipo="pessoal_regime"
                tituloContexto="Regimes e Vínculos Funcionais"
              />
            ) : null}
          </div>
        }
        description={`Distribuição dos ${fmtNumber(totalProfissionais)} profissionais e ${fmtCompact(totalFolha)} na folha mensal de referência (${mesTexto}) por vínculo funcional e regime de contratação.`}
      />

      {/* Barra de Distribuição Visual Proporcional do Quadro */}
      <div className="space-y-1">
        <div className="caption flex items-center justify-between">
          <span className="font-medium">Proporção no Quadro de Pessoal</span>
          <span>Total: {fmtNumber(totalProfissionais)} servidores</span>
        </div>

        <div
          className="flex h-3 w-full gap-px"
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
                  className="h-full items-stretch"
                  style={{ width: `${item.percentualProfissionais}%` }}
                  contentClassName={cn(
                    "w-56 border-line bg-page p-2.5",
                    alignmentClasses,
                  )}
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-ink">
                        <span
                          className={`h-2 w-2 rounded-sm ${style.dot}`}
                          aria-hidden="true"
                        />
                        <span>{rotulo}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-mute">
                        <span>{fmtPercent(item.percentualProfissionais)}</span>
                        <span className="font-medium text-ink">
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
                    className={`block h-full w-full transition-all ${style.barBg} cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
                  />
                </Tooltip>
              );
            });
          })()}
        </div>
      </div>

      {/* Grid de Cards de Cada Categoria de Regime */}
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {data.map((item) => {
          const style = getRegimeStyle(item.categoriaRegime);
          const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;

          return (
            <div
              key={item.categoriaRegime}
              className="flex flex-col justify-between border-line border-t py-4"
            >
              <div>
                {/* Header do Card com Rótulo e Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${style.dot}`}
                      aria-hidden="true"
                    />
                    <h3>{rotulo}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-medium text-[11px] ${style.badge}`}
                  >
                    {fmtPercent(item.percentualProfissionais)}
                  </span>
                </div>

                <p className="caption mt-1">{style.description}</p>

                {/* Métricas Principais: Profissionais e Proventos */}
                <div className="mt-4 space-y-2 border-line2 border-t pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="caption">Profissionais</span>
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoProfissionais !== null &&
                        item.variacaoProfissionais !== undefined && (
                          <span
                            className="shrink-0 whitespace-nowrap rounded-sm bg-line2 px-1.5 py-0.5 font-medium text-[11px] text-mute2"
                            title={`Variação de ${item.variacaoProfissionais > 0 ? `+${item.variacaoProfissionais}%` : `${item.variacaoProfissionais}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoProfissionais > 0
                              ? `+${item.variacaoProfissionais}%`
                              : `${item.variacaoProfissionais}%`}{" "}
                            vs {ano - 1}
                          </span>
                        )}
                      <span className="font-semibold text-ink text-sm">
                        {fmtNumber(item.totalProfissionais)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="caption">Folha Mensal</span>
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoFolha !== null &&
                        item.variacaoFolha !== undefined && (
                          <span
                            className="shrink-0 whitespace-nowrap rounded-sm bg-line2 px-1.5 py-0.5 font-medium text-[11px] text-mute2"
                            title={`Variação de ${item.variacaoFolha > 0 ? `+${item.variacaoFolha}%` : `${item.variacaoFolha}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoFolha > 0
                              ? `+${item.variacaoFolha}%`
                              : `${item.variacaoFolha}%`}{" "}
                            vs {ano - 1}
                          </span>
                        )}
                      <span
                        className="font-semibold text-ink text-sm"
                        title={fmtCurrency(item.totalProventos)}
                      >
                        {fmtCompact(item.totalProventos)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="caption">Provento Médio</span>
                    <span className="font-semibold text-ink text-sm">
                      {fmtCompact(item.proventoMedio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer do Card: Impacto na Folha Total */}
              <div className="mt-3 flex items-center justify-between border-line2 border-t pt-2.5 text-xs">
                <span className="caption">Impacto na Folha Mensal</span>
                <span className="font-medium text-ink">
                  {fmtPercent(item.percentualFolha)} da despesa
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota de Auditoria Cívica: 100% data-driven, exibida estritamente quando há divergências registradas */}
      {typeof totalDivergencias === "number" && totalDivergencias > 0 ? (
        <AlertBox type="info" title="Harmonização de Vínculos Cadastrais">
          <div className="space-y-2 text-xs leading-relaxed">
            <p>
              Neste exercício, identificamos{" "}
              <strong className="font-semibold text-ink">
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
                href={urlLegislacao("constituicao", "art37")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-2"
              >
                <span>Art. 37 da Constituição Federal</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              .
            </p>
            {servidoresDivergentes && servidoresDivergentes.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsDivergenciasModalOpen(true)}
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-page px-3 py-1.5 font-medium text-ink text-xs transition-colors hover:bg-line2"
                >
                  <UserCheck className="h-3.5 w-3.5 text-mute2" />
                  <span>
                    Ver lista de profissionais auditados (
                    {servidoresDivergentes.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </AlertBox>
      ) : null}

      {/* Modal de Auditoria Nominal de Inconsistências de Vínculos */}
      <ModalDialog
        isOpen={isDivergenciasModalOpen}
        onClose={() => setIsDivergenciasModalOpen(false)}
        title={`Profissionais com Divergência Cadastral Auditada — ${ano}`}
        subtitle={`Relação dos ${servidoresDivergentes.length} servidores municipais com harmonização de regime jurídico em ${ano}.`}
        maxWidth="5xl"
        footer={
          <div className="flex w-full items-center justify-between text-mute2 text-xs">
            <span>{servidoresDivergentes.length} profissionais listados</span>
            <button
              type="button"
              onClick={() => setIsDivergenciasModalOpen(false)}
              className="min-h-11 rounded-md bg-line2 px-3 py-1.5 font-medium text-ink hover:bg-line"
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
