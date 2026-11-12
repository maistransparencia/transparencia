"use client";

import type {
  PessoalRegimeMetricsDTO,
  ServidorDivergenciaCadastralDTO,
} from "@transparencia/db";
import {
  AlertBox,
  Badge,
  type BadgeVariant,
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
import { ExternalLink } from "lucide-react";
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
  badgeVariant: BadgeVariant;
  dot: string;
  description: string;
}

function getRegimeStyle(categoria: string): RegimeStyle {
  switch (categoria) {
    case "efetivo_concurso":
      return {
        barBg: "bg-ok-fill",
        badgeVariant: "success",
        dot: "bg-ok-fill",
        description: "Servidores estatutários concursados",
      };
    case "efetivo_comissao":
      return {
        barBg: "bg-brand-fill",
        badgeVariant: "accent",
        dot: "bg-brand-fill",
        description: "Concursados em liderança ou chefia",
      };
    case "comissionado":
      return {
        barBg: "bg-warn-fill",
        badgeVariant: "warning",
        dot: "bg-warn-fill",
        description: "Livre nomeação externa (confiança)",
      };
    case "contrato_temporario":
      return {
        barBg: "bg-mute2",
        badgeVariant: "default",
        dot: "bg-mute2",
        description: "Contratos temporários de interesse público",
      };
    case "agente_politico":
      return {
        barBg: "bg-ink",
        badgeVariant: "default",
        dot: "bg-ink",
        description: "Prefeito, secretários e dirigentes eletivos",
      };
    case "rpps_inativos":
      return {
        barBg: "bg-faint",
        badgeVariant: "default",
        dot: "bg-faint",
        description: "Aposentados e pensionistas do RPPS",
      };
    default:
      return {
        barBg: "bg-pill",
        badgeVariant: "default",
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
          header: "Regime nesta tela",
          accessorKey: "categoriaRegime",
          sortable: true,
          className: "whitespace-nowrap",
          renderCell: (row) => {
            const style = getRegimeStyle(row.categoriaRegime);
            const rotulo =
              CATEGORIA_REGIME_LABELS[
                row.categoriaRegime as keyof typeof CATEGORIA_REGIME_LABELS
              ] ?? row.categoriaRegime;
            return <Badge variant={style.badgeVariant}>{rotulo}</Badge>;
          },
        },
        {
          header: "Proventos",
          accessorKey: "proventos",
          sortable: true,
          align: "right",
          isSerifNumeric: true,
          renderCell: (row) => (
            <span className="numeric text-ink">
              {fmtCurrency(row.proventos)}
            </span>
          ),
        },
      ],
      [],
    );

  const renderDivergenciaMobileRow = (row: ServidorDivergenciaCadastralDTO) => {
    const style = getRegimeStyle(row.categoriaRegime);
    const rotulo =
      CATEGORIA_REGIME_LABELS[
        row.categoriaRegime as keyof typeof CATEGORIA_REGIME_LABELS
      ] ?? row.categoriaRegime;
    return {
      resumo: (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink min-w-0 text-sm font-semibold">
              {row.cargo || "Cargo não informado"}
            </span>
            <span className="numeric text-ink shrink-0 text-sm">
              {fmtCurrency(row.proventos)}
            </span>
          </div>
          <div className="text-mute2 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0">
              {row.orgaoNome || "Órgão não informado"}
            </span>
            <Badge variant={style.badgeVariant} className="shrink-0">
              {rotulo}
            </Badge>
          </div>
        </div>
      ),
      detalhes: (
        <dl className="text-mute2 space-y-1">
          {row.matricula ? (
            <div className="flex justify-between gap-3">
              <dt>Matrícula</dt>
              <dd className="numeric text-ink">{row.matricula}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt>Vínculo na origem</dt>
            <dd className="text-ink text-right">
              {row.vinculo || row.categoriaFuncional || "Não especificado"}
            </dd>
          </div>
        </dl>
      ),
    };
  };

  if (!data || data.length === 0) {
    return (
      <section
        aria-label="Quadro e Folha por Regime Jurídico"
        className={cn("space-y-4", className)}
      >
        <SectionHeader
          title="Quadro e Folha por Regime Jurídico"
          eyebrow="Consolidado Municipal"
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
        eyebrow="Consolidado Municipal"
        title="Quadro e Folha por Regime Jurídico"
        action={
          portalSlug ? (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="pessoal_regime"
              tituloContexto="Regimes e Vínculos Funcionais"
            />
          ) : null
        }
        description={`Como os ${fmtNumber(totalProfissionais)} servidores se dividem por tipo de vínculo com a prefeitura e quanto cada grupo recebe. A folha de ${mesTexto} soma ${fmtCompact(totalFolha)}.`}
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
                    "border-line bg-page w-56 p-2.5",
                    alignmentClasses,
                  )}
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="text-ink flex items-center gap-1.5 font-semibold">
                        <span
                          className={`h-2 w-2 rounded-sm ${style.dot}`}
                          aria-hidden="true"
                        />
                        <span>{rotulo}</span>
                      </div>
                      <div className="text-mute flex items-center justify-between gap-3">
                        <span>{fmtPercent(item.percentualProfissionais)}</span>
                        <span className="text-ink font-medium">
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
                    className={`block h-full w-full transition-all ${style.barBg} focus-visible:ring-focus-ring cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2`}
                  />
                </Tooltip>
              );
            });
          })()}
        </div>
      </div>

      {/* Grid de Cards de Cada Categoria de Regime */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.map((item) => {
          const style = getRegimeStyle(item.categoriaRegime);
          const rotulo = item.categoriaRegimeRotulo || item.categoriaRegime;

          return (
            <div
              key={item.categoriaRegime}
              className="panel flex flex-col justify-between border-0! border-t-[3px]! px-0! py-4! sm:px-4!"
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
                  <Badge variant={style.badgeVariant}>
                    {fmtPercent(item.percentualProfissionais)}
                  </Badge>
                </div>

                <p className="caption mt-1">{style.description}</p>

                {/* Métricas Principais: Profissionais e Proventos */}
                <div className="border-line2 mt-4 space-y-2 border-t pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="caption">Servidores</span>
                    <div className="flex items-baseline gap-1.5">
                      {item.variacaoProfissionais !== null &&
                        item.variacaoProfissionais !== undefined && (
                          <span
                            className="bg-line2 text-mute2 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
                            title={`Variação de ${item.variacaoProfissionais > 0 ? `+${item.variacaoProfissionais}%` : `${item.variacaoProfissionais}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoProfissionais > 0
                              ? `+${item.variacaoProfissionais}%`
                              : `${item.variacaoProfissionais}%`}{" "}
                            vs {ano - 1}
                          </span>
                        )}
                      <span className="text-ink text-sm font-semibold">
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
                            className="bg-line2 text-mute2 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
                            title={`Variação de ${item.variacaoFolha > 0 ? `+${item.variacaoFolha}%` : `${item.variacaoFolha}%`} vs ${ano - 1}`}
                          >
                            {item.variacaoFolha > 0
                              ? `+${item.variacaoFolha}%`
                              : `${item.variacaoFolha}%`}{" "}
                            vs {ano - 1}
                          </span>
                        )}
                      <span
                        className="text-ink text-sm font-semibold"
                        title={fmtCurrency(item.totalProventos)}
                      >
                        {fmtCompact(item.totalProventos)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="caption">Média por servidor</span>
                    <span className="text-ink text-sm font-semibold">
                      {fmtCompact(item.proventoMedio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer do Card: Impacto na Folha Total */}
              <div className="border-line2 mt-3 flex items-center justify-between border-t pt-2.5 text-xs">
                <span className="caption">Parcela da folha mensal</span>
                <span className="text-ink font-medium">
                  {fmtPercent(item.percentualFolha)} da folha
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota de Auditoria Cívica: 100% data-driven, exibida estritamente quando há divergências registradas */}
      {typeof totalDivergencias === "number" && totalDivergencias > 0 ? (
        <AlertBox type="info" title="Vínculos reclassificados">
          <div className="space-y-2 text-xs leading-relaxed">
            <p>
              Em {ano},{" "}
              <strong className="text-ink font-semibold">
                {fmtNumber(totalDivergencias)}{" "}
                {totalDivergencias === 1
                  ? "servidor aparece"
                  : "servidores aparecem"}
              </strong>{" "}
              no portal da prefeitura com o vínculo registrado de forma
              diferente da função que exercem (por exemplo, cargo em comissão
              cadastrado em outra categoria). É um problema de cadastro, não
              indica irregularidade. Aqui, cada vínculo foi classificado pela
              forma real de ingresso, conforme o{" "}
              <a
                href={urlLegislacao("constituicao", "art37")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-text inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
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
                  className="text-brand-text inline-flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-2"
                >
                  Ver detalhes ({servidoresDivergentes.length})
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
        title={`Servidores com vínculo reclassificado — ${ano}`}
        subtitle={`Dos ${fmtNumber(totalProfissionais)} servidores do município, ${fmtNumber(servidoresDivergentes.length)} ${servidoresDivergentes.length === 1 ? "teve" : "tiveram"} o vínculo reclassificado em ${ano}. A tabela mostra o tipo cadastrado na origem e o regime usado nesta tela.`}
        maxWidth="5xl"
        footer={
          <div className="text-mute2 flex w-full items-center justify-between text-xs">
            <span>
              {fmtNumber(servidoresDivergentes.length)} de{" "}
              {fmtNumber(totalProfissionais)} servidores do município
            </span>
            <button
              type="button"
              onClick={() => setIsDivergenciasModalOpen(false)}
              className="bg-line2 text-ink hover:bg-line min-h-11 rounded-md px-3 py-1.5 font-medium"
            >
              Fechar
            </button>
          </div>
        }
      >
        <DenseTable
          data={servidoresDivergentes}
          columns={divergenciasColumns}
          renderMobileRow={renderDivergenciaMobileRow}
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
          recordLabel="servidores"
          rowKey="matricula"
        />
      </ModalDialog>
    </section>
  );
}
