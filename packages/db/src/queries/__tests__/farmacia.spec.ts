import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedFarmacia,
  seedFarmaciaHistorico,
  seedFarmaciaSentinela,
} from "../../../tests/fixtures/seed";
import {
  agruparFarmaciaPorRemedio,
  calcularIndicadoresFarmacia,
  FARMACIA_JANELA_LOTES_A_VENCER_DIAS,
  getFarmaciaEstoqueExportRecords,
  getFarmaciaIndiceAlfabetico,
  getFarmaciaLotesAVencer,
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

  it("expoe total por unidade (ordem decrescente), agrupamento por remedio e totais", async () => {
    await seedPortalConforme(PORTAL_A);
    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "dipirona" });
    expect(resultado.unidades.map((u) => u.totalQuantidadeEstoque)).toEqual([
      120.5, 5,
    ]);
    expect(resultado.totalQuantidadeEstoque).toBe(125.5);
    expect(resultado.totalApresentacoes).toBe(2);
    expect(resultado.remedios).toEqual([
      {
        nomeMedicamento: "Dipirona 500mg",
        totalQuantidadeEstoque: 120.5,
        totalUnidadesComEstoque: 1,
        unidades: [{ idUnidade: "1001", quantidadeEstoque: 120.5 }],
      },
      {
        nomeMedicamento: "Dipirona Sódica",
        totalQuantidadeEstoque: 5,
        totalUnidadesComEstoque: 1,
        unidades: [{ idUnidade: "1002", quantidadeEstoque: 5 }],
      },
    ]);
  });

  it("agrupa o mesmo remedio de varias unidades ordenando por quantidade", () => {
    const unidade = (idUnidade: string, quantidadeEstoque: number) => ({
      idUnidade,
      nomeUnidade: idUnidade,
      enderecoUnidade: null,
      telefoneUnidade: null,
      latitudeUnidade: null,
      longitudeUnidade: null,
      totalQuantidadeEstoque: quantidadeEstoque,
      medicamentos: [
        { nomeMedicamento: "X", quantidadeEstoque, dataPosicaoEstoque: null },
      ],
    });
    expect(
      agruparFarmaciaPorRemedio([unidade("a", 1), unidade("b", 9)]),
    ).toEqual([
      {
        nomeMedicamento: "X",
        totalQuantidadeEstoque: 10,
        totalUnidadesComEstoque: 2,
        unidades: [
          { idUnidade: "b", quantidadeEstoque: 9 },
          { idUnidade: "a", quantidadeEstoque: 1 },
        ],
      },
    ]);
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

  it("encontra o medicamento mesmo quando o nome cru tem espacos duplicados", async () => {
    await seedFarmacia({
      portalSlug: PORTAL_A,
      idRegistro: "1",
      statusConformidade: "conforme",
      dataColeta: "2026-10-20",
      dataPosicaoMaisRecente: "2026-10-18",
      diasDesdePosicaoMaisRecente: 2,
      codigoCnes: "1001",
      nomeUnidade: "UBS Centro",
      nomeMedicamento: "ACEBROFILINA 5 MG/ML XAROPE  120 ML",
      quantidadeEstoque: 4,
      dataPosicaoEstoque: "2026-10-18",
    });
    const nomeDoIndice = "ACEBROFILINA 5 MG/ML XAROPE 120 ML";
    const comEspacoSimples = await getFarmaciaSus(PORTAL_A, {
      busca: nomeDoIndice,
    });
    expect(comEspacoSimples.remedios.map((r) => r.nomeMedicamento)).toEqual([
      nomeDoIndice,
    ]);
    const comEspacoDuplo = await getFarmaciaSus(PORTAL_A, {
      busca: "  xarope   120 ml ",
    });
    expect(comEspacoDuplo.remedios).toHaveLength(1);
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

  it("expoe destaqueCardInicial agregado por principio ativo", async () => {
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
      ordemExibicao: 1,
      destaqueCardInicial: true,
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "captopril",
      ordemExibicao: 2,
    });

    const resultado = await getFarmaciaSentinelas(PORTAL_A);
    expect(
      resultado.sentinelas.map((s) => [
        s.codigoPrincipioAtivo,
        s.destaqueCardInicial,
      ]),
    ).toEqual([
      ["dipirona", true],
      ["captopril", false],
    ]);
  });

  it("conta unidades que so tem o remedio em combinacao", async () => {
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "hidroclorotiazida",
      statusDisponibilidade: "sem_registro_estoque",
      quantidadeApresentacoesCombinacaoComEstoque: 2,
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1002",
      codigoPrincipioAtivo: "hidroclorotiazida",
      statusDisponibilidade: "sem_registro_estoque",
    });
    const [sentinela] = (await getFarmaciaSentinelas(PORTAL_A)).sentinelas;
    expect(sentinela.unidadesComRegistro).toBe(0);
    expect(sentinela.unidadesSomenteCombinacao).toBe(1);
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

  it("decide na leitura se o lote ja venceu, mesmo com o mart construido dias antes", async () => {
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
      possuiLoteSemValidade: false,
      dataValidadeMaisTardia: dataRelativa(2),
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1002",
      codigoPrincipioAtivo: "dipirona",
      possuiLoteSemValidade: false,
      dataValidadeMaisTardia: dataRelativa(-2),
    });
    const [dipirona] = (await getFarmaciaSentinelas(PORTAL_A)).sentinelas;
    expect(dipirona).toMatchObject({
      unidadesComRegistro: 1,
      unidadesSomenteLoteVencido: 1,
    });
  });

  it("portal sem linhas ou slug inválido devolve vazio", async () => {
    expect(await getFarmaciaSentinelas(PORTAL_A)).toEqual({
      totalUnidadesAtivas: 0,
      indicadores: {
        totalEssenciais: 0,
        essenciaisNoEstoque: 0,
        essenciaisSomenteLoteVencido: 0,
        essenciaisSomenteCombinacao: 0,
        essenciaisSemRegistro: 0,
      },
      sentinelas: [],
    });
    expect((await getFarmaciaSentinelas("  ")).sentinelas).toEqual([]);
  });

  it("calcula indicadores dos essenciais sem assumir numero de unidades", async () => {
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "dipirona",
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "hidroclorotiazida",
      statusDisponibilidade: "sem_registro_estoque",
      quantidadeApresentacoesCombinacaoComEstoque: 2,
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "losartana",
      statusDisponibilidade: "sem_registro_estoque",
    });
    await seedFarmaciaSentinela({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      codigoPrincipioAtivo: "captopril",
      possuiLoteSemValidade: false,
      dataValidadeMaisTardia: dataRelativa(-3),
    });
    const resultado = await getFarmaciaSentinelas(PORTAL_A);
    expect(resultado.totalUnidadesAtivas).toBe(1);
    expect(
      resultado.sentinelas.find((s) => s.codigoPrincipioAtivo === "captopril"),
    ).toMatchObject({ unidadesComRegistro: 0, unidadesSomenteLoteVencido: 1 });
    expect(resultado.indicadores).toEqual({
      totalEssenciais: 4,
      essenciaisNoEstoque: 1,
      essenciaisSomenteLoteVencido: 1,
      essenciaisSomenteCombinacao: 1,
      essenciaisSemRegistro: 1,
    });
  });

  it("calcularIndicadoresFarmacia devolve zeros para lista vazia", () => {
    expect(calcularIndicadoresFarmacia([])).toEqual({
      totalEssenciais: 0,
      essenciaisNoEstoque: 0,
      essenciaisSomenteLoteVencido: 0,
      essenciaisSomenteCombinacao: 0,
      essenciaisSemRegistro: 0,
    });
  });
});

