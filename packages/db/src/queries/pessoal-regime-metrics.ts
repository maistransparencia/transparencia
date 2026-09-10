import { db } from "../client";

export type CategoriaRegime =
  | "efetivo_concurso"
  | "efetivo_comissao"
  | "comissionado"
  | "contrato_temporario"
  | "agente_politico"
  | "rpps_inativos"
  | "outros";

const CANONICAL_ORDER: CategoriaRegime[] = [
  "efetivo_concurso",
  "efetivo_comissao",
  "comissionado",
  "contrato_temporario",
  "agente_politico",
  "rpps_inativos",
  "outros",
];

export interface PessoalRegimeMetricsDTO {
  categoriaRegime: CategoriaRegime;
  totalProfissionais: number;
  totalProventos: number;
  proventoMedio: number;
  percentualProfissionais: number;
  percentualFolha: number;
}

export interface GetPessoalRegimeMetricsOptions {
  empresaIds?: string[] | null;
}

/**
 * Retorna métricas consolidadas de pessoal agrupadas por regime jurídico e vínculo funcional
 * a partir do mart `fct_pessoal_regime_metricas`.
 */
export async function getPessoalRegimeMetrics(
  portalSlug: string,
  ano: number,
  options?: GetPessoalRegimeMetricsOptions,
): Promise<PessoalRegimeMetricsDTO[]> {
  if (!portalSlug || !ano || Number.isNaN(ano)) return [];
  if (Array.isArray(options?.empresaIds) && options.empresaIds.length === 0) {
    return [];
  }

  let query = db
    .selectFrom("fct_pessoal_regime_metricas")
    .select([
      "categoria_regime",
      (eb) =>
        eb.fn.sum<string>("total_profissionais").as("total_profissionais"),
      (eb) => eb.fn.sum<string>("total_proventos").as("total_proventos"),
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano);

  if (options?.empresaIds && options.empresaIds.length > 0) {
    query = query.where("empresa_id", "in", options.empresaIds);
  }

  const rows = await query.groupBy("categoria_regime").execute();

  const totalGeralProfissionais = rows.reduce(
    (acc, r) => acc + (parseInt(r.total_profissionais ?? "0", 10) || 0),
    0,
  );
  const totalGeralFolha = rows.reduce(
    (acc, r) => acc + (parseFloat(r.total_proventos ?? "0") || 0),
    0,
  );

  return rows
    .map((r) => {
      const categoriaRegime = (r.categoria_regime ??
        "outros") as CategoriaRegime;
      const totalProfissionais =
        parseInt(r.total_profissionais ?? "0", 10) || 0;
      const totalProventos = parseFloat(r.total_proventos ?? "0") || 0;
      const proventoMedio =
        totalProfissionais > 0
          ? Number((totalProventos / totalProfissionais).toFixed(2))
          : 0;
      const percentualProfissionais =
        totalGeralProfissionais > 0
          ? Number(
              ((totalProfissionais / totalGeralProfissionais) * 100).toFixed(2),
            )
          : 0;
      const percentualFolha =
        totalGeralFolha > 0
          ? Number(((totalProventos / totalGeralFolha) * 100).toFixed(2))
          : 0;

      return {
        categoriaRegime,
        totalProfissionais,
        totalProventos,
        proventoMedio,
        percentualProfissionais,
        percentualFolha,
      };
    })
    .sort((a, b) => {
      const idxA = CANONICAL_ORDER.indexOf(a.categoriaRegime);
      const idxB = CANONICAL_ORDER.indexOf(b.categoriaRegime);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
}

/**
 * Retorna a contagem de servidores com divergências cadastrais no portal
 * (comissionados ou contratados temporários marcados indevidamente como agente político ou excepcional interesse público).
 * Utilizado para o badge/nota data-driven de Auditoria Cívica.
 */
export async function getCountDivergenciasCadastraisPessoal(
  portalSlug: string,
  ano: number,
): Promise<number> {
  if (!portalSlug || !ano || Number.isNaN(ano)) return 0;

  const result = await db
    .selectFrom("fct_pessoal")
    .select((eb) => eb.fn.count<string>("matricula").as("total"))
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano)
    .where((eb) =>
      eb.or([
        eb("vinculo", "ilike", "%agente%politico%"),
        eb("categoria_funcional", "ilike", "%excepcional interesse%"),
      ]),
    )
    .where("categoria_regime", "in", ["comissionado", "contrato_temporario"])
    .executeTakeFirst();

  return parseInt(result?.total ?? "0", 10) || 0;
}
