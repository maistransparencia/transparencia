"use client";

import type { EducacaoContratoDTO } from "@transparencia/db";
import {
  type Column,
  DenseTable,
  fmtCurrency,
  fmtDate,
  fmtPercent,
} from "@transparencia/ui";
import { useCallback, useMemo, useState } from "react";
import {
  educacaoDtoToContratoServicoVigente,
  formatStatusExecucaoLabel,
} from "./educacao-contratos-utils";
import { VerDetalhesLink } from "./ver-detalhes-link";

export interface ContratosTabelaProps {
  contratos: EducacaoContratoDTO[];
  onOpenContrato: (contrato: EducacaoContratoDTO) => void;
  exportFilename: string;
  /** Oculta a busca quando a lista é curta (ex.: dentro do modal de uma categoria). */
  hideSearch?: boolean;
}

function formatarVigencia(contrato: EducacaoContratoDTO): string {
  if (contrato.dataInicio && contrato.vencimentoAtual) {
    return `${fmtDate(contrato.dataInicio)} – ${fmtDate(contrato.vencimentoAtual)}`;
  }
  if (contrato.vencimentoAtual) {
    return `Até ${fmtDate(contrato.vencimentoAtual)}`;
  }
  if (contrato.dataInicio) {
    return `A partir de ${fmtDate(contrato.dataInicio)}`;
  }
  return "—";
}

export function ContratosTabela({
  contratos,
  onOpenContrato,
  exportFilename,
  hideSearch = false,
}: ContratosTabelaProps) {
  const [contratosVisiveis, setContratosVisiveis] = useState<
    EducacaoContratoDTO[] | null
  >(null);
  const handleFilteredDataChange = useCallback(
    (rows: { rawDto: EducacaoContratoDTO }[]) => {
      setContratosVisiveis(rows.map((row) => row.rawDto));
    },
    [],
  );

  const totais = useMemo(() => {
    const base = contratosVisiveis ?? contratos;
    return {
      empenhado: base.reduce((acc, c) => acc + (c.totalEmpenhado || 0), 0),
      pago: base.reduce((acc, c) => acc + (c.totalPago || 0), 0),
    };
  }, [contratosVisiveis, contratos]);

  const tableData = useMemo(
    () =>
      contratos.map((contrato) => {
        const vigente = educacaoDtoToContratoServicoVigente(contrato);
        return {
          ...vigente,
          rawDto: contrato,
          statusLabel: formatStatusExecucaoLabel(vigente.statusExecucao),
          vigenciaFormatada: formatarVigencia(contrato),
        };
      }),
    [contratos],
  );

  type Linha = (typeof tableData)[number];

  const columns: Column<Linha>[] = [
    {
      header: "Fornecedor",
      accessorKey: "fornecedorNome",
      sortable: true,
      className: "min-w-[180px] max-w-[260px]",
      renderCell: (row) => (
        <div data-testid={`contrato-row-${row.contratoNumero}`}>
          <p className="text-ink font-medium">{row.fornecedorNome}</p>
          <p className="caption">Contrato nº {row.contratoNumero}</p>
        </div>
      ),
    },
    {
      header: "Objeto",
      accessorKey: "objetoDescricao",
      sortable: true,
      className: "min-w-[220px] max-w-[320px]",
      renderCell: (row) => (
        <p className="text-ink line-clamp-2" title={row.objetoDescricao}>
          {row.objetoDescricao || "—"}
        </p>
      ),
    },
    {
      header: "Situação",
      accessorKey: "statusLabel",
      sortable: true,
      className: "whitespace-nowrap",
    },
    {
      header: "Empenhado",
      footer: fmtCurrency(totais.empenhado),
      accessorKey: "totalEmpenhado",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
    {
      header: "Pago",
      footer: fmtCurrency(totais.pago),
      accessorKey: "totalPago",
      format: "currency",
      align: "right",
      sortable: true,
      isSerifNumeric: true,
    },
  ];

  const renderExpandedRow = (row: Linha) => (
    <div className="space-y-4">
      <p className="text-ink">{row.objetoDescricao || "—"}</p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="eyebrow">Vigência</dt>
          <dd className="numeric text-left">{row.vigenciaFormatada}</dd>
        </div>
        <div>
          <dt className="eyebrow">Valor do contrato</dt>
          <dd className="numeric text-left">
            {fmtCurrency(row.valorContrato ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Liquidado</dt>
          <dd className="numeric text-left">
            {fmtCurrency(row.totalLiquidado)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Saldo pendente</dt>
          <dd className="numeric text-left">
            {fmtCurrency(row.saldoPendente)}
          </dd>
        </div>
      </dl>
      <p className="caption">
        {fmtPercent(row.percentualPago)} do empenhado já foi pago.
      </p>
      <VerDetalhesLink onClick={() => onOpenContrato(row.rawDto)} />
    </div>
  );

  const renderMobileRow = (row: Linha) => ({
    resumo: (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="caption">Contrato nº {row.contratoNumero}</span>
          <span className="numeric shrink-0">
            {fmtCurrency(row.valorContrato ?? 0)}
          </span>
        </div>
        <p className="text-ink font-medium">{row.fornecedorNome}</p>
        <p className="text-mute line-clamp-2 text-sm">
          {row.objetoDescricao || "—"}
        </p>
        <p className="caption">{row.statusLabel}</p>
      </div>
    ),
    detalhes: null,
  });

  return (
    <DenseTable
      data={tableData}
      columns={columns}
      renderMobileRow={renderMobileRow}
      renderExpandedRow={renderExpandedRow}
      hideCsvOnMobile
      hideSearch={hideSearch}
      searchPlaceholder="Buscar por fornecedor, CNPJ ou objeto..."
      searchableKeys={[
        "contratoNumero",
        "fornecedorNome",
        "fornecedorCnpj",
        "objetoDescricao",
      ]}
      pageSize={10}
      sortable={true}
      enableExportCsv={true}
      exportFilename={exportFilename}
      recordLabel="contratos"
      rowKey="contratoServicoId"
      onFilteredDataChange={handleFilteredDataChange}
    />
  );
}
