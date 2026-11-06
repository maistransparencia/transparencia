import { db } from "../client";

/**
 * - `nao_identificado`: falta dado para comparar (sem linha única de alínea na receita, pago ausente, sem relatório).
 * - `exercicios_diferentes`: o relatório do Estado é de outro ano que a receita; não se compara.
 * - `pago_acima_do_registrado`: o Estado informa pago maior que o arrecadado na alínea; o excedente "ainda não aparece".
 * - `dentro_do_registrado`: pago menor ou igual ao arrecadado; a alínea tem outras transferências, então não prova elo.
 */
export type SituacaoComparacaoReceita =
  | "nao_identificado"
  | "exercicios_diferentes"
  | "pago_acima_do_registrado"
  | "dentro_do_registrado";

export interface ComparacaoReceitaEstadualDTO {
  ano: number | null;
  situacao: SituacaoComparacaoReceita;
  /** Posição (mês/ano) do relatório do Estado, por exemplo "08/2026". */
  posicaoExecucao: string | null;
  emendasConsideradas: number;
  /** Emendas sem valor pago no relatório: ausente não é zero, e o pago somado é só o informado. */
  emendasSemPagoInformado: number;
  /** Soma do pago só das emendas com valor informado; nulo quando nenhuma informa. */
  pagoEstado: number | null;
  arrecadadoOutrasTransferenciasCorrente: number | null;
  arrecadadoOutrasTransferenciasCapital: number | null;
  /** Corrente mais capital: duas alíneas do mesmo nível, nunca alínea com subalínea. */
  arrecadadoOutrasTransferencias: number | null;
  /** Derivado: pago do Estado menos o arrecadado na alínea, só quando o pago é maior. Estimativa, não fato medido. */
  valorAindaNaoApareceNaReceita: number | null;
}

type Row = Record<string, unknown>;

const comparacaoVazia: ComparacaoReceitaEstadualDTO = {
  ano: null,
  situacao: "nao_identificado",
  posicaoExecucao: null,
  emendasConsideradas: 0,
  emendasSemPagoInformado: 0,
  pagoEstado: null,
  arrecadadoOutrasTransferenciasCorrente: null,
  arrecadadoOutrasTransferenciasCapital: null,
  arrecadadoOutrasTransferencias: null,
  valorAindaNaoApareceNaReceita: null,
};

function numeroOuNulo(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function montarComparacaoReceita(
  row: Row | undefined,
  ano: number,
): ComparacaoReceitaEstadualDTO {
  if (!row) return { ...comparacaoVazia, ano };

  const posicaoAno = numeroOuNulo(row.posicao_ano_execucao_estado);
  const posicaoMes = numeroOuNulo(row.posicao_mes_execucao_estado);
  const pagoEstado = numeroOuNulo(row.pago_estado_informado);
  const arrecadado = numeroOuNulo(row.arrecadado_outras_transferencias);
  const emendasSemPagoInformado = Number(row.emendas_sem_pago_informado);

  const base: ComparacaoReceitaEstadualDTO = {
    ano,
    situacao: "nao_identificado",
    posicaoExecucao:
      posicaoAno !== null && posicaoMes !== null
        ? `${String(posicaoMes).padStart(2, "0")}/${posicaoAno}`
        : null,
    emendasConsideradas: Number(row.emendas_chegam_prefeitura),
    emendasSemPagoInformado,
    pagoEstado,
    arrecadadoOutrasTransferenciasCorrente: numeroOuNulo(
      row.arrecadado_outras_transferencias_corrente,
    ),
    arrecadadoOutrasTransferenciasCapital: numeroOuNulo(
      row.arrecadado_outras_transferencias_capital,
    ),
    arrecadadoOutrasTransferencias: arrecadado,
    valorAindaNaoApareceNaReceita: null,
  };

  if (
    row.hierarquia_clara !== true ||
    arrecadado === null ||
    pagoEstado === null
  )
    return base;
  if (posicaoAno !== ano) return { ...base, situacao: "exercicios_diferentes" };
  if (pagoEstado > arrecadado)
    return {
      ...base,
      situacao: "pago_acima_do_registrado",
      valorAindaNaoApareceNaReceita: pagoEstado - arrecadado,
    };
  // pago ausente em alguma emenda: o total real pode passar do arrecadado, então não afirma que está dentro
  if (emendasSemPagoInformado > 0) return base;
  return { ...base, situacao: "dentro_do_registrado" };
}

/** Pago pelo Estado em emendas que chegam à Prefeitura contra a arrecadação da Prefeitura, no mesmo ano. */
export async function getComparacaoReceitaEstadual(
  portalSlug: string,
  ano: number,
): Promise<ComparacaoReceitaEstadualDTO> {
  try {
    const row = await db
      .selectFrom("fct_emendas_estaduais_receita")
      .selectAll()
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .executeTakeFirst();
    return montarComparacaoReceita(row, ano);
  } catch {
    return { ...comparacaoVazia, ano };
  }
}
