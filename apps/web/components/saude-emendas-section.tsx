"use client";

import type { EmendaEmpenhoItemDTO } from "@transparencia/db";
import {
  Badge,
  cn,
  DenseTable,
  fmtCompact,
  fmtCpfCnpj,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  KPICard,
  ModalDialog,
  toTitleCase,
} from "@transparencia/ui";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { KPIGrid } from "@/components/kpi-grid";

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
  qtdEmpenhos?: number;
  empenhos?: EmendaEmpenhoItemDTO[];
}

export interface SaudeEmendasStatsProps {
  totalAutorizado: number;
  totalEmpenhado: number;
  taxaEmpenho: number;
  maiorEmenda: number;
  lista: SaudeEmendaItem[];
}

export interface SaudeEmendasSectionProps {
  ano: number;
  emendasStats: SaudeEmendasStatsProps;
  portalSlug?: string;
}

function EmpenhoDescricaoCell({ descricao }: { descricao?: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!descricao || descricao.trim() === "") {
    return <span className="text-slate-400 text-xs italic">—</span>;
  }

  const isLong = descricao.length > 110;

  return (
    <div className="space-y-1 py-0.5 text-slate-700 text-xs">
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
          className="inline-flex cursor-pointer items-center gap-1 font-medium text-[11px] text-blue-600 transition-colors hover:text-blue-800 hover:underline focus:outline-none"
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

export function SaudeEmendasSection({
  ano,
  emendasStats,
  portalSlug,
}: SaudeEmendasSectionProps) {
  const [selectedEmenda, setSelectedEmenda] = useState<SaudeEmendaItem | null>(
    null,
  );

  const countEmendas = emendasStats.lista.length;
  const isZeroEmpenhado = emendasStats.totalEmpenhado === 0;

  const emendasCols = [
    {
      header: "Autor da Emenda",
      accessorKey: "autor" as const,
      className: "font-bold whitespace-nowrap sm:whitespace-normal",
      renderCell: (row: SaudeEmendaItem) => {
        const qtd = row.qtdEmpenhos ?? 0;
        if (qtd > 0) {
          return (
            <button
              type="button"
              onClick={() => setSelectedEmenda(row)}
              className="cursor-pointer text-left font-bold text-slate-900 transition-colors hover:text-blue-700 hover:underline"
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
      header: "Rastreabilidade",
      accessorKey: "qtdEmpenhos" as const,
      align: "center" as const,
      className: "whitespace-nowrap",
      renderCell: (row: SaudeEmendaItem) => {
        const qtd = row.qtdEmpenhos ?? 0;
        if (qtd > 0) {
          return (
            <button
              type="button"
              onClick={() => setSelectedEmenda(row)}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 text-xs shadow-2xs transition-all hover:bg-blue-100 hover:text-blue-900"
              title="Auditar notas de empenho e compras vinculadas"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>
                {qtd} {qtd === 1 ? "empenho" : "empenhos"}
              </span>
            </button>
          );
        }
        if (row.empenhado && row.empenhado > 0) {
          return (
            <span
              className="inline-flex items-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 font-medium text-[11px] text-slate-600"
              title="Empenho executado em bloco orçamentário / folha de saúde"
            >
              Bloco Orçamentário
            </span>
          );
        }
        return (
          <span className="whitespace-nowrap text-slate-400 text-xs">
            Sem empenho
          </span>
        );
      },
    },
    {
      header: "Origem",
      accessorKey: "origem" as const,
      className: "font-medium text-slate-700 whitespace-nowrap",
    },
    {
      header: "Objeto",
      accessorKey: "objeto" as const,
      className: "max-w-[250px]",
    },
    {
      header: "Valor Autorizado",
      accessorKey: "valorAutorizado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Empenhado",
      accessorKey: "empenhado" as const,
      align: "right" as const,
      format: "currency" as const,
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
    <section className="space-y-6 border-[#1a1d21] border-t-2 pt-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-serif text-2xl text-slate-900">
            Emendas parlamentares destinadas à Saúde
          </h2>
          <p className="mt-1 max-w-3xl text-slate-600 text-sm leading-relaxed">
            Recursos que deputados e senadores destinaram à saúde do município.
            O que importa não é só quanto foi{" "}
            <strong className="font-bold text-slate-900">autorizado</strong>,
            mas se esse dinheiro foi de fato{" "}
            <strong className="font-bold text-slate-900">empenhado</strong> — o
            passo que transforma a promessa em contrato e serviço.
          </p>
        </div>
        <span className="shrink-0 text-slate-500 text-xs">
          {countEmendas} {countEmendas === 1 ? "emenda" : "emendas"} · exercício{" "}
          {ano}
        </span>
      </div>

      {/* Banner de Alerta Âmbar */}
      {emendasStats.totalAutorizado > 0 && (
        <div className="flex items-start gap-3 rounded-xl border-amber-500 border-l-4 bg-amber-50/80 p-4 text-amber-950 text-xs shadow-2xs sm:text-sm">
          <div>
            <strong className="font-bold">
              {fmtCompact(emendasStats.totalAutorizado)} foram destinados por
              emendas.
            </strong>{" "}
            {isZeroEmpenhado ? (
              <>
                Até agora, <strong className="font-bold">R$ 0</strong> haviam
                sido empenhados. O recurso está disponível, mas ainda não virou
                contrato — sinal de atenção para acompanhar de perto.
              </>
            ) : (
              <>
                Até agora,{" "}
                <strong className="font-bold">
                  {fmtCompact(emendasStats.totalEmpenhado)}
                </strong>{" "}
                foram empenhados ({fmtPercent(emendasStats.taxaEmpenho * 100)}{" "}
                do total).
              </>
            )}
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          title="Total autorizado"
          value={fmtCompact(emendasStats.totalAutorizado)}
        />
        <KPICard
          title="Total empenhado"
          value={
            <span
              className={
                isZeroEmpenhado
                  ? "font-bold text-amber-700"
                  : "font-bold text-slate-900"
              }
            >
              {fmtCompact(emendasStats.totalEmpenhado)}
            </span>
          }
        />
        <KPICard
          title="Taxa de empenho"
          value={
            <span
              className={
                isZeroEmpenhado
                  ? "font-bold text-amber-700"
                  : "font-bold text-slate-900"
              }
            >
              {fmtPercent(emendasStats.taxaEmpenho * 100)}
            </span>
          }
        />
        <KPICard
          title="Maior emenda"
          value={fmtCompact(emendasStats.maiorEmenda)}
        />
      </KPIGrid>

      {/* Tabela Densa com Linha de Totalizador */}
      <div className="space-y-2">
        <DenseTable
          sortable
          data={emendasStats.lista.map((item) => ({
            ...item,
            autor: toTitleCase(item.autor),
            origem: item.esferaOrigem
              ? toTitleCase(item.esferaOrigem)
              : "Não informada",
            objeto: toTitleCase(item.objeto),
          }))}
          columns={emendasCols}
          searchableKeys={["autor", "objeto", "origem"]}
          rowKey="id"
        />

        {/* Total Summary Footer Row */}
        <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 font-bold text-slate-900 text-sm">
          <span>Total</span>
          <div className="flex items-center gap-8">
            <span>
              {fmtCurrency(emendasStats.totalAutorizado)} (Autorizado)
            </span>
            <span
              className={isZeroEmpenhado ? "text-amber-700" : "text-slate-900"}
            >
              {fmtCurrency(emendasStats.totalEmpenhado)} (Empenhado)
            </span>
          </div>
        </div>
      </div>

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
              <span className="text-slate-500">
                {modalMetrics.empenhosList.length}{" "}
                {modalMetrics.empenhosList.length === 1
                  ? "nota de empenho vinculada"
                  : "notas de empenho vinculadas"}
              </span>
              {portalSlug && (
                <Link
                  href={`/${portalSlug}/licitacoes?ano=${ano}#licitacoes-em-andamento`}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
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
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 sm:gap-6">
              <div>
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  Autor da Emenda
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 text-sm">
                  {toTitleCase(selectedEmenda.autor)}
                </p>
                {selectedEmenda.numero && (
                  <p className="mt-0.5 text-slate-600 text-xs">
                    Proposta / Registro:{" "}
                    <span className="text-slate-800">
                      {selectedEmenda.numero}
                    </span>
                  </p>
                )}
                {selectedEmenda.tipoEmenda && (
                  <p className="mt-1 text-slate-600 text-xs">
                    Tipo de Emenda:{" "}
                    <span className="font-semibold text-slate-800">
                      {toTitleCase(selectedEmenda.tipoEmenda)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  Esfera e Destinação
                </span>
                <p className="mt-0.5 font-medium text-slate-900 text-sm">
                  {selectedEmenda.esferaOrigem
                    ? toTitleCase(selectedEmenda.esferaOrigem)
                    : "Federal"}
                </p>
                {selectedEmenda.destinacao && (
                  <p className="mt-0.5 text-slate-600 text-xs">
                    Destinação:{" "}
                    <span className="font-semibold text-slate-800">
                      {toTitleCase(selectedEmenda.destinacao)}
                    </span>
                  </p>
                )}
                {selectedEmenda.atoNormativo && (
                  <p className="mt-1 text-slate-600 text-xs">
                    Ato Normativo:{" "}
                    <span className="text-slate-800">
                      {selectedEmenda.atoNormativo}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Objeto Integral da Emenda */}
            <div className="min-w-0">
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                Objeto Integral da Emenda
              </span>
              <div className="mt-1.5 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 text-sm leading-relaxed shadow-2xs [overflow-wrap:anywhere] [word-break:break-word] sm:p-4">
                {selectedEmenda.objeto || "Objeto não informado."}
              </div>
            </div>

            {/* Bloco 3: Grid de Métricas Orçamentárias e Execução Financeira */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Execução Orçamentária e Financeira
                </h3>
                {selectedEmenda.valorAutorizado > 0 && (
                  <div className="flex items-baseline gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50/60 px-3 py-1 text-right">
                    <span className="font-semibold text-[11px] text-blue-900 uppercase tracking-wider">
                      Valor Autorizado:
                    </span>
                    <span className="font-bold font-serif text-base text-blue-950 sm:text-lg">
                      {fmtCurrency(selectedEmenda.valorAutorizado)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Empenhado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                    {fmtCurrency(modalMetrics.totalEmpenhadoModal)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Liquidado
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                    {fmtCurrency(modalMetrics.totalLiquidadoModal)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Pago
                  </span>
                  <p className="mt-1 font-semibold font-serif text-base text-emerald-700 sm:text-lg">
                    {fmtCurrency(modalMetrics.totalPagoModal)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <span className="font-medium text-slate-500 text-xs">
                    Saldo a Executar
                  </span>
                  <p className="mt-1 font-semibold font-serif text-amber-700 text-base sm:text-lg">
                    {fmtCurrency(modalMetrics.saldoDisponivel)}
                  </p>
                </div>
              </div>

              {/* Barra de Progresso e Percentual de Execução */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Percentual Executado da Emenda
                  </span>
                  <span className="font-semibold font-serif text-slate-900 text-sm">
                    {fmtPercent(modalMetrics.percentualExecutado)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
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
                  <h3 className="font-bold text-slate-900 text-sm">
                    Notas de Empenho Vinculadas (
                    {modalMetrics.empenhosList.length})
                  </h3>
                  <p className="text-slate-500 text-xs">
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
                    className: "whitespace-nowrap text-xs text-slate-600",
                    renderCell: (e) =>
                      e.dataEmpenho ? fmtDate(e.dataEmpenho) : "—",
                  },
                  {
                    header: "Nº Empenho",
                    accessorKey: "empenhoId" as const,
                    className: "font-semibold text-xs text-slate-900",
                  },
                  {
                    header: "Credor / Fornecedor",
                    accessorKey: "fornecedorNome" as const,
                    className: "min-w-[200px]",
                    renderCell: (e) => (
                      <div>
                        <p
                          className="line-clamp-1 font-semibold text-slate-900 text-xs"
                          title={e.fornecedorNome}
                        >
                          {toTitleCase(e.fornecedorNome)}
                        </p>
                        {e.fornecedorCpfCnpj ? (
                          <p className="text-[11px] text-slate-500">
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
                        return (
                          <span className="text-slate-400 text-xs">—</span>
                        );
                      }
                      return (
                        <div className="flex flex-col">
                          {portalSlug ? (
                            <Link
                              href={`/${portalSlug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(e.licitacaoNumero)}#licitacoes-em-andamento`}
                              className="inline-flex items-center gap-1 font-medium text-blue-700 underline decoration-blue-300 hover:text-blue-900"
                              title="Ver detalhes da licitação"
                            >
                              <span>{e.licitacaoNumero}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-800">
                              {e.licitacaoNumero}
                            </span>
                          )}
                          {e.licitacaoModalidade && (
                            <span className="text-[10px] text-slate-500">
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
                    className: "min-w-[320px] max-w-xl text-slate-700 text-xs",
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
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-slate-100 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">
                          Empenho #{e.empenhoId}
                        </span>
                        {e.dataEmpenho && (
                          <span className="text-[11px] text-slate-500">
                            · {fmtDate(e.dataEmpenho)}
                          </span>
                        )}
                      </div>
                      {e.licitacaoNumero &&
                        (portalSlug ? (
                          <Link
                            href={`/${portalSlug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(e.licitacaoNumero)}#licitacoes-em-andamento`}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[11px] text-blue-700 underline decoration-blue-300 hover:text-blue-900"
                            title="Ver detalhes da licitação"
                          >
                            <span>{e.licitacaoNumero}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </Link>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[11px] text-slate-700">
                            {e.licitacaoNumero}
                          </span>
                        ))}
                    </div>

                    <div>
                      <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                        Credor / Fornecedor
                      </span>
                      <p className="font-semibold text-slate-900 text-xs">
                        {toTitleCase(e.fornecedorNome)}
                      </p>
                      {e.fornecedorCpfCnpj && (
                        <p className="text-[11px] text-slate-500">
                          {fmtCpfCnpj(e.fornecedorCpfCnpj)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center">
                      <div>
                        <span className="block text-[10px] text-slate-500">
                          Empenhado
                        </span>
                        <span className="font-semibold font-serif text-slate-900 text-xs">
                          {fmtCurrency(e.valorEmpenhado)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">
                          Liquidado
                        </span>
                        <span className="font-semibold font-serif text-slate-700 text-xs">
                          {fmtCurrency(e.valorLiquidado)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">
                          Pago
                        </span>
                        <span className="font-semibold font-serif text-emerald-700 text-xs">
                          {fmtCurrency(e.valorPago)}
                        </span>
                      </div>
                    </div>

                    {e.descricao && (
                      <div>
                        <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
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
    </section>
  );
}
