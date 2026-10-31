import { db } from "../client";
import type { FornecedorExecucaoItemDTO } from "./despesas-metrics";

export interface EducacaoExecucaoAnualDTO {
  ano: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  /** Pago sem despesa de pessoal: base da parte paga aos maiores fornecedores. */
  pagoSemPessoal: number;
}

/**
 * Série anual da Função 12 (Educação) da Prefeitura: reservado (empenhado), liquidado e pago.
 */
export async function getEducacaoExecucaoAnual(
  portalSlug: string,
): Promise<EducacaoExecucaoAnualDTO[]> {
  const cleanSlug = (portalSlug ?? "").trim();
  if (!cleanSlug) {
    return [];
  }
  try {
    const rows = await db
      .selectFrom("fct_educacao_execucao_metricas")
      .selectAll()
      .where("portal_slug", "=", cleanSlug)
      .orderBy("ano", "asc")
      .execute();

    return rows.map((row) => ({
      ano: Number(row.ano),
      empenhado: Number(row.empenhado_educacao ?? 0),
      liquidado: Number(row.liquidado_educacao ?? 0),
      pago: Number(row.pago_educacao ?? 0),
      pagoSemPessoal: Number(row.pago_sem_pessoal_educacao ?? 0),
    }));
  } catch {
    return [];
  }
}

/**
 * Maiores fornecedores pagos na Função 12 (Educação) da Prefeitura, sem despesa de pessoal.
 */
export async function getTopFornecedoresEducacaoMetrics(options: {
  portalSlug: string;
  year: number;
  limit?: number;
}): Promise<FornecedorExecucaoItemDTO[]> {
  const { portalSlug, year, limit = 5 } = options;
  const cleanSlug = (portalSlug ?? "").trim();
  if (!cleanSlug) {
    return [];
  }
  try {
    const rows = await db
      .selectFrom("fct_despesas")
      .select((eb) => [
        "fornecedor_nome",
        "fornecedor_cpf_cnpj",
        eb.fn.sum<string>("pago").as("total_pago"),
        eb.fn.sum<string>("empenhado").as("total_empenhado"),
      ])
      .where("portal_slug", "=", cleanSlug)
      .where("ano", "=", year)
      .where("fonte", "=", "exercicio")
      .where("funcao", "=", "12")
      .where((eb) =>
        eb.or([
          eb("grupo_natureza", "is", null),
          eb("grupo_natureza", "!=", "1"),
        ]),
      )
      .groupBy(["fornecedor_nome", "fornecedor_cpf_cnpj"])
      .orderBy("total_pago", "desc")
      .limit(limit)
      .execute();

    const totalPagoTop = rows.reduce(
      (total, row) => total + Number(row.total_pago ?? 0),
      0,
    );

    return rows.map((row) => {
      const totalPago = Number(row.total_pago ?? 0);
      return {
        fornecedorNome: String(
          row.fornecedor_nome ?? "Sem identificação",
        ).trim(),
        fornecedorCpfCnpj: row.fornecedor_cpf_cnpj
          ? String(row.fornecedor_cpf_cnpj)
          : null,
        totalPago,
        totalEmpenhado: Number(row.total_empenhado ?? 0),
        percentualPago: Number(
          (totalPagoTop > 0 ? (totalPago / totalPagoTop) * 100 : 0).toFixed(1),
        ),
      };
    });
  } catch {
    return [];
  }
}