describe("getFarmaciaSus com lotes vencidos", () => {
  const lote = ({
    idRegistro,
    codigoCnes,
    nomeMedicamento,
    quantidadeEstoque,
    dataValidade,
    portalSlug = PORTAL_A,
  }: {
    idRegistro: string;
    codigoCnes: string;
    nomeMedicamento: string;
    quantidadeEstoque: number;
    dataValidade: string | null;
    portalSlug?: string;
  }) =>
    seedFarmacia({
      portalSlug,
      idRegistro,
      statusConformidade: "conforme",
      dataColeta: "2026-10-20",
      dataPosicaoMaisRecente: "2026-10-18",
      diasDesdePosicaoMaisRecente: 2,
      codigoCnes,
      nomeUnidade: `UBS ${codigoCnes}`,
      nomeMedicamento,
      quantidadeEstoque,
      dataPosicaoEstoque: "2026-10-18",
      dataValidade,
    });

  it("soma so lotes utilizaveis por unidade e nao lista unidade so com lote vencido", async () => {
    await Promise.all([
      lote({
        idRegistro: "1",
        codigoCnes: "1001",
        nomeMedicamento: "Dipirona 500mg",
        quantidadeEstoque: 5,
        dataValidade: dataRelativa(-3),
      }),
      lote({
        idRegistro: "2",
        codigoCnes: "1001",
        nomeMedicamento: "Dipirona 500mg",
        quantidadeEstoque: 7,
        dataValidade: dataRelativa(120),
      }),
      lote({
        idRegistro: "3",
        codigoCnes: "1002",
        nomeMedicamento: "Dipirona 500mg",
        quantidadeEstoque: 40,
        dataValidade: dataRelativa(-1),
      }),
      lote({
        idRegistro: "4",
        codigoCnes: "1002",
        nomeMedicamento: "Amoxicilina",
        quantidadeEstoque: 3,
        dataValidade: null,
      }),
    ]);

    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "dipirona" });
    expect(resultado.unidades.map((u) => u.idUnidade)).toEqual(["1001"]);
    expect(resultado.totalQuantidadeEstoque).toBe(7);
    expect(resultado.remedios[0]).toMatchObject({
      nomeMedicamento: "Dipirona 500mg",
      totalQuantidadeEstoque: 7,
      totalUnidadesComEstoque: 1,
    });
    expect(resultado.medicamentosSemLoteValido).toEqual([]);
  });

  it("lista o remedio que so tem lotes vencidos, sem unidades, isolado por portal", async () => {
    await Promise.all([
      lote({
        idRegistro: "1",
        codigoCnes: "1001",
        nomeMedicamento: "Captopril 25mg",
        quantidadeEstoque: 5,
        dataValidade: dataRelativa(-3),
      }),
      lote({
        idRegistro: "2",
        codigoCnes: "1002",
        nomeMedicamento: "Captopril 25mg",
        quantidadeEstoque: 9,
        dataValidade: dataRelativa(-30),
      }),
      lote({
        idRegistro: "3",
        codigoCnes: "1001",
        nomeMedicamento: "Captopril 50mg",
        quantidadeEstoque: 2,
        dataValidade: dataRelativa(60),
      }),
      lote({
        idRegistro: "4",
        codigoCnes: "1001",
        nomeMedicamento: "Captopril 25mg",
        quantidadeEstoque: 9,
        dataValidade: dataRelativa(60),
        portalSlug: PORTAL_B,
      }),
    ]);

    const resultado = await getFarmaciaSus(PORTAL_A, { busca: "captopril" });
    expect(resultado.medicamentosSemLoteValido).toEqual(["Captopril 25mg"]);
    expect(resultado.remedios.map((r) => r.nomeMedicamento)).toEqual([
      "Captopril 50mg",
    ]);

    const soVencido = await getFarmaciaSus(PORTAL_A, { busca: "captopril 25" });
    expect(soVencido.unidades).toEqual([]);
    expect(soVencido.medicamentosSemLoteValido).toEqual(["Captopril 25mg"]);
  });

  it("lote sem saldo nao conta como utilizavel e busca, indice e lotes a vencer concordam", async () => {
    await Promise.all([
      lote({
        idRegistro: "1",
        codigoCnes: "1001",
        nomeMedicamento: "Enalapril 10mg",
        quantidadeEstoque: 0,
        dataValidade: dataRelativa(60),
      }),
      lote({
        idRegistro: "2",
        codigoCnes: "1001",
        nomeMedicamento: "Enalapril 10mg",
        quantidadeEstoque: 5,
        dataValidade: dataRelativa(-3),
      }),
      lote({
        idRegistro: "3",
        codigoCnes: "1002",
        nomeMedicamento: "Enalapril 20mg",
        quantidadeEstoque: 0,
        dataValidade: dataRelativa(-3),
      }),
    ]);

    const busca = await getFarmaciaSus(PORTAL_A, { busca: "enalapril" });
    expect(busca.medicamentosSemLoteValido).toEqual(["Enalapril 10mg"]);
    expect(busca.unidades).toEqual([]);

    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, { letra: "E" });
    const porNome = new Map(
      (indice.letras[0]?.medicamentos ?? []).map((m) => [m.nomeMedicamento, m]),
    );
    expect(porNome.get("Enalapril 10mg")).toMatchObject({
      situacaoValidade: "somente_vencido",
      unidadesComEstoque: 0,
    });
    expect(porNome.get("Enalapril 20mg")).toMatchObject({
      situacaoValidade: "com_lote_valido",
      unidadesComEstoque: 0,
    });

    const lotes = await getFarmaciaLotesAVencer(PORTAL_A);
    expect(lotes?.totalRemediosSomenteVencidos).toBe(1);
  });

  it("com filtro de unidade nao calcula remedios sem lote valido", async () => {
    await lote({
      idRegistro: "1",
      codigoCnes: "1001",
      nomeMedicamento: "Captopril 25mg",
      quantidadeEstoque: 5,
      dataValidade: dataRelativa(-3),
    });
    const resultado = await getFarmaciaSus(PORTAL_A, {
      busca: "captopril",
      idUnidade: "1001",
    });
    expect(resultado.medicamentosSemLoteValido).toEqual([]);
  });
});

