import { sql } from "kysely";
import { db } from "../client";

export interface SearchResultItem {
  id: string;
  tipo: "licitacao" | "contrato";
  numero: string;
  objeto: string;
  fornecedorNome: string | null;
  valor: number;
  status: string | null;
  modalidade: string | null;
  ano: number;
  portalSlug: string;
  href: string;
  linkSistemaOrigem?: string | null;
  anoCelebracao?: number;
  dataInicio?: string | null;
  vencimentoAtual?: string | null;
}

export interface SearchLicitacoesParams {
  portalSlug: string;
  termo: string;
  ano?: number;
  limite?: number;
  tipo?: "licitacao" | "contrato" | "todos";
}

export interface SearchLicitacoesResult {
  licitacoes: SearchResultItem[];
  contratos: SearchResultItem[];
  total: number;
}

const formatDateValue = (val: unknown): string | null => {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
};

/**
 * Busca unificada de licitações e contratos via PostgreSQL FTS (to_tsvector, websearch_to_tsquery),
 * unaccent e similaridade trigram (word_similarity, similarity).
 */
export async function searchLicitacoesEContratos(
  params: SearchLicitacoesParams,
): Promise<SearchLicitacoesResult> {
  const cleanTermo = (params.termo ?? "").trim();
  const cleanSlug = (params.portalSlug ?? "").trim();

  if (!cleanSlug || cleanTermo.length < 2) {
    return {
      licitacoes: [],
      contratos: [],
      total: 0,
    };
  }

  const cleanTermoNorm = cleanTermo
    .replace(/[.\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normTermo = cleanTermoNorm || cleanTermo;
  const digitsTermo = cleanTermo.replace(/\D/g, "");
  const hasDigitsDoc = digitsTermo.length >= 8;
  const enableTrigram = cleanTermo.length >= 5;

  const maxResults = (() => {
    if (typeof params.limite === "number" && params.limite > 0) {
      return Math.min(Math.floor(params.limite), 50);
    }
    return 10;
  })();

  const filterAno = (() => {
    if (
      typeof params.ano === "number" &&
      Number.isInteger(params.ano) &&
      params.ano > 0
    ) {
      return params.ano;
    }
    return null;
  })();

  const searchLicitacoes = params.tipo !== "contrato";
  const searchContratos = params.tipo !== "licitacao";

  const fetchLicitacoes = async (): Promise<SearchResultItem[]> => {
    const query = sql<any>`
      SELECT 
        l.licitacao_id AS id,
        'licitacao' AS tipo,
        coalesce(l.licitacao_numero, '') AS numero,
        coalesce(l.objeto, l.discriminacao, '') AS objeto,
        itens.fornecedor_nome AS fornecedor_nome,
        coalesce(l.valor_homologado, l.valor_estimado, l.valor, 0) AS valor,
        l.situacao AS status,
        l.modalidade,
        l.ano,
        l.portal_slug,
        l.link_sistema_origem,
        (
          greatest(
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(l.objeto, '') || ' ' || 
                coalesce(l.discriminacao, '') || ' ' || 
                coalesce(l.licitacao_numero, '') || ' ' || 
                coalesce(itens.fornecedor_nome, '') || ' ' || 
                coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
            ),
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(l.objeto, '') || ' ' || 
                coalesce(l.discriminacao, '') || ' ' || 
                coalesce(l.licitacao_numero, '') || ' ' || 
                coalesce(itens.fornecedor_nome, '') || ' ' || 
                coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${normTermo}))
            )
          ) + greatest(
            similarity(unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(l.licitacao_numero, '') || ' ' || coalesce(itens.fornecedor_nome, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, '')))
          )
        ) AS rank
      FROM analytics.fct_licitacoes l
      LEFT JOIN (
        SELECT 
          portal_slug,
          ano,
          licitacao_numero,
          string_agg(DISTINCT fornecedor_nome, '; ') AS fornecedor_nome,
          string_agg(DISTINCT fornecedor_cpf_cnpj, ' ') AS fornecedor_cpf_cnpj
        FROM analytics.fct_licitacoes_itens
        WHERE portal_slug = ${cleanSlug}
          AND fornecedor_nome IS NOT NULL
          AND (situacao_item IS NULL OR situacao_item IN ('homologado', 'adjudicado', '2', '1') OR situacao_item NOT IN ('5', 'cancelado', 'fracassado', 'deserto'))
          ${filterAno !== null ? sql`AND ano = ${filterAno}` : sql``}
        GROUP BY portal_slug, ano, licitacao_numero
      ) itens ON itens.portal_slug = l.portal_slug AND itens.ano = l.ano AND itens.licitacao_numero = l.licitacao_numero
      WHERE l.portal_slug = ${cleanSlug}
        ${filterAno !== null ? sql`AND l.ano = ${filterAno}` : sql``}
        AND (
          to_tsvector('portuguese', unaccent(
            coalesce(l.objeto, '') || ' ' || 
            coalesce(l.discriminacao, '') || ' ' || 
            coalesce(l.licitacao_numero, '') || ' ' || 
            coalesce(itens.fornecedor_nome, '') || ' ' || 
            coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR to_tsvector('portuguese', unaccent(
            coalesce(l.objeto, '') || ' ' || 
            coalesce(l.discriminacao, '') || ' ' || 
            coalesce(l.licitacao_numero, '') || ' ' || 
            coalesce(itens.fornecedor_nome, '') || ' ' || 
            coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${normTermo}))
          OR unaccent(coalesce(l.licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(l.objeto, l.discriminacao, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(l.objeto, l.discriminacao, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_nome, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_cpf_cnpj, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR regexp_replace(regexp_replace(unaccent(coalesce(itens.fornecedor_nome, '')), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g') ILIKE ('%' || unaccent(${normTermo}) || '%')
          ${hasDigitsDoc ? sql`OR regexp_replace(coalesce(itens.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') ILIKE ('%' || ${digitsTermo} || '%')` : sql``}
          ${
            enableTrigram
              ? sql`
                OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, ''))) > 0.50
                OR similarity(unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, '')), unaccent(${cleanTermo})) > 0.50
              `
              : sql``
          }
        )
      ORDER BY 
        CASE 
          WHEN unaccent(coalesce(l.licitacao_numero, '')) = unaccent(${cleanTermo}) THEN 1
          WHEN unaccent(coalesce(l.licitacao_numero, '')) ILIKE (unaccent(${cleanTermo}) || '%') THEN 2
          ELSE 3 
        END,
        rank DESC,
        l.ano DESC
      LIMIT ${maxResults}
    `;

    const result = await query.execute(db);
    return (result.rows ?? []).map((r: any) => {
      const num = r.numero ? String(r.numero) : "";
      const ano = Number(r.ano) || 0;
      const slug = String(r.portal_slug);
      return {
        id: String(r.id),
        tipo: "licitacao",
        numero: num,
        objeto: String(r.objeto || ""),
        fornecedorNome: r.fornecedor_nome ? String(r.fornecedor_nome) : null,
        valor: Number(r.valor) || 0,
        status: r.status ? String(r.status) : null,
        modalidade: r.modalidade ? String(r.modalidade) : null,
        ano,
        portalSlug: slug,
        href: `/${slug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(num)}#licitacoes-em-andamento`,
        linkSistemaOrigem: r.link_sistema_origem
          ? String(r.link_sistema_origem)
          : null,
      };
    });
  };

  const fetchContratos = async (): Promise<SearchResultItem[]> => {
    const query = sql<any>`
      SELECT 
        contrato_id AS id,
        'contrato' AS tipo,
        coalesce(contrato_numero, '') AS numero,
        coalesce(objeto, objeto_completo, '') AS objeto,
        fornecedor_nome,
        coalesce(valor_contrato, 0) AS valor,
        CASE 
          WHEN vencimento_atual IS NOT NULL AND vencimento_atual >= CURRENT_DATE THEN 'vigente'
          WHEN vencimento_atual IS NOT NULL THEN 'encerrado'
          ELSE NULL 
        END AS status,
        modalidade,
        ano,
        data_inicio,
        vencimento_atual,
        portal_slug,
        (
          greatest(
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(objeto, '') || ' ' || 
                coalesce(objeto_completo, '') || ' ' || 
                coalesce(fornecedor_nome, '') || ' ' || 
                coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
                coalesce(contrato_numero, '') || ' ' || 
                coalesce(licitacao_numero, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
            ),
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(objeto, '') || ' ' || 
                coalesce(objeto_completo, '') || ' ' || 
                coalesce(fornecedor_nome, '') || ' ' || 
                coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
                coalesce(contrato_numero, '') || ' ' || 
                coalesce(licitacao_numero, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${normTermo}))
            )
          ) + greatest(
            similarity(unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, objeto_completo, '') || ' ' || coalesce(contrato_numero, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, objeto_completo, '')))
          )
        ) AS rank
      FROM analytics.fct_contratos
      WHERE portal_slug = ${cleanSlug}
        ${
          filterAno !== null
            ? sql`AND (
                (vencimento_atual IS NOT NULL AND EXTRACT(YEAR FROM vencimento_atual) >= ${filterAno} AND coalesce(EXTRACT(YEAR FROM data_inicio), ano) <= ${filterAno})
                OR (vencimento_atual IS NULL AND ano = ${filterAno})
              )`
            : sql``
        }
        AND (
          to_tsvector('portuguese', unaccent(
            coalesce(objeto, '') || ' ' || 
            coalesce(objeto_completo, '') || ' ' || 
            coalesce(fornecedor_nome, '') || ' ' || 
            coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(contrato_numero, '') || ' ' || 
            coalesce(licitacao_numero, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR to_tsvector('portuguese', unaccent(
            coalesce(objeto, '') || ' ' || 
            coalesce(objeto_completo, '') || ' ' || 
            coalesce(fornecedor_nome, '') || ' ' || 
            coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(contrato_numero, '') || ' ' || 
            coalesce(licitacao_numero, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${normTermo}))
          OR unaccent(coalesce(contrato_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(fornecedor_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(fornecedor_nome, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(fornecedor_cpf_cnpj, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(objeto, objeto_completo, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(objeto, objeto_completo, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR regexp_replace(regexp_replace(unaccent(coalesce(fornecedor_nome, '')), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g') ILIKE ('%' || unaccent(${normTermo}) || '%')
          ${hasDigitsDoc ? sql`OR regexp_replace(coalesce(fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') ILIKE ('%' || ${digitsTermo} || '%')` : sql``}
          ${
            enableTrigram
              ? sql`
                OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, objeto_completo, ''))) > 0.50
                OR similarity(unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, objeto_completo, '')), unaccent(${cleanTermo})) > 0.50
              `
              : sql``
          }
        )
      ORDER BY 
        CASE 
          WHEN unaccent(coalesce(contrato_numero, '')) = unaccent(${cleanTermo}) THEN 1
          WHEN unaccent(coalesce(contrato_numero, '')) ILIKE (unaccent(${cleanTermo}) || '%') THEN 2
          ELSE 3 
        END,
        rank DESC,
        ano DESC
      LIMIT ${maxResults}
    `;

    const result = await query.execute(db);
    return (result.rows ?? []).map((r: any) => {
      const num = r.numero ? String(r.numero) : "";
      const ano = Number(r.ano) || 0;
      const slug = String(r.portal_slug);
      const dataInicio = formatDateValue(r.data_inicio);
      const vencimentoAtual = formatDateValue(r.vencimento_atual);

      return {
        id: String(r.id),
        tipo: "contrato",
        numero: num,
        objeto: String(r.objeto || ""),
        fornecedorNome: r.fornecedor_nome ? String(r.fornecedor_nome) : null,
        valor: Number(r.valor) || 0,
        status: r.status ? String(r.status) : null,
        modalidade: r.modalidade ? String(r.modalidade) : null,
        ano,
        anoCelebracao: ano > 0 ? ano : undefined,
        dataInicio,
        vencimentoAtual,
        portalSlug: slug,
        href: `/${slug}/licitacoes?ano=${filterAno ?? ano}&contratoNumero=${encodeURIComponent(num)}#contratos-servicos-vigentes`,
      };
    });
  };

  try {
    const [licitacoes, contratos] = await Promise.all([
      searchLicitacoes ? fetchLicitacoes() : Promise.resolve([]),
      searchContratos ? fetchContratos() : Promise.resolve([]),
    ]);

    return {
      licitacoes,
      contratos,
      total: licitacoes.length + contratos.length,
    };
  } catch (_error) {
    return {
      licitacoes: [],
      contratos: [],
      total: 0,
    };
  }
}
