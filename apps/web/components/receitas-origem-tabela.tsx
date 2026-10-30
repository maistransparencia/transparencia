"use client";

import {
  type Column,
  cn,
  DenseTable,
  fmtCompact,
  fmtPercent,
} from "@transparencia/ui";

export interface ReceitaOrigemLinha {
  fonte: string;
  previsto: number;
  arrecadado: number;
  pct: number | null;
  className?: string;
}

const COLUNAS: Column<ReceitaOrigemLinha>[] = [
  { header: "Origem da Receita", accessorKey: "fonte" },
  {
    header: "Previsto",
    accessorKey: "previsto",
    align: "right",
    format: "currency",
  },
  {
    header: "Arrecadado",
    accessorKey: "arrecadado",
    align: "right",
    format: "currency",
  },
  {
    header: "Arrecadado do previsto (%)",
    accessorKey: "pct",
    align: "right",
    format: "percent",
  },
];

export interface ReceitasOrigemTabelaProps {
  data: ReceitaOrigemLinha[];
}

export function ReceitasOrigemTabela({ data }: ReceitasOrigemTabelaProps) {
  return (
    <DenseTable
      data={data}
      columns={COLUNAS}
      enableExportCsv={false}
      renderMobileRow={(linha) => ({
        resumo: (
          <div
            className={cn(
              "flex items-baseline justify-between gap-3",
              linha.className,
            )}
          >
            <span className="min-w-0 text-ink text-sm">{linha.fonte}</span>
            <span className="numeric shrink-0 text-ink">
              {fmtCompact(linha.arrecadado)}
            </span>
          </div>
        ),
        detalhes: (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="eyebrow">Previsto</dt>
              <dd className="numeric">{fmtCompact(linha.previsto)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Arrecadado do previsto</dt>
              <dd className="numeric">
                {linha.pct === null ? "-" : fmtPercent(linha.pct)}
              </dd>
            </div>
          </dl>
        ),
      })}
    />
  );
}