function dataRelativa(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

describe("getFarmaciaLotesAVencer", () => {
  const baseMart = {
    statusConformidade: "conforme",
    dataColeta: dataRelativa(0),
    dataPosicaoMaisRecente: dataRelativa(-1),
    diasDesdePosicaoMaisRecente: 1,
  };
  const lote = ({
    portalSlug,
    idRegistro,
    nomeMedicamento,
    dataValidade,
    codigoCnes = "1001",
    quantidadeEstoque = 1,
  }: {
    portalSlug: string;
    idRegistro: string;
    nomeMedicamento: string;
    dataValidade: string | null;
    codigoCnes?: string;
    quantidadeEstoque?: number;
  }) =>
    seedFarmacia({
      ...baseMart,
      portalSlug,
      idRegistro,
      codigoCnes,
      nomeUnidade: `UBS ${codigoCnes}`,
      nomeMedicamento,
      quantidadeEstoque,
      dataPosicaoEstoque: dataRelativa(-1),
      dataValidade,
    });

  it("omite o card quando nenhum lote tem validade", async () => {
    await lote({
      portalSlug: PORTAL_A,
      idRegistro: "h1",
      nomeMedicamento: "Dipirona",
      dataValidade: null,
    });
    const resultado = await getFarmaciaLotesAVencer(PORTAL_A);
    expect(resultado.totalLotesComValidade).toBe(0);
    expect(resultado.totalLotesAVencer).toBe(0);
    expect(resultado.dataVencimentoMaisProxima).toBeNull();
  });

  it("conta lotes na janela, remedios distintos e o vencimento mais proximo", async () => {
    await Promise.all([
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "h1",
        nomeMedicamento: "Dipirona",
        dataValidade: dataRelativa(20),
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "h2",
        nomeMedicamento: "DIPIRONA",
        dataValidade: dataRelativa(10),
        codigoCnes: "1002",
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "h3",
        nomeMedicamento: "Amoxicilina",
        dataValidade: dataRelativa(FARMACIA_JANELA_LOTES_A_VENCER_DIAS + 30),
      }),
      // outro portal não contamina
      lote({
        portalSlug: PORTAL_B,
        idRegistro: "h5",
        nomeMedicamento: "Dipirona",
        dataValidade: dataRelativa(3),
      }),
    ]);

    const resultado = await getFarmaciaLotesAVencer(PORTAL_A);
    expect(resultado).toEqual({
      janelaDias: FARMACIA_JANELA_LOTES_A_VENCER_DIAS,
      totalLotesComValidade: 3,
      totalLotesAVencer: 2,
      totalRemediosAVencer: 1,
      totalLotesVencidosComSaldo: 0,
      totalRemediosSomenteVencidos: 0,
      totalLotesRemediosSomenteVencidos: 0,
      dataVencimentoMaisProxima: dataRelativa(10),
    });
  });

  it("separa remedios so com lotes vencidos dos que tem lote utilizavel, por portal", async () => {
    await Promise.all([
      // só vencido: dois lotes, grafias que diferem na caixa e nos espaços
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "s1",
        nomeMedicamento: "Dipirona",
        dataValidade: dataRelativa(-5),
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "s2",
        nomeMedicamento: " DIPIRONA ",
        dataValidade: dataRelativa(-9),
        codigoCnes: "1002",
      }),
      // misto: lote vencido + lote válido em outra unidade
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "m1",
        nomeMedicamento: "Amoxicilina",
        dataValidade: dataRelativa(-2),
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "m2",
        nomeMedicamento: "Amoxicilina",
        dataValidade: dataRelativa(200),
        codigoCnes: "1002",
      }),
      // lote sem validade conta como utilizável
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "n1",
        nomeMedicamento: "Losartana",
        dataValidade: dataRelativa(-2),
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "n2",
        nomeMedicamento: "Losartana",
        dataValidade: null,
      }),
      // só vencido em um único lote
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "s3",
        nomeMedicamento: "Atenolol",
        dataValidade: dataRelativa(-1),
      }),
      // outro portal com o mesmo nome não contamina
      lote({
        portalSlug: PORTAL_B,
        idRegistro: "o1",
        nomeMedicamento: "Dipirona",
        dataValidade: dataRelativa(30),
      }),
    ]);

    const resultado = await getFarmaciaLotesAVencer(PORTAL_A);
    expect(resultado.totalRemediosSomenteVencidos).toBe(2);
    expect(resultado.totalLotesRemediosSomenteVencidos).toBe(3);
    expect(resultado.totalLotesVencidosComSaldo).toBe(5);
  });

  it("conta lotes ja vencidos com saldo e ignora vencidos sem saldo", async () => {
    await Promise.all([
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "v1",
        nomeMedicamento: "Dipirona",
        dataValidade: dataRelativa(-5),
      }),
      lote({
        portalSlug: PORTAL_A,
        idRegistro: "v2",
        nomeMedicamento: "Amoxicilina",
        dataValidade: dataRelativa(-3),
        quantidadeEstoque: 0,
      }),
    ]);
    const resultado = await getFarmaciaLotesAVencer(PORTAL_A);
    expect(resultado.totalLotesComValidade).toBe(1);
    expect(resultado.totalLotesVencidosComSaldo).toBe(1);
    expect(resultado.totalLotesAVencer).toBe(0);
    expect(resultado.dataVencimentoMaisProxima).toBeNull();
  });

  it("retorna vazio para portal invalido", async () => {
    expect((await getFarmaciaLotesAVencer("  ")).totalLotesComValidade).toBe(0);
  });
});

