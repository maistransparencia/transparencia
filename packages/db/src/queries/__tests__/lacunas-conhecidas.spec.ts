import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../client";
import { getLacunasConhecidas } from "../lacunas-conhecidas";

const PORTAL_TESTE = "portal_lacunas_teste";
const OUTRO_PORTAL = "portal_lacunas_outro_teste";
const DATA_REFERENCIA = "2031-06-10";

function linha(dados: {
  portalSlug: string;
  codigo: string;
  tipo?: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
}) {
  return {
    id_registro: `${dados.portalSlug}-${dados.codigo}`,
    portal_slug: dados.portalSlug,
    codigo: dados.codigo,
    fonte: "todas_as_fontes",
    tipo: dados.tipo ?? "lacuna",
    texto_cidadao: `texto ${dados.codigo}`,
    vigencia_inicio: dados.vigenciaInicio,
    vigencia_fim: dados.vigenciaFim ?? null,
  };
}

async function limpar() {
  await db
    .deleteFrom("fct_lacunas_conhecidas")
    .where("portal_slug", "in", [PORTAL_TESTE, OUTRO_PORTAL])
    .execute();
}

describe("getLacunasConhecidas", () => {
  beforeAll(async () => {
    await limpar();
    await db
      .insertInto("fct_lacunas_conhecidas")
      .values([
        linha({
          portalSlug: PORTAL_TESTE,
          codigo: "b_sem_fim",
          vigenciaInicio: "2031-01-01",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          codigo: "a_divergencia",
          tipo: "divergencia",
          vigenciaInicio: "2031-06-10",
          vigenciaFim: "2031-06-10",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          codigo: "c_ainda_nao_vigente",
          vigenciaInicio: "2031-06-11",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          codigo: "d_ja_encerrada",
          vigenciaInicio: "2030-01-01",
          vigenciaFim: "2031-06-09",
        }),
        linha({
          portalSlug: OUTRO_PORTAL,
          codigo: "e_de_outro_portal",
          vigenciaInicio: "2031-01-01",
        }),
      ])
      .execute();
  });

  afterAll(limpar);

  it("traz só as vigentes na data de referência, com os limites incluídos", async () => {
    const resultado = await getLacunasConhecidas(PORTAL_TESTE, DATA_REFERENCIA);

    expect(resultado.map((lacuna) => lacuna.codigo)).toEqual([
      "a_divergencia",
      "b_sem_fim",
    ]);
  });

  it("devolve camelCase e o tipo da lacuna", async () => {
    const [primeira] = await getLacunasConhecidas(
      PORTAL_TESTE,
      DATA_REFERENCIA,
    );

    expect(primeira).toEqual({
      codigo: "a_divergencia",
      fonte: "todas_as_fontes",
      tipo: "divergencia",
      textoCidadao: "texto a_divergencia",
    });
  });

  it("isola por portal", async () => {
    const resultado = await getLacunasConhecidas(OUTRO_PORTAL, DATA_REFERENCIA);

    expect(resultado.map((lacuna) => lacuna.codigo)).toEqual([
      "e_de_outro_portal",
    ]);
  });

  it("devolve vazio sem portal e rejeita data inválida", async () => {
    expect(await getLacunasConhecidas("  ", DATA_REFERENCIA)).toEqual([]);
    await expect(getLacunasConhecidas(PORTAL_TESTE, "ontem")).rejects.toThrow(
      "dataReferencia inválida",
    );
  });
});
