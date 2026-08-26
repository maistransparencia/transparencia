import { db } from "../client";

export interface PosicaoFiscalDetalhesMetricsDTO {
  portalSlug: string;
  ano: number;
  restosPendentesTotal: number;
  restosPendentesAnteriores: number;
  restosPendentes: Array<{
    ano: number;
    administracao: "Adm. Anterior" | "Adm. Atual";
    empenhado: number;
    liquidado: number;
    pago: number;
    pendente: number;
  }>;
  topCredoresAdmAtual: Array<{
    fornecedor: string;
    pendente: number;
  }>;
  totalCredoresAdmAtual: number;
}

export async function getPosicaoFiscalDetalhesMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<PosicaoFiscalDetalhesMetricsDTO> {
  if (empresaIds.length === 0) {
    return {
      portalSlug,
      ano,
      restosPendentesTotal: 0,
      restosPendentesAnteriores: 0,
      restosPendentes: [],
      topCredoresAdmAtual: [],
      totalCredoresAdmAtual: 0,
    };
  }

  const results = await db
    .selectFrom("fct_posicao_fiscal_detalhes_metricas")
    .select([
      "portal_slug",
      "ano",
      "fornecedor_nome",
      "valor_empenhado",
      "valor_liquidado",
      "valor_pago",
      "valor_pendente",
      "administracao",
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "<=", ano)
    .where("empresa_id", "in", empresaIds)
    .execute();

  type RestosEntry = {
    ano: number;
    administracao: "Adm. Anterior" | "Adm. Atual";
    empenhado: number;
    liquidado: number;
    pago: number;
    pendente: number;
  };

  const { byYearMap, creditorMap } = results.reduce(
    (acc, row) => {
      const rowAno = Number(row.ano);
      const empenhado = Number(row.valor_empenhado ?? 0);
      const liquidado = Number(row.valor_liquidado ?? 0);
      const pago = Number(row.valor_pago ?? 0);
      const pendente = Number(row.valor_pendente ?? 0);
      const administracao = (row.administracao ?? "Adm. Atual") as
        | "Adm. Anterior"
        | "Adm. Atual";

      const current = acc.byYearMap.get(rowAno) ?? {
        ano: rowAno,
        administracao,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        pendente: 0,
      };

      acc.byYearMap.set(rowAno, {
        ...current,
        empenhado: current.empenhado + empenhado,
        liquidado: current.liquidado + liquidado,
        pago: current.pago + pago,
        pendente: current.pendente + pendente,
      });

      if (rowAno === ano) {
        const supplier = String(row.fornecedor_nome ?? "Sem identificação");
        const prevPendente = acc.creditorMap.get(supplier) ?? 0;
        acc.creditorMap.set(supplier, prevPendente + pendente);
      }

      return acc;
    },
    {
      byYearMap: new Map<number, RestosEntry>(),
      creditorMap: new Map<string, number>(),
    },
  );

  const restosPendentes = Array.from(byYearMap.values())
    .sort((a, b) => a.ano - b.ano)
    .map((item) => ({
      ano: item.ano,
      administracao: item.administracao,
      empenhado: item.empenhado,
      liquidado: item.liquidado,
      pago: item.pago,
      pendente: item.pendente,
    }));

  const credoresAdmAtual = Array.from(creditorMap.entries())
    .filter(([, pendente]) => pendente > 0)
    .map(([fornecedor, pendente]) => ({ fornecedor, pendente }))
    .sort(
      (a, b) =>
        b.pendente - a.pendente ||
        a.fornecedor.localeCompare(b.fornecedor, "pt-BR"),
    );

  const topCredoresAdmAtual = credoresAdmAtual.slice(0, 5);

  const restosPendentesTotal =
    restosPendentes.find((item) => item.ano === ano)?.pendente ?? 0;
  const restosPendentesAnteriores =
    restosPendentes.find((item) => item.ano === ano - 1)?.pendente ?? 0;

  return {
    portalSlug,
    ano,
    restosPendentesTotal,
    restosPendentesAnteriores,
    restosPendentes,
    topCredoresAdmAtual,
    totalCredoresAdmAtual: credoresAdmAtual.length,
  } satisfies PosicaoFiscalDetalhesMetricsDTO;
}