describe("getFarmaciaEstoqueExportRecords", () => {
  const posicao = "2026-10-18";

  async function seedHistorico(portalSlug: string) {
    const base = { portalSlug, dataPosicaoEstoque: posicao };
    await seedFarmaciaHistorico({
      ...base,
      idRegistro: "e1",
      codigoCnes: "1001",
      nomeMedicamento: "Dipirona",
      numeroLote: "B",
      quantidadeEstoque: 5,
      dataValidade: "2027-01-31",
    });
    await seedFarmaciaHistorico({
      ...base,
      idRegistro: "e2",
      codigoCnes: "1001",
      nomeMedicamento: "Dipirona",
      numeroLote: "A",
    });
    await seedFarmaciaHistorico({
      ...base,
      idRegistro: "e3",
      codigoCnes: "1002",
      nomeMedicamento: "Amoxicilina",
    });
    // posicao antiga da mesma unidade: nao entra
    await seedFarmaciaHistorico({
      portalSlug,
      idRegistro: "e4",
      codigoCnes: "1001",
      nomeMedicamento: "Antigo",
      dataPosicaoEstoque: "2026-10-01",
    });
    // unidade inativa (fora do mart): nao entra
    await seedFarmaciaHistorico({
      ...base,
      idRegistro: "e5",
      codigoCnes: "9999",
      nomeMedicamento: "Inativa",
    });
  }

  it("retorna vazio para slug invalido ou portal fora de conforme", async () => {
    expect(await getFarmaciaEstoqueExportRecords("  ")).toEqual([]);
    await seedFarmacia({
      portalSlug: PORTAL_A,
      idRegistro: "status",
      statusConformidade: "apagao",
    });
    await seedHistorico(PORTAL_A);
    expect(await getFarmaciaEstoqueExportRecords(PORTAL_A)).toEqual([]);
  });

  it("traz so a posicao vigente das unidades ativas, ordenada, com validade preenchida e nula", async () => {
    await seedPortalConforme(PORTAL_A);
    await seedHistorico(PORTAL_A);
    const resultado = await getFarmaciaEstoqueExportRecords(PORTAL_A);
    expect(
      resultado.map((r) => [r.nomeUnidade, r.nomeMedicamento, r.numeroLote]),
    ).toEqual([
      ["UBS Centro", "Dipirona", "A"],
      ["UBS Centro", "Dipirona", "B"],
      ["UBS Norte", "Amoxicilina", null],
    ]);
    expect(resultado[0]).toMatchObject({
      portalSlug: PORTAL_A,
      codigoCnes: "1001",
      dataPosicaoEstoque: posicao,
      dataValidade: null,
    });
    expect(resultado[1]).toMatchObject({
      quantidadeEstoque: 5,
      dataValidade: "2027-01-31",
    });
  });

  it("isola os portais mesmo com o mesmo CNES", async () => {
    await seedPortalConforme(PORTAL_A);
    await seedPortalConforme(PORTAL_B);
    await seedHistorico(PORTAL_A);
    await seedFarmaciaHistorico({
      portalSlug: PORTAL_B,
      idRegistro: "b1",
      codigoCnes: "1001",
      nomeMedicamento: "So do B",
      dataPosicaoEstoque: posicao,
    });
    const b = await getFarmaciaEstoqueExportRecords(PORTAL_B);
    expect(b.map((r) => r.nomeMedicamento)).toEqual(["So do B"]);
    expect(b.every((r) => r.portalSlug === PORTAL_B)).toBe(true);
  });
});

