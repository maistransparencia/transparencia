"use client";

import type {
  ComparacaoReceitaEstadualDTO,
  EmendaEmpenhoItemDTO,
  EmendasEstaduaisDTO,
  FonteEmendaDTO,
} from "@transparencia/db";
import {
  AlertBox,
  Badge,
  cn,
  DenseTable,
  fmtCompact,
  fmtCpfCnpj,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  ModalDialog,
  toTitleCase,
} from "@transparencia/ui";
import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { EmendasEstaduaisBloco } from "@/components/emendas-estaduais-bloco";
import { FontesEmendas } from "@/components/fontes-emendas";
import { SectionWithHeader } from "@/components/section-with-header";
import { TabelaTotaisRow } from "@/components/tabela-totais-row";

export interface SaudeEmendaItem {
  id: string;
  numero: string;
  objeto: string;
  valorAutorizado: number;
  empenhado: number | null;
  autor: string;
  origem?: string;
  tipoEmenda: string;
  esferaOrigem: string;
  atoNormativo: string;
  destinacao: string;
  quantidadeEmpenhos?: number;
  empenhos?: EmendaEmpenhoItemDTO[];
  valorRecebidoFundo?: number;
  recebimentoFundo?: string;
  receitaCodigo?: string | null;
  receitaDescricao?: string | null;
}

export interface SaudeEmendasStatsProps {
  totalAutorizado: number;
  totalEmpenhado: number;
  totalRecebidoFundo?: number;
  totalReceitaPossivel?: number;
  taxaEmpenho: number;
  maiorEmenda: number;
  lista: SaudeEmendaItem[];
}

export interface EmendasSectionProps {
  ano: number;
  emendasStats: SaudeEmendasStatsProps;
  portalSlug?: string;
  titulo?: string;
  descricao?: string;
  /** Âncora e resumo: com `resumo`, a seção nasce recolhida. */
  id?: string;
  resumo?: React.ReactNode;
  /** Lista oficial do Estado, como subseção da mesma seção. */
  emendasEstaduais?: EmendasEstaduaisDTO;
  comparacaoReceitaEstadual?: ComparacaoReceitaEstadualDTO;
  /** Fontes do Estado, do Governo federal e da Prefeitura. */
  fontes?: FonteEmendaDTO[];
}

const TITULO_PADRAO = "Emendas parlamentares destinadas à Saúde";
const DESCRICAO_PADRAO =
  "Recursos que deputados e senadores destinaram à saúde do município.";

