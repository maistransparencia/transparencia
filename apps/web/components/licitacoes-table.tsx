"use client";

import { type Column, cn, DenseTable, fmtCurrency } from "@transparencia/ui";
import { useMemo } from "react";

export type SortColumn =
  | "fornecedor"
  | "objeto"
  | "modalidade"
  | "valorContrato"
  | "periodo";

export interface ContratoSemLicitacaoItem {
  ano: number;
  empresa: string;
  numero: string;
  fornecedor: string;
  objeto: string;
  valorContrato: string | number;
  licitacaoNumero?: string;
  mes: number;
  numeroObra?: string | null;
  tipoObra?: string | null;
  modalidade?: string | null;
  fundlegal?: string | null;
  limiteDispensa?: number;
  acimaLimite?: boolean;
  periodo: string;
}

export interface LicitacoesTableProps {
  data: ContratoSemLicitacaoItem[];
  fracionamentoVendors?: Record<string, number>;
  pageSize?: number;
  className?: string;
}

function getModalidadeBadgeVariant(modalidadeStr?: string | null) {
  const mod = (modalidadeStr || "Dispensa").toLowerCase();
  if (mod.includes("inexigibilidade")) {
    return "bg-[#edf2f7] text-[#2b6cb0] border-[#cbd5e0]";
  }
  if (mod.includes("dispensa")) {
    return "bg-[#fffaf0] text-[#9c4221] border-[#feebc8]";
  }
  if (mod.includes("pregã") || mod.includes("pregao")) {
    return "bg-[#ebf8ff] text-[#2c5282] border-[#bee3f8]";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function LicitacoesTable({
  data,
  fracionamentoVendors = {},
  pageSize = 6,
  className,
}: LicitacoesTableProps) {
  const columns: Column<ContratoSemLicitacaoItem>[] = useMemo(
    () => [
      {
        header: "FORNECEDOR",
        accessorKey: "fornecedor",
        sortable: true,
        align: "left",
        renderCell: (row) => {
          const fracCount = fracionamentoVendors[row.fornecedor] || 0;
          return (
            <div className="align-top">
              <div className="font-bold text-slate-900 leading-snug">
                {row.fornecedor}
              </div>
              {fracCount >= 3 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded border border-[#feebc8] bg-[#fffaf0] px-2 py-0.5 font-medium text-[#9c4221] text-[11px]">
                  <span>⚠️</span> {fracCount} contratos próximos ao teto
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: "OBJETO",
        accessorKey: "objeto",
        sortable: true,
        align: "left",
        className: "max-w-xs text-slate-600 leading-normal whitespace-normal",
      },
      {
        header: "MODALIDADE",
        accessorKey: "modalidade",
        sortable: true,
        align: "center",
        exportValue: (row) => row.modalidade || "Dispensa",
        renderCell: (row) => (
          <span
            className={cn(
              "inline-block rounded-md border px-2.5 py-0.5 font-semibold text-[11px]",
              getModalidadeBadgeVariant(row.modalidade),
            )}
          >
            {row.modalidade || "Dispensa"}
          </span>
        ),
      },
      {
        header: "VALOR",
        exportHeader: "VALOR (R$)",
        accessorKey: "valorContrato",
        sortable: true,
        defaultSortDir: "desc",
        align: "right",
        isSerifNumeric: true,
        className:
          "text-right font-bold font-serif text-slate-900 text-sm whitespace-nowrap",
        sortValue: (row) => Number(row.valorContrato || 0),
        exportValue: (row) => {
          const val =
            typeof row.valorContrato === "number"
              ? row.valorContrato
              : parseFloat(
                  String(row.valorContrato ?? "0").replace(",", "."),
                ) || 0;
          return val.toFixed(2);
        },
        renderCell: (row) => {
          const valNum =
            typeof row.valorContrato === "number"
              ? row.valorContrato
              : parseFloat(
                  String(row.valorContrato ?? "0").replace(",", "."),
                ) || 0;
          return fmtCurrency(valNum);
        },
      },
      {
        header: "PERÍODO",
        exportHeader: "PERIODO",
        accessorKey: "periodo",
        sortable: true,
        defaultSortDir: "desc",
        align: "right",
        className: "text-right text-slate-500 whitespace-nowrap",
        sortValue: (row) => (row.ano || 0) * 12 + (row.mes || 0),
        exportValue: (row) => row.periodo || "",
      },
    ],
    [fracionamentoVendors],
  );

  return (
    <DenseTable
      data={data}
      columns={columns}
      rowKey="numero"
      searchPlaceholder="Buscar fornecedor, objeto ou modalidade..."
      searchableKeys={["fornecedor", "objeto", "modalidade", "numero"]}
      defaultSortKey="valorContrato"
      defaultSortDir="desc"
      pageSize={pageSize}
      enableExportCsv
      exportFilename="contratos_sem_licitacao.csv"
      csvButtonLabel="Baixar CSV"
      recordLabel="contratos"
      emptyMessage="Nenhum contrato encontrado."
      className={className}
    />
  );
}
