"use client";

import {
  Badge,
  DenseTable,
  fmtCompact,
  fmtPercent,
  toTitleCase,
} from "@transparencia/ui";

type AlertaExecucao = "normal" | "N/D" | "excesso";

export interface ExecucaoOrgaoItem {
  descricao: string;
  dotacaoAtualizada: number;
  empenhado: number;
  pago: number;
  percentualPago: number;
  alerta: AlertaExecucao;
}

function AlertaBadge({ alerta }: { alerta: AlertaExecucao }) {
  if (alerta !== "excesso") return null;
  return <Badge variant="danger">Reservado acima do autorizado</Badge>;
}

interface ExecucaoOrgaosTableProps {
  items: ExecucaoOrgaoItem[];
}

export function ExecucaoOrgaosTable({ items }: ExecucaoOrgaosTableProps) {
  const hasAlerta = items.some((item) => item.alerta === "excesso");

  return (
    <div className="space-y-3">
      <DenseTable
        data={items.map((item) => ({
          ...item,
          descricao: toTitleCase(item.descricao),
        }))}
        enableExportCsv={false}
        columns={[
          { header: "Secretaria / Fundo", accessorKey: "descricao" },
          {
            header: "Orçamento autorizado",
            accessorKey: "dotacaoAtualizada",
            align: "right",
            format: "currency",
          },
          {
            header: "Reservado",
            accessorKey: "empenhado",
            align: "right",
            format: "currency",
          },
          {
            header: "Pago",
            accessorKey: "pago",
            align: "right",
            format: "currency",
          },
          {
            header: "% pago",
            accessorKey: "percentualPago",
            align: "right",
            renderCell: (row) => fmtPercent(row.percentualPago, 0),
          },
          ...(hasAlerta
            ? [
                {
                  header: "Alerta",
                  accessorKey: "alerta" as const,
                  align: "center" as const,
                  renderCell: (row: ExecucaoOrgaoItem) => (
                    <AlertaBadge alerta={row.alerta} />
                  ),
                },
              ]
            : []),
        ]}
        renderMobileRow={(row) => ({
          resumo: (
            <div className="space-y-1.5">
              <p className="font-medium text-ink text-sm">{row.descricao}</p>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-mute2">Pago do autorizado</span>
                <span className="numeric text-ink">
                  {fmtPercent(row.percentualPago, 0)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-mute2">Pago</span>
                <span className="numeric text-ink">{fmtCompact(row.pago)}</span>
              </div>
              <AlertaBadge alerta={row.alerta} />
            </div>
          ),
          detalhes: (
            <dl className="space-y-1 text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mute2">Orçamento autorizado</dt>
                <dd className="numeric text-ink">
                  {fmtCompact(row.dotacaoAtualizada)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mute2">Reservado</dt>
                <dd className="numeric text-ink">
                  {fmtCompact(row.empenhado)}
                </dd>
              </div>
            </dl>
          ),
        })}
      />
      {hasAlerta ? (
        <p className="caption">
          Reservado acima do autorizado merece atenção: pode ser um ajuste de
          orçamento ainda não refletido nos dados.
        </p>
      ) : null}
    </div>
  );
}
