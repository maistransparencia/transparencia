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
  orgaoNome?: string | null;
  fontePrincipal?: string | null;
  fontesRecursos?: string | null;
  programaNome?: string | null;
  projetoAtividadeNome?: string | null;
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
        o.orgao_nome,
        desp.fonte_principal,
        desp.fontes_recursos,
        desp.principal_programa AS programa_nome,
        desp.principal_acao AS projeto_atividade_nome,
        (
          greatest(
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(l.objeto, '') || ' ' || 
                coalesce(l.discriminacao, '') || ' ' || 
                coalesce(l.licitacao_numero, '') || ' ' || 
                coalesce(itens.fornecedor_nome, '') || ' ' || 
                coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' ||
                coalesce(o.orgao_nome, '') || ' ' ||
                coalesce(desp.fonte_principal, '') || ' ' ||
                coalesce(desp.fontes_recursos, '') || ' ' ||
                coalesce(desp.principal_programa, '') || ' ' ||
                coalesce(desp.principal_acao, '') || ' ' ||
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
                coalesce(o.orgao_nome, '') || ' ' ||
                coalesce(desp.fonte_principal, '') || ' ' ||
                coalesce(desp.fontes_recursos, '') || ' ' ||
                coalesce(desp.principal_programa, '') || ' ' ||
                coalesce(desp.principal_acao, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${normTermo}))
            )
          ) + greatest(
            similarity(unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(l.licitacao_numero, '') || ' ' || coalesce(itens.fornecedor_nome, '') || ' ' || coalesce(desp.principal_programa, '') || ' ' || coalesce(desp.principal_acao, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, '') || ' ' || coalesce(desp.principal_programa, '') || ' ' || coalesce(desp.principal_acao, '')))
          )
        ) AS rank
      FROM analytics.fct_licitacoes l
      LEFT JOIN analytics.dim_orgao o 
        ON o.portal_slug = l.portal_slug AND o.empresa_id = l.empresa_id
      LEFT JOIN (
        SELECT 
          portal_slug,
          empresa_id,
          split_part(licitacao_numero, '/', 1) AS lic_num,
          coalesce(
            (CASE 
              WHEN split_part(licitacao_numero, '/', 2) ~ '^[0-9]{2}$' THEN 2000 + split_part(licitacao_numero, '/', 2)::int
              WHEN split_part(licitacao_numero, '/', 2) ~ '^[0-9]{4}$' THEN split_part(licitacao_numero, '/', 2)::int
              ELSE NULL 
            END),
            ano
          ) AS lic_ano,
          (array_agg(fonte_recurso_desc ORDER BY empenhado_liquido DESC) FILTER (WHERE fonte_recurso_desc IS NOT NULL AND trim(fonte_recurso_desc) != ''))[1] AS fonte_principal,
          string_agg(DISTINCT fonte_recurso_desc, '; ') FILTER (WHERE fonte_recurso_desc IS NOT NULL AND trim(fonte_recurso_desc) != '') AS fontes_recursos,
          (array_agg(programa_nome ORDER BY empenhado_liquido DESC) FILTER (WHERE programa_nome IS NOT NULL))[1] AS principal_programa,
          (array_agg(projeto_atividade_nome ORDER BY empenhado_liquido DESC) FILTER (WHERE projeto_atividade_nome IS NOT NULL))[1] AS principal_acao
        FROM analytics.fct_despesas
        WHERE portal_slug = ${cleanSlug}
          AND licitacao_numero IS NOT NULL
        GROUP BY 1, 2, 3, 4
      ) desp ON desp.portal_slug = l.portal_slug 
        AND desp.empresa_id = l.empresa_id 
        AND desp.lic_num = l.licitacao_numero
        AND desp.lic_ano = l.ano
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
            coalesce(o.orgao_nome, '') || ' ' ||
            coalesce(desp.fonte_principal, '') || ' ' ||
            coalesce(desp.fontes_recursos, '') || ' ' ||
            coalesce(desp.principal_programa, '') || ' ' ||
            coalesce(desp.principal_acao, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR to_tsvector('portuguese', unaccent(
            coalesce(l.objeto, '') || ' ' || 
            coalesce(l.discriminacao, '') || ' ' || 
            coalesce(l.licitacao_numero, '') || ' ' || 
            coalesce(itens.fornecedor_nome, '') || ' ' || 
            coalesce(itens.fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(o.orgao_nome, '') || ' ' ||
            coalesce(desp.fonte_principal, '') || ' ' ||
            coalesce(desp.fontes_recursos, '') || ' ' ||
            coalesce(desp.principal_programa, '') || ' ' ||
            coalesce(desp.principal_acao, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(itens.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${normTermo}))
          OR unaccent(coalesce(l.licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(l.objeto, l.discriminacao, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(l.objeto, l.discriminacao, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_nome, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(itens.fornecedor_cpf_cnpj, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(o.orgao_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(desp.fonte_principal, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(desp.fontes_recursos, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(desp.principal_programa, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(desp.principal_acao, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR regexp_replace(regexp_replace(unaccent(coalesce(itens.fornecedor_nome, '')), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g') ILIKE ('%' || unaccent(${normTermo}) || '%')
          ${hasDigitsDoc ? sql`OR regexp_replace(coalesce(itens.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') ILIKE ('%' || ${digitsTermo} || '%')` : sql``}
          ${
            enableTrigram
              ? sql`
                OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, '') || ' ' || coalesce(desp.principal_programa, '') || ' ' || coalesce(desp.principal_acao, ''))) > 0.50
                OR similarity(unaccent(coalesce(l.objeto, l.discriminacao, '') || ' ' || coalesce(itens.fornecedor_nome, '') || ' ' || coalesce(desp.principal_programa, '') || ' ' || coalesce(desp.principal_acao, '')), unaccent(${cleanTermo})) > 0.50
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
        orgaoNome: r.orgao_nome ? String(r.orgao_nome) : null,
        fontePrincipal: r.fonte_principal ? String(r.fonte_principal) : null,
        fontesRecursos: r.fontes_recursos ? String(r.fontes_recursos) : null,
        programaNome: r.programa_nome ? String(r.programa_nome) : null,
        projetoAtividadeNome: r.projeto_atividade_nome
          ? String(r.projeto_atividade_nome)
          : null,
      };
    });
  };

  const fetchContratos = async (): Promise<SearchResultItem[]> => {
    const query = sql<any>`
      SELECT 
        c.contrato_id AS id,
        'contrato' AS tipo,
        coalesce(c.contrato_numero, '') AS numero,
        coalesce(c.objeto, c.objeto_completo, '') AS objeto,
        c.fornecedor_nome,
        coalesce(c.valor_contrato, 0) AS valor,
        CASE 
          WHEN c.vencimento_atual IS NOT NULL AND c.vencimento_atual >= CURRENT_DATE THEN 'vigente'
          WHEN c.vencimento_atual IS NOT NULL THEN 'encerrado'
          ELSE NULL 
        END AS status,
        c.modalidade,
        c.ano,
        c.data_inicio,
        c.vencimento_atual,
        c.portal_slug,
        cr.orgao_nome,
        cr.fonte_principal,
        cr.fontes_recursos,
        cr.principal_programa AS programa_nome,
        cr.principal_acao AS projeto_atividade_nome,
        (
          greatest(
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(c.objeto, '') || ' ' || 
                coalesce(c.objeto_completo, '') || ' ' || 
                coalesce(c.fornecedor_nome, '') || ' ' || 
                coalesce(c.fornecedor_cpf_cnpj, '') || ' ' || 
                coalesce(c.contrato_numero, '') || ' ' || 
                coalesce(c.licitacao_numero, '') || ' ' ||
                coalesce(cr.orgao_nome, '') || ' ' ||
                coalesce(cr.fonte_principal, '') || ' ' ||
                coalesce(cr.fontes_recursos, '') || ' ' ||
                coalesce(cr.principal_programa, '') || ' ' ||
                coalesce(cr.principal_acao, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(c.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
            ),
            ts_rank(
              to_tsvector('portuguese', unaccent(
                coalesce(c.objeto, '') || ' ' || 
                coalesce(c.objeto_completo, '') || ' ' || 
                coalesce(c.fornecedor_nome, '') || ' ' || 
                coalesce(c.fornecedor_cpf_cnpj, '') || ' ' || 
                coalesce(c.contrato_numero, '') || ' ' || 
                coalesce(c.licitacao_numero, '') || ' ' ||
                coalesce(cr.orgao_nome, '') || ' ' ||
                coalesce(cr.fonte_principal, '') || ' ' ||
                coalesce(cr.fontes_recursos, '') || ' ' ||
                coalesce(cr.principal_programa, '') || ' ' ||
                coalesce(cr.principal_acao, '') || ' ' ||
                regexp_replace(regexp_replace(coalesce(c.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
              )),
              websearch_to_tsquery('portuguese', unaccent(${normTermo}))
            )
          ) + greatest(
            similarity(unaccent(coalesce(c.fornecedor_nome, '') || ' ' || coalesce(c.objeto, c.objeto_completo, '') || ' ' || coalesce(c.contrato_numero, '') || ' ' || coalesce(cr.principal_programa, '') || ' ' || coalesce(cr.principal_acao, '')), unaccent(${cleanTermo})),
            word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(c.fornecedor_nome, '') || ' ' || coalesce(c.objeto, c.objeto_completo, '') || ' ' || coalesce(cr.principal_programa, '') || ' ' || coalesce(cr.principal_acao, '')))
          ) + (CASE WHEN c.vencimento_atual >= CURRENT_DATE THEN 0.5 ELSE 0.0 END)
        ) AS rank
      FROM analytics.fct_contratos c
      LEFT JOIN analytics.fct_contratos_recursos cr
        ON cr.portal_slug = c.portal_slug AND cr.contrato_id = c.contrato_id
      WHERE c.portal_slug = ${cleanSlug}
        ${
          filterAno !== null
            ? sql`AND (
                (c.vencimento_atual IS NOT NULL AND EXTRACT(YEAR FROM c.vencimento_atual) >= ${filterAno} AND coalesce(EXTRACT(YEAR FROM c.data_inicio), c.ano) <= ${filterAno})
                OR (c.vencimento_atual IS NULL AND c.ano = ${filterAno})
              )`
            : sql``
        }
        AND (
          to_tsvector('portuguese', unaccent(
            coalesce(c.objeto, '') || ' ' || 
            coalesce(c.objeto_completo, '') || ' ' || 
            coalesce(c.fornecedor_nome, '') || ' ' || 
            coalesce(c.fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(c.contrato_numero, '') || ' ' || 
            coalesce(c.licitacao_numero, '') || ' ' ||
            coalesce(cr.orgao_nome, '') || ' ' ||
            coalesce(cr.fonte_principal, '') || ' ' ||
            coalesce(cr.fontes_recursos, '') || ' ' ||
            coalesce(cr.principal_programa, '') || ' ' ||
            coalesce(cr.principal_acao, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(c.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${cleanTermo}))
          OR to_tsvector('portuguese', unaccent(
            coalesce(c.objeto, '') || ' ' || 
            coalesce(c.objeto_completo, '') || ' ' || 
            coalesce(c.fornecedor_nome, '') || ' ' || 
            coalesce(c.fornecedor_cpf_cnpj, '') || ' ' || 
            coalesce(c.contrato_numero, '') || ' ' || 
            coalesce(c.licitacao_numero, '') || ' ' ||
            coalesce(cr.orgao_nome, '') || ' ' ||
            coalesce(cr.fonte_principal, '') || ' ' ||
            coalesce(cr.fontes_recursos, '') || ' ' ||
            coalesce(cr.principal_programa, '') || ' ' ||
            coalesce(cr.principal_acao, '') || ' ' ||
            regexp_replace(regexp_replace(coalesce(c.fornecedor_nome, ''), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g')
          )) @@ websearch_to_tsquery('portuguese', unaccent(${normTermo}))
          OR unaccent(coalesce(c.contrato_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(c.fornecedor_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(c.fornecedor_nome, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(c.fornecedor_cpf_cnpj, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(c.licitacao_numero, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(c.objeto, c.objeto_completo, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(c.objeto, c.objeto_completo, '')) ILIKE ('%' || unaccent(${normTermo}) || '%')
          OR unaccent(coalesce(cr.orgao_nome, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(cr.fonte_principal, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(cr.fontes_recursos, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(cr.principal_programa, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR unaccent(coalesce(cr.principal_acao, '')) ILIKE ('%' || unaccent(${cleanTermo}) || '%')
          OR regexp_replace(regexp_replace(unaccent(coalesce(c.fornecedor_nome, '')), '[-./]', ' ', 'g'), '[[:space:]]+', ' ', 'g') ILIKE ('%' || unaccent(${normTermo}) || '%')
          ${hasDigitsDoc ? sql`OR regexp_replace(coalesce(c.fornecedor_cpf_cnpj, ''), '[^0-9]', '', 'g') ILIKE ('%' || ${digitsTermo} || '%')` : sql``}
          ${
            enableTrigram
              ? sql`
                OR word_similarity(unaccent(${cleanTermo}), unaccent(coalesce(c.fornecedor_nome, '') || ' ' || coalesce(c.objeto, c.objeto_completo, '') || ' ' || coalesce(cr.principal_programa, '') || ' ' || coalesce(cr.principal_acao, ''))) > 0.50
                OR similarity(unaccent(coalesce(c.fornecedor_nome, '') || ' ' || coalesce(c.objeto, c.objeto_completo, '') || ' ' || coalesce(cr.principal_programa, '') || ' ' || coalesce(cr.principal_acao, '')), unaccent(${cleanTermo})) > 0.50
              `
              : sql``
          }
        )
      ORDER BY 
        CASE 
          WHEN unaccent(coalesce(c.contrato_numero, '')) = unaccent(${cleanTermo}) THEN 1
          WHEN unaccent(coalesce(c.contrato_numero, '')) ILIKE (unaccent(${cleanTermo}) || '%') THEN 2
          ELSE 3 
        END,
        rank DESC,
        c.ano DESC
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
        orgaoNome: r.orgao_nome ? String(r.orgao_nome) : null,
        fontePrincipal: r.fonte_principal ? String(r.fonte_principal) : null,
        fontesRecursos: r.fontes_recursos ? String(r.fontes_recursos) : null,
        programaNome: r.programa_nome ? String(r.programa_nome) : null,
        projetoAtividadeNome: r.projeto_atividade_nome
          ? String(r.projeto_atividade_nome)
          : null,
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
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: registrar o erro é fundamental para diagnosticar falhas de query/extensões no Postgres
    console.error(
      "[searchLicitacoesEContratos] Falha ao executar busca:",
      error,
    );
    return {
      licitacoes: [],
      contratos: [],
      total: 0,
    };
  }
}