function EmpenhoDescricaoCell({ descricao }: { descricao?: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!descricao || descricao.trim() === "") {
    return <span className="text-mute2 text-xs italic">—</span>;
  }

  const isLong = descricao.length > 110;

  return (
    <div className="space-y-1 py-0.5 text-ink text-xs">
      <p
        className={cn(
          "break-words leading-relaxed",
          !isExpanded && isLong && "line-clamp-3",
        )}
        title={descricao}
      >
        {descricao}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="inline-flex cursor-pointer items-center gap-1 font-medium text-brand-text text-xs transition-colors hover:underline hover:underline focus:outline-none"
        >
          <span>
            {isExpanded ? "Recolher texto" : "Ler histórico completo"}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}

export function EmendasSection({
  ano,
  emendasStats,
  portalSlug,
  titulo = TITULO_PADRAO,
  descricao = DESCRICAO_PADRAO,
  id,
  resumo,
  emendasEstaduais,
  comparacaoReceitaEstadual,
  fontes,
}: EmendasSectionProps) {
  const [selectedEmenda, setSelectedEmenda] = useState<SaudeEmendaItem | null>(
    null,
  );

  const countEmendas = emendasStats.lista.length;
  const totalRecebidoFundo = emendasStats.totalRecebidoFundo ?? 0;
  const totalReceitaPossivel = emendasStats.totalReceitaPossivel ?? 0;
  const percentualRecebido =
    emendasStats.totalAutorizado > 0
      ? (totalRecebidoFundo / emendasStats.totalAutorizado) * 100
      : 0;

  const tableData = useMemo(
    () =>
      emendasStats.lista
        .slice()
        .sort((a, b) => {
          const aEmp = a.empenhado ?? 0;
          const bEmp = b.empenhado ?? 0;
          const aHas = aEmp > 0 || (a.quantidadeEmpenhos ?? 0) > 0;
          const bHas = bEmp > 0 || (b.quantidadeEmpenhos ?? 0) > 0;

          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;

          if (aHas && bHas && bEmp !== aEmp) {
            return bEmp - aEmp;
          }

          if (b.valorAutorizado !== a.valorAutorizado) {
            return b.valorAutorizado - a.valorAutorizado;
          }

          return a.autor.localeCompare(b.autor, "pt-BR");
        })
        .map((item) => ({
          ...item,
          autor: toTitleCase(item.autor),
          origem: item.esferaOrigem
            ? toTitleCase(item.esferaOrigem)
            : "Não informada",
          objeto: toTitleCase(item.objeto),
        })),
    [emendasStats.lista],
  );

  // Emendas após a busca da tabela: os totais acompanham o que está filtrado
  const [emendasVisiveis, setEmendasVisiveis] = useState<
    { valorAutorizado: number; empenhado: number | null }[] | null
  >(null);
  const handleFilteredDataChange = useCallback(
    (rows: { valorAutorizado: number; empenhado: number | null }[]) => {
      setEmendasVisiveis(rows);
    },
    [],
  );
  const totaisVisiveis = useMemo(() => {
    if (!emendasVisiveis) {
      return {
        autorizado: emendasStats.totalAutorizado,
        empenhado: emendasStats.totalEmpenhado,
      };
    }
    return {
      autorizado: emendasVisiveis.reduce(
        (sum, e) => sum + e.valorAutorizado,
        0,
      ),
      empenhado: emendasVisiveis.reduce(
        (sum, e) => sum + (e.empenhado ?? 0),
        0,
      ),
    };
  }, [
    emendasVisiveis,
    emendasStats.totalAutorizado,
    emendasStats.totalEmpenhado,
  ]);

  const emendasCols = [
    {
      header: "Autor da Emenda",
      accessorKey: "autor" as const,
      className: "min-w-[11rem] whitespace-nowrap font-bold",
      renderCell: (row: SaudeEmendaItem) => {
        const qtd = row.quantidadeEmpenhos ?? 0;
        if (qtd > 0) {
          return (
            <button
              type="button"
              onClick={() => setSelectedEmenda(row)}
              className="cursor-pointer text-left font-bold text-ink transition-colors hover:text-brand-text hover:underline"
              title="Clique para auditar notas de empenho vinculadas"
            >
              {toTitleCase(row.autor)}
            </button>
          );
        }
        return <span>{toTitleCase(row.autor)}</span>;
      },
    },
    {
      header: "Objeto",
      accessorKey: "objeto" as const,
      className: "min-w-[14rem]",
    },
    {
      header: "Origem",
      accessorKey: "origem" as const,
      className: "font-medium text-ink whitespace-nowrap",
    },
    {
      header: "Valor Autorizado",
      footer: fmtCurrency(totaisVisiveis.autorizado),
      accessorKey: "valorAutorizado" as const,
      align: "right" as const,
      format: "currency" as const,
      defaultSortDir: "desc" as const,
    },
    {
      header: "Empenhado",
      footer: <span>{fmtCurrency(totaisVisiveis.empenhado)}</span>,
      accessorKey: "empenhado" as const,
      align: "right" as const,
      format: "currency" as const,
      defaultSortDir: "desc" as const,
      sortValue: (row: SaudeEmendaItem) => row.empenhado ?? -1,
    },
  ];

  const modalMetrics = useMemo(() => {
    if (!selectedEmenda) return null;
    const empenhosList = selectedEmenda.empenhos ?? [];
    const totalEmpenhadoModal = empenhosList.reduce(
      (acc, e) => acc + e.valorEmpenhado,
      0,
    );
    const totalLiquidadoModal = empenhosList.reduce(
      (acc, e) => acc + e.valorLiquidado,
      0,
    );
    const totalPagoModal = empenhosList.reduce(
      (acc, e) => acc + e.valorPago,
      0,
    );
    const empenhadoRef = Math.max(
      selectedEmenda.empenhado ?? 0,
      totalEmpenhadoModal,
    );
    const saldoDisponivel = Math.max(
      0,
      selectedEmenda.valorAutorizado - empenhadoRef,
    );
    const percentualExecutado =
      selectedEmenda.valorAutorizado > 0
        ? (empenhadoRef / selectedEmenda.valorAutorizado) * 100
        : 0;

    return {
      empenhosList,
      totalEmpenhadoModal: empenhadoRef,
      totalLiquidadoModal,
      totalPagoModal,
      saldoDisponivel,
      percentualExecutado,
    };
  }, [selectedEmenda]);

  return (
    <SectionWithHeader
      id={id}
      summary={resumo}
      eyebrow={`${countEmendas} ${countEmendas === 1 ? "emenda" : "emendas"} · exercício ${ano}`}
      title={titulo}
      description={`${descricao} O que importa não é só quanto foi autorizado, mas se esse dinheiro chegou e foi usado.`}
    >
      {countEmendas > 0 && (
        <>
          <IndicatorPanel columns={4}>
            <Indicator
              label="Autorizado"
              value={fmtCompact(emendasStats.totalAutorizado)}
              note="valor das emendas"
            />
            <Indicator
              label="Confirmada na receita"
              value={fmtCompact(totalRecebidoFundo)}
              note={`${fmtPercent(percentualRecebido)} do autorizado, pelo número da proposta`}
            />
            <Indicator
              label="Empenhado no cadastro"
              value={fmtCompact(emendasStats.totalEmpenhado)}
              note={`${fmtPercent(emendasStats.taxaEmpenho * 100)} do autorizado, como informado pelo portal`}
            />
            <Indicator
              label="Maior emenda"
              value={fmtCompact(emendasStats.maiorEmenda)}
            />
          </IndicatorPanel>

          {emendasStats.totalAutorizado > 0 && (
            <AlertBox type="info" title="O dinheiro das emendas chegou?">
              {fmtCompact(emendasStats.totalAutorizado)} foram destinados por
              emendas.{" "}
              {totalRecebidoFundo > 0 ? (
                <>
                  {fmtCompact(totalRecebidoFundo)} (
                  {fmtPercent(percentualRecebido)}) aparecem na receita com o
                  número da proposta
                  {totalReceitaPossivel > 0
                    ? `, e ${fmtCompact(totalReceitaPossivel)} têm receita de mesmo valor, sem confirmação`
                    : ""}
                  .{" "}
                </>
              ) : totalReceitaPossivel > 0 ? (
                <>
                  Nenhuma foi confirmada na receita pelo número da proposta;{" "}
                  {fmtCompact(totalReceitaPossivel)} têm receita de mesmo valor,
                  sem confirmação.{" "}
                </>
              ) : (
                <>Não foi possível identificar emendas na receita. </>
              )}
              O empenho depende do que a Prefeitura registrou no cadastro: sem
              registro, aparece zero mesmo que o dinheiro tenha sido usado. Para
              conferir, procure no portal do município a receita indicada na
              tabela.
            </AlertBox>
          )}

          {/* Tabela Densa com Linha de Totalizador */}
          <div className="space-y-2">
            <DenseTable
              sortable
              data={tableData}
              onFilteredDataChange={handleFilteredDataChange}
              columns={emendasCols}
              searchableKeys={["autor", "objeto", "origem"]}
              rowKey="id"
              renderExpandedRow={(row) => {
                const confirmada =
                  row.recebimentoFundo === "confirmado_por_proposta";
                const qtd = row.quantidadeEmpenhos ?? 0;
                return (
                  <div className="space-y-4">
                    <dl className="grid grid-cols-2 gap-4 sm:hidden">
                      <div className="col-span-2">
                        <dt className="eyebrow">Objeto</dt>
                        <dd className="mt-1 text-ink">
                          {row.objeto || "Objeto não informado."}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Proposta</dt>
                        <dd className="mt-1 text-ink">{row.numero || "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Destinação</dt>
                        <dd className="mt-1 text-ink">
                          {row.destinacao ? toTitleCase(row.destinacao) : "—"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="eyebrow">Empenhado no cadastro</dt>
                        <dd className="mt-1 text-ink">
                          {fmtCurrency(row.empenhado ?? 0)}
                        </dd>
                      </div>
                    </dl>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="eyebrow">Receita correspondente</dt>
                        <dd className="mt-1 text-ink">
                          {row.receitaDescricao
                            ? toTitleCase(row.receitaDescricao)
                            : "Nenhuma receita identificada para esta emenda."}
                        </dd>
                        {row.receitaCodigo ? (
                          <dd className="caption">
                            Código contábil {row.receitaCodigo}
                          </dd>
                        ) : null}
                      </div>
                      <div>
                        <dt className="eyebrow">Como foi identificada</dt>
                        <dd className="mt-1 text-ink">
                          {row.receitaDescricao
                            ? confirmada
                              ? "Pelo valor e pelo número da proposta."
                              : "Só pelo valor, sem o número da proposta. Pode ser coincidência."
                            : "Não há receita com o mesmo valor ou o mesmo número de proposta."}
                        </dd>
                      </div>
                    </dl>
                    {row.receitaDescricao ? (
                      <p className="caption">
                        Para conferir, procure essa descrição no portal oficial
                        do município.
                      </p>
                    ) : null}
                    {qtd > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedEmenda(row)}
                        className="inline-flex min-h-11 cursor-pointer items-center text-brand-text underline underline-offset-2"
                      >
                        Ver notas de empenho
                      </button>
                    ) : null}
                  </div>
                );
              }}
              renderMobileRow={(row) => {
                const qtd = row.quantidadeEmpenhos ?? 0;
                const rastreio = (() => {
                  if (qtd > 0)
                    return `${qtd} ${qtd === 1 ? "empenho" : "empenhos"}`;
                  if (row.recebimentoFundo === "confirmado_por_proposta")
                    return "Aparece na receita";
                  if (row.recebimentoFundo === "valor_igual")
                    return "Receita de mesmo valor";
                  if ((row.empenhado ?? 0) > 0)
                    return "Empenho sem notas ligadas";
                  return "Sem empenho";
                })();
                return {
                  resumo: (
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold text-ink text-sm">
                          {toTitleCase(row.autor)}
                        </span>
                        <span className="shrink-0 font-bold text-ink text-sm tabular-nums">
                          {fmtCurrency(row.valorAutorizado)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-ink text-xs leading-snug">
                        {row.objeto || "Objeto não informado."}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-mute text-xs">
                        <Badge variant="accent">
                          {row.origem || "Federal"}
                        </Badge>
                        {qtd > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEmenda(row)}
                            className="inline-flex min-h-11 cursor-pointer items-center text-brand-text underline underline-offset-2"
                            title="Auditar notas de empenho e compras vinculadas"
                          >
                            {rastreio}
                          </button>
                        ) : (
                          <span>{rastreio}</span>
                        )}
                      </div>
                    </div>
                  ),
                  detalhes: null,
                };
              }}
              hideCsvOnMobile
            />

            {/* Total Summary Footer Row */}
            <TabelaTotaisRow
              className="sm:hidden"
              itens={[
                { rotulo: "Autorizado", valor: totaisVisiveis.autorizado },
                {
                  rotulo: "Empenhado",
                  valor: totaisVisiveis.empenhado,
                  isAlerta: false,
                },
              ]}
            />
          </div>
        </>
      )}

      {emendasEstaduais && (
        <EmendasEstaduaisBloco
          dados={emendasEstaduais}
          comparacaoReceita={comparacaoReceitaEstadual}
        />
      )}

      {fontes && <FontesEmendas fontes={fontes} />}

      {/* Modal de Detalhamento e Rastreabilidade da Emenda */}
      {selectedEmenda && modalMetrics && (
        <ModalDialog
          isOpen={Boolean(selectedEmenda)}
          onClose={() => setSelectedEmenda(null)}
          maxWidth="6xl"
          title={`Emenda Parlamentar · ${toTitleCase(selectedEmenda.autor)}`}
          subtitle={
            selectedEmenda.numero
              ? `Proposta nº ${selectedEmenda.numero}`
              : selectedEmenda.objeto
          }
          badge={
            <Badge variant="accent">
              {selectedEmenda.esferaOrigem
                ? toTitleCase(selectedEmenda.esferaOrigem)
                : "Federal"}
            </Badge>
          }
          footer={
            <div className="flex w-full items-center justify-between text-xs">
              <span className="text-mute">
                {modalMetrics.empenhosList.length}{" "}
                {modalMetrics.empenhosList.length === 1
                  ? "nota de empenho vinculada"
                  : "notas de empenho vinculadas"}
              </span>
              {portalSlug && (
                <Link
                  href={`/${portalSlug}/licitacoes?ano=${ano}#licitacoes-em-andamento`}
                  className="inline-flex items-center gap-1 font-medium text-brand-text hover:underline hover:underline"
                >
                  <span>Ver painel de compras e licitações</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          }
        >
          <div className="space-y-6 py-2">
            {/* Bloco 1: Autor, Proposta, Esfera, Destinação e Ato Normativo */}
            <div className="grid grid-cols-1 gap-4 border-line border-y bg-line2 p-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <span className="font-semibold text-mute text-xs uppercase tracking-wider">
                  Autor da Emenda
                </span>
                <p className="mt-0.5 font-semibold text-ink text-sm">
                  {toTitleCase(selectedEmenda.autor)}
                </p>
                {selectedEmenda.numero && (
                  <p className="mt-0.5 text-mute text-xs">
                    Proposta / Registro:{" "}
                    <span className="text-ink">{selectedEmenda.numero}</span>
                  </p>
                )}
                {selectedEmenda.tipoEmenda && (
                  <p className="mt-1 text-mute text-xs">
                    Tipo de Emenda:{" "}
                    <span className="font-semibold text-ink">
                      {toTitleCase(selectedEmenda.tipoEmenda)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <span className="font-semibold text-mute text-xs uppercase tracking-wider">
                  Esfera e Destinação
                </span>
                <p className="mt-0.5 font-medium text-ink text-sm">
                  {selectedEmenda.esferaOrigem
                    ? toTitleCase(selectedEmenda.esferaOrigem)
                    : "Federal"}
                </p>
                {selectedEmenda.destinacao && (
                  <p className="mt-0.5 text-mute text-xs">
                    Destinação:{" "}
                    <span className="font-semibold text-ink">
                      {toTitleCase(selectedEmenda.destinacao)}
                    </span>
                  </p>
                )}
                {selectedEmenda.atoNormativo && (
                  <p className="mt-1 text-mute text-xs">
                    Ato Normativo:{" "}
                    <span className="text-ink">
                      {selectedEmenda.atoNormativo}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Objeto Integral da Emenda */}
            <div className="min-w-0">
              <span className="font-semibold text-mute text-xs uppercase tracking-wider">
                Objeto Integral da Emenda
              </span>
              <div className="mt-1.5 whitespace-pre-wrap break-words border-line border-t pt-3.5 text-ink text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word] sm:pt-4">
                {selectedEmenda.objeto || "Objeto não informado."}
              </div>
            </div>

            {/* Bloco 3: Grid de Métricas Orçamentárias e Execução Financeira */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3>Execução Orçamentária e Financeira</h3>
                {selectedEmenda.valorAutorizado > 0 && (
                  <div className="flex items-baseline gap-1.5 border border-brand-fill bg-brand-fill/15 px-3 py-1 text-right">
                    <span className="font-semibold text-brand-text text-xs uppercase tracking-wider">
                      Valor Autorizado:
                    </span>
                    <span className="font-bold font-serif text-base text-brand-text sm:text-lg">
                      {fmtCurrency(selectedEmenda.valorAutorizado)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="border-line border-t pt-3.5">
                  <span className="font-medium text-mute text-xs">
                    Empenhado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-ink sm:text-lg">
                    {fmtCurrency(modalMetrics.totalEmpenhadoModal)}
                  </p>
                </div>

                <div className="border-line border-t pt-3.5">
                  <span className="font-medium text-mute text-xs">
                    Liquidado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-ink sm:text-lg">
                    {fmtCurrency(modalMetrics.totalLiquidadoModal)}
                  </p>
                </div>

                <div className="border-line border-t pt-3.5">
                  <span className="font-medium text-mute text-xs">Pago</span>
                  <p className="mt-1 font-semibold font-serif text-base text-ok-text sm:text-lg">
                    {fmtCurrency(modalMetrics.totalPagoModal)}
                  </p>
                </div>

                <div className="border-line border-t pt-3.5">
                  <span className="font-medium text-mute text-xs">
                    Saldo a Executar
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-warn-text sm:text-lg">
                    {fmtCurrency(modalMetrics.saldoDisponivel)}
                  </p>
                </div>
              </div>

              {/* Barra de Progresso e Percentual de Execução */}
              <div className="mt-4 border-line border-y bg-line2 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    Percentual Executado da Emenda
                  </span>
                  <span className="font-semibold font-serif text-ink text-sm">
                    {fmtPercent(modalMetrics.percentualExecutado)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden bg-track">
                  <div
                    className="h-full bg-ok-fill transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, modalMetrics.percentualExecutado || 0))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 4: Tabela de Notas de Empenho Vinculadas */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3>
                    Notas de Empenho Vinculadas (
                    {modalMetrics.empenhosList.length})
                  </h3>
                  <p className="text-mute text-xs">
                    Despesas municipais identificadas pela menção formal à
                    emenda/proposta orçamentária.
                  </p>
                </div>
              </div>

              <DenseTable
                sortable
                pageSize={8}
                searchPlaceholder="Filtrar por credor, CNPJ, licitação ou empenho..."
                data={modalMetrics.empenhosList}
                columns={[
                  {
                    header: "Data",
                    accessorKey: "dataEmpenho" as const,
                    className: "whitespace-nowrap text-xs text-mute",
                    renderCell: (e) =>
                      e.dataEmpenho ? fmtDate(e.dataEmpenho) : "—",
                  },
                  {
                    header: "Nº Empenho",
                    accessorKey: "empenhoId" as const,
                    className: "font-semibold text-xs text-ink",
                  },
                  {
                    header: "Credor / Fornecedor",
                    accessorKey: "fornecedorNome" as const,
                    className: "min-w-[200px]",
                    renderCell: (e) => (
                      <div>
                        <p
                          className="line-clamp-1 font-semibold text-ink text-xs"
                          title={e.fornecedorNome}
                        >
                          {toTitleCase(e.fornecedorNome)}
                        </p>
                        {e.fornecedorCpfCnpj ? (
                          <p className="text-mute text-xs">
                            {fmtCpfCnpj(e.fornecedorCpfCnpj)}
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    header: "Licitação / Processo",
                    accessorKey: "licitacaoNumero" as const,
                    className: "whitespace-nowrap text-xs",
                    renderCell: (e) => {
                      if (!e.licitacaoNumero) {
                        return <span className="text-mute2 text-xs">—</span>;
                      }
                      return (
                        <div className="flex flex-col">
                          {portalSlug ? (
                            <Link
                              href={`/${portalSlug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(e.licitacaoNumero)}#licitacoes-em-andamento`}
                              className="inline-flex items-center gap-1 font-medium text-brand-text underline decoration-brand-fill hover:underline"
                              title="Ver detalhes da licitação"
                            >
                              <span>{e.licitacaoNumero}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </Link>
                          ) : (
                            <span className="font-medium text-ink">
                              {e.licitacaoNumero}
                            </span>
                          )}
                          {e.licitacaoModalidade && (
                            <span className="text-mute text-xs">
                              {toTitleCase(e.licitacaoModalidade)}
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: "Empenhado",
                    accessorKey: "valorEmpenhado" as const,
                    align: "right" as const,
                    format: "currency" as const,
                    isSerifNumeric: true,
                  },
                  {
                    header: "Liquidado",
                    accessorKey: "valorLiquidado" as const,
                    align: "right" as const,
                    format: "currency" as const,
                    isSerifNumeric: true,
                  },
                  {
                    header: "Pago",
                    accessorKey: "valorPago" as const,
                    align: "right" as const,
                    format: "currency" as const,
                    isSerifNumeric: true,
                  },
                  {
                    header: "Histórico da Despesa",
                    accessorKey: "descricao" as const,
                    className: "min-w-[320px] max-w-xl text-ink text-xs",
                    renderCell: (e) => (
                      <EmpenhoDescricaoCell descricao={e.descricao} />
                    ),
                  },
                ]}
                searchableKeys={[
                  "fornecedorNome",
                  "fornecedorCpfCnpj",
                  "empenhoId",
                  "licitacaoNumero",
                  "descricao",
                ]}
                rowKey="empenhoId"
                renderMobileCard={(e) => (
                  <div className="space-y-3 border-line border-t pt-3.5">
                    <div className="flex items-center justify-between gap-2 border-line border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-xs">
                          Empenho #{e.empenhoId}
                        </span>
                        {e.dataEmpenho && (
                          <span className="text-mute text-xs">
                            · {fmtDate(e.dataEmpenho)}
                          </span>
                        )}
                      </div>
                      {e.licitacaoNumero &&
                        (portalSlug ? (
                          <Link
                            href={`/${portalSlug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(e.licitacaoNumero)}#licitacoes-em-andamento`}
                            className="inline-flex items-center gap-1 rounded bg-line2 px-1.5 py-0.5 font-medium text-brand-text text-xs underline decoration-brand-fill hover:underline"
                            title="Ver detalhes da licitação"
                          >
                            <span>{e.licitacaoNumero}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </Link>
                        ) : (
                          <span className="rounded bg-line2 px-1.5 py-0.5 font-medium text-ink text-xs">
                            {e.licitacaoNumero}
                          </span>
                        ))}
                    </div>

                    <div>
                      <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                        Credor / Fornecedor
                      </span>
                      <p className="font-semibold text-ink text-xs">
                        {toTitleCase(e.fornecedorNome)}
                      </p>
                      {e.fornecedorCpfCnpj && (
                        <p className="text-mute text-xs">
                          {fmtCpfCnpj(e.fornecedorCpfCnpj)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-line2 p-2 text-center">
                      <div>
                        <span className="block text-mute text-xs">
                          Empenhado
                        </span>
                        <span className="font-semibold font-serif text-ink text-xs">
                          {fmtCurrency(e.valorEmpenhado)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-mute text-xs">
                          Liquidado
                        </span>
                        <span className="font-semibold font-serif text-ink text-xs">
                          {fmtCurrency(e.valorLiquidado)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-mute text-xs">Pago</span>
                        <span className="font-semibold font-serif text-ok-text text-xs">
                          {fmtCurrency(e.valorPago)}
                        </span>
                      </div>
                    </div>

                    {e.descricao && (
                      <div>
                        <span className="font-semibold text-mute2 text-xs uppercase tracking-wider">
                          Histórico da Despesa
                        </span>
                        <EmpenhoDescricaoCell descricao={e.descricao} />
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </ModalDialog>
      )}
    </SectionWithHeader>
  );
}