const SEM_LOTE_VENCIDO = { situacaoValidade: "com_lote_valido" } as const;

describe("getFarmaciaIndiceAlfabetico", () => {
  const base = {
    statusConformidade: "conforme",
    dataColeta: "2026-10-20",
    dataPosicaoMaisRecente: "2026-10-18",
    diasDesdePosicaoMaisRecente: 2,
  };

  async function seedIndice(portalSlug: string) {
    const itens: [string, string, string][] = [
      ["1", "1001", "Ácido fólico 5mg"],
      ["2", "1001", "Amoxicilina"],
      ["3", "1002", "Amoxicilina"],
      ["4", "1001", "Atenolol 50mg"],
      ["5", "1002", "Azitromicina 500mg"],
      ["6", "1001", "Bromexina"],
      ["7", "1002", "  dipirona   sódica "],
      ["8", "1001", "500 mg soro"],
    ];
    await Promise.all(
      itens.map(([idRegistro, codigoCnes, nomeMedicamento]) =>
        seedFarmacia({
          ...base,
          portalSlug,
          idRegistro,
          codigoCnes,
          nomeUnidade: `UBS ${codigoCnes}`,
          nomeMedicamento,
          quantidadeEstoque: 10,
          dataPosicaoEstoque: "2026-10-18",
        }),
      ),
    );
  }

  it("trata nomes que diferem so na caixa como o mesmo remedio", async () => {
    await Promise.all(
      [
        ["1", "1001", "AMOXICILINA"],
        ["2", "1002", "Amoxicilina"],
      ].map(([idRegistro, codigoCnes, nomeMedicamento]) =>
        seedFarmacia({
          ...base,
          portalSlug: PORTAL_A,
          idRegistro,
          codigoCnes,
          nomeUnidade: `UBS ${codigoCnes}`,
          nomeMedicamento,
          quantidadeEstoque: 10,
          dataPosicaoEstoque: "2026-10-18",
        }),
      ),
    );
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, { letra: "A" });
    expect(indice.letras[0]?.totalMedicamentos).toBe(1);
    expect(indice.letras[0]?.medicamentos).toHaveLength(1);
    expect(indice.letras[0]?.medicamentos[0]?.unidadesComEstoque).toBe(2);
  });

  it("lista as letras disponiveis e limita letras e itens por letra, ordenando sem acento", async () => {
    await seedIndice(PORTAL_A);
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, {
      limiteLetras: 2,
      limiteMedicamentosPorLetra: 3,
    });
    expect(indice.status).toBe("conforme");
    expect(indice.letrasDisponiveis).toEqual(["A", "B", "D", "0-9"]);
    expect(indice.totalLetras).toBe(4);
    expect(indice.letras.map((l) => l.letra)).toEqual(["A", "B"]);
    expect(indice.letras[0]).toEqual({
      letra: "A",
      totalMedicamentos: 4,
      medicamentos: [
        {
          nomeMedicamento: "Ácido fólico 5mg",
          unidadesComEstoque: 1,
          ...SEM_LOTE_VENCIDO,
        },
        {
          nomeMedicamento: "Amoxicilina",
          unidadesComEstoque: 2,
          ...SEM_LOTE_VENCIDO,
        },
        {
          nomeMedicamento: "Atenolol 50mg",
          unidadesComEstoque: 1,
          ...SEM_LOTE_VENCIDO,
        },
      ],
    });
  });

  it("devolve so a letra pedida, sem diferenciar caixa, com o total de unidades do portal", async () => {
    await seedIndice(PORTAL_A);
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, {
      letra: "a",
      limiteMedicamentosPorLetra: 25,
    });
    expect(indice.letras).toHaveLength(1);
    expect(indice.letras[0].medicamentos.map((m) => m.nomeMedicamento)).toEqual(
      [
        "Ácido fólico 5mg",
        "Amoxicilina",
        "Atenolol 50mg",
        "Azitromicina 500mg",
      ],
    );
    expect(indice.totalUnidades).toBe(2);
    expect(indice.letrasDisponiveis).toEqual(["A", "B", "D", "0-9"]);
  });

  it("normaliza espacos do nome", async () => {
    await seedIndice(PORTAL_A);
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, { letra: "D" });
    expect(indice.letras[0].medicamentos).toEqual([
      {
        nomeMedicamento: "dipirona sódica",
        unidadesComEstoque: 1,
        ...SEM_LOTE_VENCIDO,
      },
    ]);
  });

  it("agrupa nomes que nao comecam com letra em 0-9, depois do Z", async () => {
    await seedIndice(PORTAL_A);
    await seedFarmacia({
      ...base,
      portalSlug: PORTAL_A,
      idRegistro: "10",
      codigoCnes: "1002",
      nomeUnidade: "UBS 1002",
      nomeMedicamento: "(+) simbolo",
      quantidadeEstoque: 1,
      dataPosicaoEstoque: "2026-10-18",
    });
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, {
      letra: "0-9",
    });
    expect(indice.letrasDisponiveis.at(-1)).toBe("0-9");
    expect(indice.letras).toEqual([
      {
        letra: "0-9",
        totalMedicamentos: 2,
        medicamentos: [
          {
            nomeMedicamento: "(+) simbolo",
            unidadesComEstoque: 1,
            ...SEM_LOTE_VENCIDO,
          },
          {
            nomeMedicamento: "500 mg soro",
            unidadesComEstoque: 1,
            ...SEM_LOTE_VENCIDO,
          },
        ],
      },
    ]);
  });

  it("conta so unidades com lote utilizavel e marca o remedio so com lotes vencidos", async () => {
    const lote = ({
      idRegistro,
      codigoCnes,
      nomeMedicamento,
      dataValidade,
    }: {
      idRegistro: string;
      codigoCnes: string;
      nomeMedicamento: string;
      dataValidade: string | null;
    }) =>
      seedFarmacia({
        ...base,
        portalSlug: PORTAL_A,
        idRegistro,
        codigoCnes,
        nomeUnidade: `UBS ${codigoCnes}`,
        nomeMedicamento,
        quantidadeEstoque: 10,
        dataPosicaoEstoque: "2026-10-18",
        dataValidade,
      });
    await Promise.all([
      lote({
        idRegistro: "1",
        codigoCnes: "1001",
        nomeMedicamento: "AMOXICILINA",
        dataValidade: dataRelativa(-5),
      }),
      lote({
        idRegistro: "2",
        codigoCnes: "1002",
        nomeMedicamento: "Amoxicilina",
        dataValidade: dataRelativa(-8),
      }),
      lote({
        idRegistro: "3",
        codigoCnes: "1001",
        nomeMedicamento: "Atenolol",
        dataValidade: dataRelativa(-3),
      }),
      lote({
        idRegistro: "4",
        codigoCnes: "1002",
        nomeMedicamento: "Atenolol",
        dataValidade: dataRelativa(90),
      }),
      lote({
        idRegistro: "5",
        codigoCnes: "1001",
        nomeMedicamento: "Azitromicina",
        dataValidade: null,
      }),
    ]);

    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A, { letra: "A" });
    const porNome = new Map(
      (indice.letras[0]?.medicamentos ?? []).map((m) => [m.nomeMedicamento, m]),
    );
    expect(indice.letras[0]?.totalMedicamentos).toBe(3);
    expect(porNome.get("AMOXICILINA")).toMatchObject({
      situacaoValidade: "somente_vencido",
      unidadesComEstoque: 0,
    });
    expect(porNome.get("Atenolol")).toMatchObject({
      situacaoValidade: "com_lote_valido",
      unidadesComEstoque: 1,
    });
    expect(porNome.get("Azitromicina")).toMatchObject({
      situacaoValidade: "com_lote_valido",
      unidadesComEstoque: 1,
    });
    // unidade que só tem lote vencido continua ativa: o total mede frescor da lista
    expect(indice.totalUnidades).toBe(2);
  });

  it("sem nomes fora de A-Z nao cria o grupo 0-9", async () => {
    await seedFarmacia({
      ...base,
      portalSlug: PORTAL_A,
      idRegistro: "1",
      codigoCnes: "1001",
      nomeUnidade: "UBS 1001",
      nomeMedicamento: "Amoxicilina",
      quantidadeEstoque: 1,
      dataPosicaoEstoque: "2026-10-18",
    });
    const indice = await getFarmaciaIndiceAlfabetico(PORTAL_A);
    expect(indice.letrasDisponiveis).toEqual(["A"]);
    expect(
      (await getFarmaciaIndiceAlfabetico(PORTAL_A, { letra: "0-9" })).letras,
    ).toEqual([]);
  });

  it("letra invalida ou sem itens devolve lista vazia mantendo as letras disponiveis", async () => {
    await seedIndice(PORTAL_A);
    const semItens = await getFarmaciaIndiceAlfabetico(PORTAL_A, {
      letra: "W",
    });
    expect(semItens.letras).toEqual([]);
    expect(semItens.letrasDisponiveis).toEqual(["A", "B", "D", "0-9"]);
    const invalida = await getFarmaciaIndiceAlfabetico(PORTAL_A, {
      letra: "1%",
    });
    expect(invalida.letras).toEqual([]);
  });

  it("nao cruza dados entre portais", async () => {
    await seedIndice(PORTAL_A);
    await seedFarmacia({
      ...base,
      portalSlug: PORTAL_B,
      idRegistro: "9",
      codigoCnes: "1001",
      nomeUnidade: "UBS Outra",
      nomeMedicamento: "Zinco",
      quantidadeEstoque: 3,
      dataPosicaoEstoque: "2026-10-18",
    });
    const a = await getFarmaciaIndiceAlfabetico(PORTAL_A);
    const b = await getFarmaciaIndiceAlfabetico(PORTAL_B);
    expect(a.letrasDisponiveis).not.toContain("Z");
    expect(b.letrasDisponiveis).toEqual(["Z"]);
    expect(b.totalUnidades).toBe(1);
  });

  it("slug invalido ou portal fora de conforme devolve vazio", async () => {
    expect((await getFarmaciaIndiceAlfabetico("  ")).letras).toEqual([]);
    await seedFarmacia({
      portalSlug: PORTAL_A,
      idRegistro: "status",
      statusConformidade: "apagao",
      dataPosicaoMaisRecente: "2026-09-01",
      diasDesdePosicaoMaisRecente: 49,
    });
    const apagao = await getFarmaciaIndiceAlfabetico(PORTAL_A);
    expect(apagao).toMatchObject({
      status: "apagao",
      letrasDisponiveis: [],
      letras: [],
      totalLetras: 0,
    });
  });
});
