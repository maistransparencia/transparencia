import { db } from "../client";

/** Matrículas da rede municipal no Censo Escolar (INEP) mais recente até o ano pedido. */
export interface EducacaoMatriculasDTO {
  portalSlug: string;
  /** Ano real do Censo Escolar usado (pode ser anterior ao ano pedido). */
  anoCenso: number;
  /** Soma de QT_MAT_BAS das escolas municipais em atividade. */
  matriculasEducacaoBasica: number;
  quantidadeEscolas: number | null;
}

export interface GetEducacaoMatriculasParams {
  portalSlug: string;
  ano: number;
}

/**
 * Censo Escolar mais recente com ano <= `ano`, do mart `fct_educacao_matriculas_metricas`.
 * Sem registro devolve `null` (nunca zero).
 */
export async function getEducacaoMatriculas({
  portalSlug,
  ano,
}: GetEducacaoMatriculasParams): Promise<EducacaoMatriculasDTO | null> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) return null;

  const row = await db
    .selectFrom("fct_educacao_matriculas_metricas")
    .select(["ano", "matriculas_educacao_basica", "quantidade_escolas"])
    .where("portal_slug", "=", cleanSlug)
    .where("ano", "<=", ano)
    .orderBy("ano", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!row) return null;
  return {
    portalSlug: cleanSlug,
    anoCenso: Number(row.ano),
    matriculasEducacaoBasica: Number(row.matriculas_educacao_basica),
    quantidadeEscolas:
      row.quantidade_escolas === null ? null : Number(row.quantidade_escolas),
  };
}
