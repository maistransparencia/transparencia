import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedFarmacia,
  seedFarmaciaSentinela,
} from "../../../tests/fixtures/seed";
import {
  getFarmaciaSentinelas,
  getFarmaciaSus,
  getResumoFarmaciaSus,
} from "../farmacia";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL_A);
  await cleanupFixtures(PORTAL_B);
});

async function seedPortalConforme(portalSlug: string) {
  const base = {
    portalSlug,
    statusConformidade: "conforme",
    dataColeta: "2026-10-20",
    dataPosicaoMaisRecente: "2026-10-18",
    diasDesdePosicaoMaisRecente: 2,
  };
  await seedFarmacia({
    ...base,
    idRegistro: "1",
    codigoCnes: "1001",
    nomeUnidade: "UBS Centro",
    latitudeUnidade: -20.9,
    longitudeUnidade: -42.0,
    nomeMedicamento: "Dipirona 500mg",
    quantidadeEstoque: 120.5,
    dataPosicaoEstoque: "2026-10-18",
  });
  await seedFarmacia({
    ...base,
    idRegistro: "2",
    codigoCnes: "1001",
    nomeUnidade: "UBS Centro",
    latitudeUnidade: -20.9,
    longitudeUnidade: -42.0,
    nomeMedicamento: "Amoxicilina",
    quantidadeEstoque: 10,
    dataPosicaoEstoque: "2026-10-18",
  });
  await seedFarmacia({
    ...base,
    idRegistro: "3",
    codigoCnes: "1002",
    nomeUnidade: "UBS Norte",
    nomeMedicamento: "Dipirona Sódica",
    quantidadeEstoque: 5,
    dataPosicaoEstoque: "2026-10-17",
  });
}

describe("farmacia queries", () => {
  it("retorna indisponivel para slug vazio ou sem linhas", async () => {
    expect((await getFarmaciaSus("")).status).toBe("indisponivel");
    expect((await getResumoFarmaciaSus("   ")).status).toBe("indisponivel");
    const semLinhas = await getFarmaciaSus(PORTAL_A, { busca: "dipirona" });
    expect(semLinhas).toMatchObject({
      status: "indisponivel",
      totalUnidades: 0,
      unidades: [],
    });
  });

  it("retorna status apagao sem unidades", async () => {
    await seedFarmacia({
      portalSlug: PORTAL_A,
      idRegistro: "status",
      statusConformidade: "apagao",
      dataPosicaoMaisRecente: "2026-09-01",
      diasDesdePosicaoMaisRecente: 49,
    });
    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "dipirona" });
    expect(resultado.status).toBe("apagao");
    expect(resultado.diasDesdePosicaoMaisRecente).toBe(49);
    expect(resultado.dataPosicaoMaisRecente).toBe("2026-09-01");
    expect(resultado.unidades).toEqual([]);
  });

  it("conforme sem busca nao retorna unidades", async () => {
    await seedPortalConforme(PORTAL_A);
    const resultado = await getFarmaciaSus(PORTAL_A);
    expect(resultado.status).toBe("conforme");
    expect(resultado.dataColeta).toBe("2026-10-20");
    expect(resultado.unidades).toEqual([]);
  });

  it("agrupa por unidade, ignora acento e caixa e usa camelCase", async () => {
    await seedPortalConforme(PORTAL_A);
    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "DIPIRONA" });
    expect(resultado.totalUnidades).toBe(2);
    expect(resultado.unidades.map((u) => u.nomeUnidade)).toEqual([
      "UBS Centro",
      "UBS Norte",
    ]);
    const centro = resultado.unidades[0];
    expect(centro.idUnidade).toBe("1001");
    expect(centro.latitudeUnidade).toBe(-20.9);
    expect(centro.medicamentos).toEqual([
      {
        nomeMedicamento: "Dipirona 500mg",
        quantidadeEstoque: 120.5,
        dataPosicaoEstoque: "2026-10-18",
      },
    ]);
    expect(resultado.unidades[1].latitudeUnidade).toBeNull();

    const acento = await getFarmaciaSus(PORTAL_A, { busca: "sodica" });
    expect(acento.unidades).toHaveLength(1);
  });

  it("soma os lotes do mesmo medicamento e normaliza espacos do nome", async () => {
    const base = {
      portalSlug: PORTAL_A,
      statusConformidade: "conforme",
      dataColeta: "2026-10-20",
      dataPosicaoMaisRecente: "2026-10-18",
      diasDesdePosicaoMaisRecente: 2,
      codigoCnes: "2001",
      nomeUnidade: "Farmacia Central",
      dataPosicaoEstoque: "2026-10-18",
    };
    await seedFarmacia({
      ...base,
      idRegistro: "lote-1",
      nomeMedicamento: "IBUPROFENO  300 MG COMPRIMIDO",
      quantidadeEstoque: 4000,
    });
    await seedFarmacia({
      ...base,
      idRegistro: "lote-2",
      nomeMedicamento: "IBUPROFENO 300 MG COMPRIMIDO",
      quantidadeEstoque: 14783,
    });

    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "ibuprofeno" });

    expect(resultado.unidades[0].medicamentos).toEqual([
      {
        nomeMedicamento: "IBUPROFENO 300 MG COMPRIMIDO",
        quantidadeEstoque: 18783,
        dataPosicaoEstoque: "2026-10-18",
      },
    ]);
  });

  it("filtra por unidade e pagina", async () => {
    await seedPortalConforme(PORTAL_A);
    const filtrada = await getFarmaciaSus(PORTAL_A, {
      busca: "dipirona",
      idUnidade: "1002",
    });
    expect(filtrada.unidades.map((u) => u.idUnidade)).toEqual(["1002"]);

    const pagina1 = await getFarmaciaSus(PORTAL_A, {
      busca: "dipirona",
      limiteUnidades: 1,
    });
    const pagina2 = await getFarmaciaSus(PORTAL_A, {
      busca: "dipirona",
      limiteUnidades: 1,
      offsetUnidades: 1,
    });
    expect(pagina1.totalUnidades).toBe(2);
    expect(pagina1.unidades[0].idUnidade).toBe("1001");
    expect(pagina2.unidades[0].idUnidade).toBe("1002");
  });

  it("nao cruza dados entre portais", async () => {
    await seedPortalConforme(PORTAL_A);
    await seedFarmacia({
      portalSlug: PORTAL_B,
      idRegistro: "status",
      statusConformidade: "apagao",
    });
    const b = await getFarmaciaSus(PORTAL_B, { busca: "dipirona" });
    expect(b.status).toBe("apagao");
    expect(b.unidades).toEqual([]);
    const a = await getFarmaciaSus(PORTAL_A, { busca: "dipirona" });
    expect(a.unidades).toHaveLength(2);
  });

  it("trata curingas LIKE literalmente", async () => {
    await seedPortalConforme(PORTAL_A);
    expect((await getFarmaciaSus(PORTAL_A, { busca: "%%" })).unidades).toEqual(
      [],
    );
    expect((await getFarmaciaSus(PORTAL_A, { busca: "__" })).unidades).toEqual(
      [],
    );
    expect(
      (await getFarmaciaSus(PORTAL_A, { busca: "\\\\" })).unidades,
    ).toEqual([]);
  });

  it("status desconhecido vira indisponivel", async () => {
    await seedFarmacia({
      portalSlug: PORTAL_A,
      idRegistro: "x",
      statusConformidade: "xyz",
    });
    expect((await getResumoFarmaciaSus(PORTAL_A)).status).toBe("indisponivel");
  });
});

