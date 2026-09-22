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
        licitacao_id AS id,
        'licitacao' AS tipo,
        coalesce(licitacao_numero, '') AS numero,
        coalesce(objeto, discriminacao, '') AS objeto,
        NULL AS fornecedor_nome,
        coalesce(valor_homologado, valor_estimado, valor, 0) AS valor,
        situacao AS status,
        modalidade,
        ano,
        portal_slug,
        link_sistema_origem,
        (
          ts_rank(
            to_tsvector('portuguese', unaccent(coalesce(objeto, '') || ' ' || coalesce(discriminacao, '') || ' ' || coalesce(licitacao_numero, ''))),
            websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          ) + greatest(
            similarity(unaccent(coalesce(objeto, '') || ' ' || coalesce(licitacao_numero, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(objeto, '')))
          )
        ) AS rank
      FROM analytics.fct_licitacoes
      WHERE portal_slug = ${cleanSlug}
        ${filterAno !== null ? sql`AND ano = ${filterAno}` : sql``}
        AND (
          to_tsvector('portuguese', unaccent(coalesce(objeto, '') || ' ' || coalesce(discriminacao, '') || ' ' || coalesce(licitacao_numero, ''))) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR unaccent(coalesce(licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(objeto, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(objeto, ''))) > 0.35
          OR similarity(unaccent(coalesce(objeto, '')), unaccent(${cleanTermo})) > 0.3
        )
      ORDER BY 
        CASE 
          WHEN unaccent(coalesce(licitacao_numero, '')) = unaccent(${cleanTermo}) THEN 1
          WHEN unaccent(coalesce(licitacao_numero, '')) ILIKE (unaccent(${cleanTermo}) || '%') THEN 2
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
      return {
        id: String(r.id),
        tipo: "licitacao",
        numero: num,
        objeto: String(r.objeto || ""),
        fornecedorNome: null,
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
        portal_slug,
        (
          ts_rank(
            to_tsvector('portuguese', unaccent(
              coalesce(objeto, '') || ' ' || 
              coalesce(objeto_completo, '') || ' ' || 
              coalesce(fornecedor_nome, '') || ' ' || 
              coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
              coalesce(contrato_numero, '') || ' ' || 
              coalesce(licitacao_numero, '')
            )),
            websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          ) + greatest(
            similarity(unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, '') || ' ' || coalesce(contrato_numero, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, '')))
          )
        ) AS rank
      FROM analytics.fct_contratos
      WHERE portal_slug = ${cleanSlug}
        ${filterAno !== null ? sql`AND ano = ${filterAno}` : sql``}
        AND (
          to_tsvector('portuguese', unaccent(
            coalesce(objeto, '') || ' ' || 
            coalesce(objeto_completo, '') || ' ' || 
            coalesce(fornecedor_nome, '') || ' ' || 
            coalesce(fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(contrato_numero, '') || ' ' || 
            coalesce(licitacao_numero, '')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR unaccent(coalesce(contrato_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(fornecedor_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(fornecedor_cpf_cnpj, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(objeto, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, ''))) > 0.35
          OR similarity(unaccent(coalesce(fornecedor_nome, '') || ' ' || coalesce(objeto, '')), unaccent(${cleanTermo})) > 0.3
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
        portalSlug: slug,
        href: `/${slug}/licitacoes?ano=${ano}&numero=${encodeURIComponent(num)}#contratos-servicos-vigentes`,
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
