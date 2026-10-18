import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDimOrgao } from "../../../tests/fixtures/seed";
import { db } from "../../client";
import {
  getEducacaoEmendasMetrics,
  montarEmendasStats,
} from "../emendas-parlamentares";

const PORTAL_TESTE = "portal_emendas_educacao_teste";
const OUTRO_PORTAL = "portal_emendas_outro_teste";
const ANO = 2031;

function emenda(dados: {
  portalSlug: string;
  empresaId: string;
  numero: string;
  valorTotal: number;
  empenhado: number;
}) {
  const { portalSlug, empresaId, numero, valorTotal, empenhado } = dados;
  return {
    emenda_id: `${portalSlug}-${empresaId}-${numero}`,
    portal_slug: portalSlug,
    ano: ANO,
    empresa_id: empresaId,
    numero_emenda: numero,
    resumo: `Emenda ${numero}`,
    valor_total: valorTotal,
    empenhado,
    autor: `Autor ${numero}`,
    tipo_emenda: "individual",
    esfera_origem: "federal",
    ato_normativo: "ato",
    destinacao: "destinacao",
  };
}

async function limpar() {
  await db
    .deleteFrom("fct_emendas")
    .where("portal_slug", "in", [PORTAL_TESTE, OUTRO_PORTAL])
    .execute();
  await db
    .deleteFrom("dim_orgao")
    .where("portal_slug", "in", [PORTAL_TESTE, OUTRO_PORTAL])
    .execute();
}

describe("getEducacaoEmendasMetrics", () => {
  beforeAll(async () => {
    await limpar();
    await seedDimOrgao({
      portalSlug: PORTAL_TESTE,
      empresaId: "10",
      orgaoNome: "Fundo Municipal de Educação",
    });
    await seedDimOrgao({
      portalSlug: PORTAL_TESTE,
      empresaId: "11",
      orgaoNome: "Fundo Municipal de Saúde",
    });
    await seedDimOrgao({
      portalSlug: OUTRO_PORTAL,
      empresaId: "10",
      orgaoNome: "Secretaria de Obras",
    });
    await db
      .insertInto("fct_emendas")
      .values([
        emenda({
          portalSlug: PORTAL_TESTE,
          empresaId: "10",
          numero: "1",
          valorTotal: 300,
          empenhado: 100,
        }),
        emenda({
          portalSlug: PORTAL_TESTE,
          empresaId: "10",
          numero: "2",
          valorTotal: 500,
          empenhado: 0,
        }),
        emenda({
          portalSlug: PORTAL_TESTE,
          empresaId: "11",
          numero: "3",
          valorTotal: 900,
          empenhado: 900,
        }),
        emenda({
          portalSlug: OUTRO_PORTAL,
          empresaId: "10",
          numero: "4",
          valorTotal: 700,
          empenhado: 700,
        }),
      ])
      .execute();
  });

  afterAll(limpar);

  it("traz somente emendas das entidades de educação do próprio portal", async () => {
    const resultado = await getEducacaoEmendasMetrics(PORTAL_TESTE, ANO);
    expect(resultado.lista.map((e) => e.numero)).toEqual(["1", "2"]);
    expect(resultado.totalAutorizado).toBe(800);
    expect(resultado.totalEmpenhado).toBe(100);
    expect(resultado.maiorEmenda).toBe(500);
    expect(resultado.taxaEmpenho).toBeCloseTo(0.125);
  });

  it("retorna vazio para portal sem entidade de educação", async () => {
    const resultado = await getEducacaoEmendasMetrics(OUTRO_PORTAL, ANO);
    expect(resultado.lista).toEqual([]);
    expect(resultado.totalAutorizado).toBe(0);
  });
});

describe("montarEmendasStats", () => {
  it("retorna estatísticas vazias sem linhas", () => {
    expect(montarEmendasStats([]).lista).toEqual([]);
  });

  it("ordena empenhadas primeiro, converte empenhado zero em null e calcula taxa", () => {
    const resultado = montarEmendasStats([
      { numero_emenda: "A", valor_total: 1000, empenhado: 0, autor: "Zeca" },
      { numero_emenda: "B", valor_total: 200, empenhado: 50, autor: "Ana" },
    ]);
    expect(resultado.lista.map((e) => e.numero)).toEqual(["B", "A"]);
    expect(resultado.lista[1]?.empenhado).toBeNull();
    expect(resultado.taxaEmpenho).toBeCloseTo(50 / 1200);
  });

  it("taxa de empenho é zero quando nada foi autorizado", () => {
    const resultado = montarEmendasStats([
      { numero_emenda: "A", valor_total: 0, empenhado: 0, autor: "Ana" },
    ]);
    expect(resultado.taxaEmpenho).toBe(0);
  });
});