describe("getFarmaciaSentinelas", () => {
  it("conta unidades com registro sobre as unidades ativas, ordenado por ordem_exibicao", async () => {
    const base = { portalSlug: PORTAL_A };
    await seedFarmaciaSentinela({
      ...base,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
      ordemExibicao: 2,
      grupoTerapeutico: "dor_febre",
    });
    await seedFarmaciaSentinela({
      ...base,
      codigoCnes: "1002",
      codigoPrincipioAtivo: "dipirona",
      ordemExibicao: 2,
      grupoTerapeutico: "dor_febre",
      statusDisponibilidade: "sem_registro_estoque",
    });
    await seedFarmaciaSentinela({
      ...base,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "losartana",
      ordemExibicao: 1,
    });
    await seedFarmaciaSentinela({
      ...base,
      codigoCnes: "1002",
      codigoPrincipioAtivo: "losartana",
      ordemExibicao: 1,
      statusDisponibilidade: "sem_registro_estoque",
    });

    const resultado = await getFarmaciaSentinelas(PORTAL_A);
    expect(resultado.totalUnidadesAtivas).toBe(2);
    expect(resultado.sentinelas.map((s) => s.codigoPrincipioAtivo)).toEqual([
      "losartana",
      "dipirona",
    ]);
    expect(resultado.sentinelas.map((s) => s.unidadesComRegistro)).toEqual([
      1, 1,
    ]);
  });

  it("isola contagens entre portais", async () => {
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_B,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
      statusDisponibilidade: "sem_registro_estoque",
    });
    const a = await getFarmaciaSentinelas(PORTAL_A);
    const b = await getFarmaciaSentinelas(PORTAL_B);
    expect(a.sentinelas[0].unidadesComRegistro).toBe(1);
    expect(b.sentinelas[0].unidadesComRegistro).toBe(0);
    expect(b.totalUnidadesAtivas).toBe(1);
  });

  it("portal sem linhas ou slug inválido devolve vazio", async () => {
    expect(await getFarmaciaSentinelas(PORTAL_A)).toEqual({
      totalUnidadesAtivas: 0,
      sentinelas: [],
    });
    expect((await getFarmaciaSentinelas("  ")).sentinelas).toEqual([]);
  });
});
