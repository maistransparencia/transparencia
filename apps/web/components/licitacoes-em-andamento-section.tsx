"use client";

import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import {
  Badge,
  type Column,
  cn,
  DenseTable,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
} from "@transparencia/ui";
import { Calendar, Coins } from "lucide-react";
import { useMemo } from "react";

export interface LicitacoesEmAndamentoSectionProps {
  licitacoes: LicitacaoEmAndamentoDTO[];
  className?: string;
}

export function fmtLicitacaoSituacao(situacao?: string | null): string {
  if (!situacao) return "Em andamento";
  const s = situacao.toLowerCase().trim().replace(/_/g, " ");
  if (s === "aberta" || s === "em aberto") return "Aberta";
  if (s === "em andamento") return "Em andamento";
  if (s === "homologada") return "Homologada";
  if (s === "publicado" || s === "publicada") return "Publicada";
  if (s === "deserta") return "Deserta";
  if (s === "encerrada") return "Encerrada";
  if (s === "classificada") return "Classificada";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface LicitacaoTableRow extends LicitacaoEmAndamentoDTO {
  modalidadeFormatada: string;
  situacaoFormatada: string;
  valorFinal: number | null;
  buscaNormalizada: string;
}

export function LicitacoesEmAndamentoSection({
  licitacoes,
  className,
}: LicitacoesEmAndamentoSectionProps) {
  const lista = useMemo(() => {
    if (!Array.isArray(licitacoes)) return [];
    return licitacoes;
  }, [licitacoes]);

  // Ordena por relevância (maior valor estimado primeiro; se igual/nulo, data de abertura decrescente)
  const sortedByRelevance = useMemo(() => {
    return [...lista].sort((a, b) => {
      const valA = a.valorEstimado ?? a.valor ?? 0;
      const valB = b.valorEstimado ?? b.valor ?? 0;
      if (valB !== valA) return valB - valA;
      const dataA = a.dataAbertura ?? "";
      const dataB = b.dataAbertura ?? "";
      return dataB.localeCompare(dataA);
    });
  }, [lista]);

  const topDestaques = useMemo(() => {
    return sortedByRelevance.slice(0, 4);
  }, [sortedByRelevance]);

  const tableData: LicitacaoTableRow[] = useMemo(() => {
    return sortedByRelevance.map((item) => {
      const valorNum = item.valorEstimado ?? item.valor ?? null;
      const modalidadeFmt = fmtLicitacaoModalidade(item.modalidade);
      const situacaoFmt = fmtLicitacaoSituacao(item.situacao);

      const situacaoNorm = (item.situacao || "em andamento")
        .toLowerCase()
        .trim();
      const termosSituacao = (() => {
        if (
          situacaoNorm === "em_andamento" ||
          situacaoNorm === "em andamento" ||
          situacaoNorm === "andamento"
        ) {
          return ["em andamento", "andamento"];
        }
        if (situacaoNorm === "aberta" || situacaoNorm === "em aberto") {
          return ["aberta", "em aberto"];
        }
        return [situacaoNorm, situacaoNorm.replace(/_/g, " ")];
      })();

      // Normaliza termos de busca para suportar consultas sem acentuação e formatos alternativos
      const buscaNorm = [
        item.objeto,
        item.discriminacao,
        item.licitacaoNumero,
        item.entidadeNome,
        item.modalidade,
        item.modalidade ? item.modalidade.replace(/_/g, " ") : "",
        modalidadeFmt,
        situacaoFmt,
        ...termosSituacao,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return {
        ...item,
        modalidadeFormatada: modalidadeFmt,
        situacaoFormatada: situacaoFmt,
        valorFinal:
          typeof valorNum === "number" && valorNum > 0 ? valorNum : null,
        buscaNormalizada: buscaNorm,
      };
    });
  }, [sortedByRelevance]);

  const columns: Column<LicitacaoTableRow>[] = [
    {
      header: "Processo",
      accessorKey: "licitacaoNumero",
      sortable: true,
      className: "whitespace-nowrap font-semibold text-slate-900",
      renderCell: (row) => row.licitacaoNumero || "S/N",
    },
    {
      header: "Órgão",
      accessorKey: "entidadeNome",
      sortable: true,
      className: "min-w-[150px] max-w-[220px] truncate text-slate-700",
      renderCell: (row) => row.entidadeNome || "—",
    },
    {
      header: "Modalidade",
      accessorKey: "modalidadeFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap",
      renderCell: (row) => (
        <Badge variant="accent">{row.modalidadeFormatada}</Badge>
      ),
    },
    {
      header: "Objeto",
      accessorKey: "objeto",
      sortable: true,
      className: "min-w-[220px] max-w-[340px] text-slate-700",
      renderCell: (row) => (
        <div className="space-y-0.5">
          <span className="line-clamp-2 font-medium" title={row.objeto}>
            {row.objeto}
          </span>
          {row.discriminacao && row.discriminacao !== row.objeto && (
            <span
              className="line-clamp-1 text-[11px] text-slate-400 italic"
              title={row.discriminacao}
            >
              {row.discriminacao}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Abertura",
      accessorKey: "dataAbertura",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap font-medium text-slate-600",
      renderCell: (row) =>
        row.dataAbertura ? fmtDate(row.dataAbertura) : "Não informada",
    },
    {
      header: "Valor Estimado",
      accessorKey: "valorFinal",
      sortable: true,
      align: "right",
      isSerifNumeric: true,
      renderCell: (row) => {
        if (typeof row.valorFinal === "number" && row.valorFinal > 0) {
          return (
            <span className="font-bold font-serif text-slate-900">
              {fmtCurrency(row.valorFinal)}
            </span>
          );
        }
        return (
          <span className="text-slate-400 text-xs italic">Não divulgado</span>
        );
      },
      exportValue: (row) => (row.valorFinal !== null ? row.valorFinal : ""),
    },
    {
      header: "Situação",
      accessorKey: "situacaoFormatada",
      sortable: true,
      align: "center",
      className: "whitespace-nowrap",
      renderCell: (row) => (
        <Badge variant="warning">{row.situacaoFormatada}</Badge>
      ),
    },
  ];

  const totalProcessos = lista.length;

  return (
    <section
      id="licitacoes-em-andamento"
      aria-labelledby="licitacoes-em-andamento-heading"
      className={cn("scroll-mt-6 space-y-6", className)}
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col justify-between gap-2 border-ink border-t-2 pt-8 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="licitacoes-em-andamento-heading"
              className="font-bold font-serif text-slate-900 text-xl"
            >
              Licitações Abertas e em Andamento
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-slate-600 text-xs leading-relaxed sm:text-sm">
            Audite preventivamente as compras públicas em andamento antes da
            adjudicação e homologação de contratos pelo município.
          </p>
        </div>
        <span
          className="shrink-0 font-medium text-slate-500 text-xs"
          aria-live="polite"
        >
          {totalProcessos}{" "}
          {totalProcessos === 1 ? "processo em aberto" : "processos em aberto"}
        </span>
      </div>

      {totalProcessos === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
          <p className="font-medium text-slate-700 text-sm">
            Nenhuma licitação em andamento ou aberta encontrada para este
            exercício.
          </p>
          <p className="mt-1 text-slate-400 text-xs">
            Novos editais e processos de contratação publicados pelos órgãos
            municipais aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Destaques Cards Grid (4 itens em 2 colunas) */}
          {topDestaques.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-xs tracking-wider">
                  Processos em Destaque por Relevância
                </h3>
                <span className="text-slate-400 text-xs">
                  {topDestaques.length === 1
                    ? "Maior valor estimado"
                    : `Top ${topDestaques.length} de maior valor`}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {topDestaques.map((item) => {
                  const valorExibicao = (() => {
                    const val = item.valorEstimado ?? item.valor;
                    if (typeof val === "number" && val > 0) {
                      return fmtCurrency(val);
                    }
                    return "Valor não divulgado";
                  })();

                  const dataAberturaTexto = (() => {
                    if (item.dataAbertura) {
                      return fmtDate(item.dataAbertura);
                    }
                    return "Abertura não informada";
                  })();

                  return (
                    <article
                      key={item.licitacaoId}
                      className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                            <Badge variant="accent">
                              {fmtLicitacaoModalidade(item.modalidade)}
                            </Badge>
                            <Badge variant="warning">
                              {fmtLicitacaoSituacao(item.situacao)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            Processo {item.licitacaoNumero || "S/N"}
                          </span>
                          {item.entidadeNome && (
                            <div className="mt-0.5 flex items-center gap-1 text-slate-500 text-xs">
                              <span className="truncate">
                                {item.entidadeNome}
                              </span>
                            </div>
                          )}
                        </div>

                        <p
                          className="line-clamp-3 font-medium text-slate-700 text-xs leading-relaxed sm:text-sm"
                          title={item.objeto}
                        >
                          {item.objeto}
                        </p>

                        {item.discriminacao &&
                          item.discriminacao !== item.objeto && (
                            <p className="line-clamp-2 text-slate-500 text-xs italic">
                              {item.discriminacao}
                            </p>
                          )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-slate-100 border-t pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Abertura: {dataAberturaTexto}</span>
                        </div>

                        <div className="flex items-center gap-1 font-bold font-serif text-slate-900">
                          <Coins
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          <span>{valorExibicao}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela Completa via DenseTable */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 text-xs tracking-wider">
                Relação Completa de Licitações em Aberto
              </h3>
            </div>
            <DenseTable
              data={tableData}
              columns={columns}
              searchPlaceholder="Buscar por objeto, edital, órgão, modalidade ou situação..."
              searchableKeys={[
                "objeto",
                "discriminacao",
                "licitacaoNumero",
                "entidadeNome",
                "modalidadeFormatada",
                "situacaoFormatada",
                "situacao",
                "buscaNormalizada",
              ]}
              pageSize={10}
              sortable={true}
              defaultSortKey="valorFinal"
              defaultSortDir="desc"
              enableExportCsv={true}
              exportFilename="licitacoes_em_andamento.csv"
              recordLabel="licitações"
              rowKey="licitacaoId"
            />
          </div>
        </div>
      )}
    </section>
  );
}
