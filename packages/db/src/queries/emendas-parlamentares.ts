import { sql } from "kysely";
import { db } from "../client";
import type {
  EmendaSaudeDTO,
  EmendasStatsSaudeDTO,
} from "./historia-saude-metrics";

export type EmendaParlamentarDTO = EmendaSaudeDTO;
export type EmendasStatsDTO = EmendasStatsSaudeDTO;
export type EmendasEducacaoStatsDTO = EmendasStatsDTO;

type EmendaRow = Record<string, unknown>;

export const emendasStatsVazio: EmendasStatsDTO = {
  totalAutorizado: 0,
  totalEmpenhado: 0,
  taxaEmpenho: 0,
  maiorEmenda: 0,
  lista: [],
};

export function montarEmendasStats(rows: EmendaRow[]): EmendasStatsDTO {
  if (rows.length === 0) return emendasStatsVazio;

  const lista: EmendaParlamentarDTO[] = rows.map((r, index) => {
    const valorAutorizado = Number(r.valor_total ?? 0);
    const empenhado = Number(r.empenhado ?? 0);
    const numero = String(r.numero_emenda ?? "");

    return {
      id: `${String(r.autor ?? "")}-${String(r.resumo ?? "")}-${numero}-${index}`,
      numero,
      objeto: String(r.resumo ?? ""),
      valorAutorizado,
      empenhado: empenhado > 0 ? empenhado : null,
      autor: String(r.autor ?? ""),
      tipoEmenda: String(r.tipo_emenda ?? ""),
      esferaOrigem: String(r.esfera_origem ?? ""),
      atoNormativo: String(r.ato_normativo ?? ""),
      destinacao: String(r.destinacao ?? ""),
      qtdEmpenhos: 0,
      empenhos: [],
    };
  });

  const sortedLista = [...lista].sort((a, b) => {
    const aEmpenhado = a.empenhado ?? 0;
    const bEmpenhado = b.empenhado ?? 0;
    const aHas = aEmpenhado > 0;
    const bHas = bEmpenhado > 0;

    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas && bEmpenhado !== aEmpenhado) {
      return bEmpenhado - aEmpenhado;
    }
    if (b.valorAutorizado !== a.valorAutorizado) {
      return b.valorAutorizado - a.valorAutorizado;
    }
    return a.autor.localeCompare(b.autor, "pt-BR");
  });

  const totalAutorizado = sortedLista.reduce(
    (sum, item) => sum + item.valorAutorizado,
    0,
  );
  const totalEmpenhado = sortedLista.reduce(
    (sum, item) => sum + (item.empenhado ?? 0),
    0,
  );
  const maiorEmenda = sortedLista.reduce(
    (max, item) => Math.max(max, item.valorAutorizado),
    0,
  );

  return {
    totalAutorizado,
    totalEmpenhado,
    taxaEmpenho: totalAutorizado > 0 ? totalEmpenhado / totalAutorizado : 0,
    maiorEmenda,
    lista: sortedLista,
  };
}

/**
 * Emendas parlamentares destinadas à Educação: identifica as entidades da
 * educação em `dim_orgao` (nome do órgão contendo "educ") e traz as emendas
 * cadastradas para essas entidades, sempre isoladas por `portal_slug`.
 */
export async function getEducacaoEmendasMetrics(
  portalSlug: string,
  ano: number,
): Promise<EmendasEducacaoStatsDTO> {
  try {
    const rows = await db
      .selectFrom("fct_emendas as e")
      .innerJoin("dim_orgao as o", (join) =>
        join
          .onRef("o.portal_slug", "=", "e.portal_slug")
          .onRef("o.empresa_id", "=", "e.empresa_id"),
      )
      .selectAll("e")
      .where("e.portal_slug", "=", portalSlug)
      .where("e.ano", "=", ano)
      .where(sql<boolean>`unaccent(lower(o.orgao_nome)) like '%educ%'`)
      .execute();

    return montarEmendasStats(rows);
  } catch {
    return emendasStatsVazio;
  }
}
