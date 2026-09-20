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
  mesReferencia?: number;
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
      (eb) => eb.fn.max<number>("mes_referencia").as("mes_referencia"),
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
        mesReferencia:
          r.mes_referencia != null ? Number(r.mes_referencia) : undefined,
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

export interface ServidorDivergenciaCadastralDTO {
  matricula: string;
  cargo: string | null;
  formaProvimento: string | null;
  orgaoNome: string;
  categoriaFuncional: string | null;
  vinculo: string | null;
  categoriaRegime: CategoriaRegime;
  proventos: number;
}

/**
 * Retorna a listagem nominal completa dos servidores com divergências cadastrais
 * para auditoria cívica (Art. 37 da CF/88).
 */
export async function getServidoresDivergenciasCadastraisPessoal(
  portalSlug: string,
  ano: number,
  options?: { empresaIds?: string[] | null },
): Promise<ServidorDivergenciaCadastralDTO[]> {
  if (!portalSlug || !ano || Number.isNaN(ano)) return [];
  if (Array.isArray(options?.empresaIds) && options.empresaIds.length === 0) {
    return [];
  }

  let query = db
    .selectFrom("fct_pessoal as p")
    .leftJoin("dim_orgao as o", (join) =>
      join
        .onRef("o.portal_slug", "=", "p.portal_slug")
        .onRef("o.empresa_id", "=", "p.empresa_id"),
    )
    .select([
      "p.matricula",
      "p.cargo",
      "p.forma_provimento",
      "o.orgao_nome",
      "p.categoria_funcional",
      "p.vinculo",
      "p.categoria_regime",
      "p.proventos",
    ])
    .where("p.portal_slug", "=", portalSlug)
    .where("p.ano", "=", ano)
    .where((eb) =>
      eb.or([
        eb("p.vinculo", "ilike", "%agente%politico%"),
        eb("p.categoria_funcional", "ilike", "%excepcional interesse%"),
      ]),
    )
    .where("p.categoria_regime", "in", ["comissionado", "contrato_temporario"]);

  if (options?.empresaIds && options.empresaIds.length > 0) {
    query = query.where("p.empresa_id", "in", options.empresaIds);
  }

  const rows = await query
    .orderBy("p.cargo", "asc")
    .orderBy("p.matricula", "asc")
    .execute();

  return rows.map((r) => ({
    matricula: String(r.matricula ?? "—"),
    cargo: r.cargo ? String(r.cargo) : null,
    formaProvimento: r.forma_provimento ? String(r.forma_provimento) : null,
    orgaoNome: String(r.orgao_nome ?? "Prefeitura Municipal"),
    categoriaFuncional: r.categoria_funcional
      ? String(r.categoria_funcional)
      : null,
    vinculo: r.vinculo ? String(r.vinculo) : null,
    categoriaRegime: (r.categoria_regime ?? "outros") as CategoriaRegime,
    proventos: parseFloat(String(r.proventos ?? "0")) || 0,
  }));
}
