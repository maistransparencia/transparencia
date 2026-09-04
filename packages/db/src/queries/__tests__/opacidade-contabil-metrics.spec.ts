import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedOpacidadeCredor,
  seedOpacidadeElemento,
  seedOpacidadeMetricas,
} from "../../../tests/fixtures/seed";
import { db } from "../../client";
import { getOpacidadeContabilMetrics } from "../opacidade-contabil-metrics";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("getOpacidadeContabilMetrics", () => {
  it("retorna null quando não há registros para o portal", async () => {
    const result = await getOpacidadeContabilMetrics(PORTAL, 2025);
    expect(result).toBeNull();
  });

  it("retorna null quando a relação de origem não existe no banco", async () => {
    const spy = vi.spyOn(db, "selectFrom").mockImplementation(() => {
      throw new Error(
        'relation "fct_opacidade_contabil_metricas" does not exist',
      );
    });

    try {
      const result = await getOpacidadeContabilMetrics(PORTAL, 2025);
      expect(result).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("retorna métricas completas do exercício, histórico, credores e bases legais", async () => {
    // Semeia histórico de 2024 e 2025
    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano: 2024,
      totalEmpenhos: 100,
      empenhosResidual99: 20,
      empenhosDesvioSensivel99: 5,
      taxaEmpenhosOpacidadePct: 20.0,
      totalPago: 100000,
      pagoResidual99: 20000,
      pagoDesvioSensivel99: 5000,
      taxaValorOpacidadePct: 20.0,
      taxaDesvioSensivelPct: 25.0,
      classificacaoRisco: "atencao",
    });

    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano: 2025,
      totalEmpenhos: 200,
      empenhosResidual99: 80,
      empenhosDesvioSensivel99: 40,
      taxaEmpenhosOpacidadePct: 40.0,
      totalPago: 200000,
      pagoResidual99: 80000,
      pagoDesvioSensivel99: 40000,
      taxaValorOpacidadePct: 40.0,
      taxaDesvioSensivelPct: 50.0,
      classificacaoRisco: "critico",
    });

    // Semeia Top Credores para 2025
    await seedOpacidadeCredor({
      portalSlug: PORTAL,
      ano: 2025,
      credorCodigo: "11.111.111/0001-11",
      credorNome: "CONSORCIO DE SAUDE",
      totalEmpenhos: 10,
      totalPago: 50000,
      pagoDesvioSensivel: 50000,
      categoriaPredominante: "locacao_maquinas_veiculos",
      amostraObjeto: "RATEIO DE SERVICOS",
      ranking: 1,
    });

    await seedOpacidadeCredor({
      portalSlug: PORTAL,
      ano: 2025,
      credorCodigo: "22.222.222/0001-22",
      credorNome: "EMPRESA DE EVENTOS",
      totalEmpenhos: 5,
      totalPago: 30000,
      pagoDesvioSensivel: 30000,
      categoriaPredominante: "eventos_festas",
      amostraObjeto: "PALCOS E SHOWS",
      ranking: 2,
    });

    const result = await getOpacidadeContabilMetrics(PORTAL, 2025);

    expect(result).not.toBeNull();
    expect(result?.portalSlug).toBe(PORTAL);
    expect(result?.ano).toBe(2025);

    // Exercício atual
    expect(result?.exercicioAtual).toEqual({
      portalSlug: PORTAL,
      ano: 2025,
      totalEmpenhos: 200,
      empenhosResidual99: 80,
      empenhosDesvioSensivel99: 40,
      taxaEmpenhosOpacidadePct: 40.0,
      totalPago: 200000,
      pagoResidual99: 80000,
      pagoDesvioSensivel99: 40000,
      taxaValorOpacidadePct: 40.0,
      taxaDesvioSensivelPct: 50.0,
      classificacaoRisco: "critico",
    });

    // Histórico (ordenado asc)
    expect(result?.historico).toHaveLength(2);
    expect(result?.historico[0].ano).toBe(2024);
    expect(result?.historico[1].ano).toBe(2025);

    // Top Credores
    expect(result?.topCredores).toHaveLength(2);
    expect(result?.topCredores[0]).toEqual({
      credorCodigo: "11.111.111/0001-11",
      credorNome: "CONSORCIO DE SAUDE",
      totalEmpenhos: 10,
      totalPago: 50000,
      pagoDesvioSensivel: 50000,
      categoriaPredominante: "locacao_maquinas_veiculos",
      amostraObjeto: "RATEIO DE SERVICOS",
      ranking: 1,
    });
    expect(result?.topCredores[1].ranking).toBe(2);

    // Limiares fiscais
    expect(result?.limiares.limiteAtencaoPct).toBe(15.0);
    expect(result?.limiares.limiteCriticoPct).toBe(30.0);

    // Bases legais
    expect(result?.basesLegais.length).toBeGreaterThan(0);
    const lei4320 = result?.basesLegais.find(
      (b) =>
        b.chave.includes("especificacao_orcamentaria") ||
        b.baseLegal.includes("4.320"),
    );
    expect(lei4320).toBeDefined();
    expect(lei4320?.urlBaseLegal).toContain("planalto.gov.br");
  });

  it("retorna o ano mais recente como exercicioAtual caso o ano solicitado não exista no histórico", async () => {
    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano: 2024,
      totalEmpenhos: 50,
      taxaValorOpacidadePct: 10.0,
      classificacaoRisco: "normal",
    });

    const result = await getOpacidadeContabilMetrics(PORTAL, 2029);

    expect(result).not.toBeNull();
    expect(result?.exercicioAtual.ano).toBe(2024);
    expect(result?.historico).toHaveLength(1);
  });

  it("suporta e tipa corretamente todas as novas categorias sugeridas do objeto", async () => {
    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano: 2025,
      totalEmpenhos: 70,
      classificacaoRisco: "normal",
    });

    const categoriasParaTestar = [
      {
        cod: "01",
        nome: "CODESP CONSORCIO",
        cat: "consorcios_publicos",
        obj: "RATEIO DE SAUDE",
      },
      {
        cod: "02",
        nome: "COOPERATIVA LIMPEZA",
        cat: "limpeza_residuos",
        obj: "COLETA DE LIXO E CACAMBAS",
      },
      {
        cod: "03",
        nome: "INSTITUTO DE OLHOS",
        cat: "plantoes_medicos",
        obj: "CONSULTAS E PLANTOES",
      },
      {
        cod: "04",
        nome: "TRIBUNAL REGIONAL",
        cat: "bloqueios_sentencas",
        obj: "BLOQUEIO JUDICIAL",
      },
      {
        cod: "05",
        nome: "EMPRESA TERCEIRIZADA",
        cat: "terceirizacao_mao_obra",
        obj: "SERVICOS DE PORTARIA",
      },
      {
        cod: "06",
        nome: "INSTITUTO PREVIDENCIA",
        cat: "previdencia",
        obj: "REPASSE PATRONAL",
      },
      {
        cod: "07",
        nome: "AUDITORIA E CONSULTORIA",
        cat: "consultoria_tecnica",
        obj: "ASSESSORIA CONTABIL",
      },
      {
        cod: "08",
        nome: "PURE AIR EQUIPAMENTOS",
        cat: "locacao_equipamentos_saude",
        obj: "LOCACAO DE USINA DE GASES",
      },
      {
        cod: "09",
        nome: "VITTALIS ASSISTENCIA",
        cat: "assistencia_domiciliar_home_care",
        obj: "SERVICO DE HOME CARE",
      },
      {
        cod: "10",
        nome: "AUTO PECAS DO VALE",
        cat: "pecas_manutencao_frota",
        obj: "PECAS PARA VEICULOS",
      },
      {
        cod: "11",
        nome: "BENEFICIARIO EVENTUAL",
        cat: "aluguel_social",
        obj: "BENEFICIO DE ALUGUEL SOCIAL",
      },
    ];

    for (let i = 0; i < categoriasParaTestar.length; i++) {
      const item = categoriasParaTestar[i];
      await seedOpacidadeCredor({
        portalSlug: PORTAL,
        ano: 2025,
        credorCodigo: item.cod,
        credorNome: item.nome,
        totalEmpenhos: 1,
        totalPago: 1000 * (i + 1),
        pagoDesvioSensivel: 1000 * (i + 1),
        categoriaPredominante: item.cat,
        amostraObjeto: item.obj,
        ranking: i + 1,
      });
    }

    const result = await getOpacidadeContabilMetrics(PORTAL, 2025);

    expect(result).not.toBeNull();
    expect(result?.topCredores).toHaveLength(11);
    for (let i = 0; i < categoriasParaTestar.length; i++) {
      expect(result?.topCredores[i].categoriaPredominante).toBe(
        categoriasParaTestar[i].cat,
      );
      expect(result?.topCredores[i].amostraObjeto).toBe(
        categoriasParaTestar[i].obj,
      );
    }
  });

  it("retorna quebra de elementos pai com percentual e ranking", async () => {
    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano: 2025,
      totalEmpenhos: 100,
      empenhosResidual99: 50,
      empenhosDesvioSensivel99: 20,
      taxaEmpenhosOpacidadePct: 50.0,
      totalPago: 100000,
      pagoResidual99: 50000,
      pagoDesvioSensivel99: 20000,
      taxaValorOpacidadePct: 50.0,
      taxaDesvioSensivelPct: 40.0,
      classificacaoRisco: "critico",
    });

    await seedOpacidadeElemento({
      portalSlug: PORTAL,
      ano: 2025,
      elementoCodigo: "39",
      elementoDescricao: "Outros Serviços de Terceiros - Pessoa Jurídica",
      categoriaMacro: "Serviços de Terceiros",
      tipoResidual: "evitavel",
      totalEmpenhos: 30,
      totalPago: 35000,
      percentualDoResidual99: 70.0,
      ranking: 1,
    });

    await seedOpacidadeElemento({
      portalSlug: PORTAL,
      ano: 2025,
      elementoCodigo: "36",
      elementoDescricao: "Outros Serviços de Terceiros - Pessoa Física",
      categoriaMacro: "Serviços de Terceiros",
      tipoResidual: "evitavel",
      totalEmpenhos: 15,
      totalPago: 10000,
      percentualDoResidual99: 20.0,
      ranking: 2,
    });

    await seedOpacidadeElemento({
      portalSlug: PORTAL,
      ano: 2025,
      elementoCodigo: "91",
      elementoDescricao: "Sentenças Judiciais",
      categoriaMacro: "Sentenças",
      tipoResidual: "estrutural",
      totalEmpenhos: 5,
      totalPago: 5000,
      percentualDoResidual99: 10.0,
      ranking: 3,
    });

    const result = await getOpacidadeContabilMetrics(PORTAL, 2025);

    expect(result).not.toBeNull();
    expect(result?.elementosResidual99).toHaveLength(3);
    expect(result?.elementosResidual99[0]).toEqual({
      elementoCodigo: "39",
      elementoDescricao: "Outros Serviços de Terceiros - Pessoa Jurídica",
      categoriaMacro: "Serviços de Terceiros",
      tipoResidual: "evitavel",
      totalEmpenhos: 30,
      totalPago: 35000,
      percentualDoResidual99: 70.0,
      ranking: 1,
    });
    expect(result?.elementosResidual99[1].elementoCodigo).toBe("36");
    expect(result?.elementosResidual99[1].tipoResidual).toBe("evitavel");
    expect(result?.elementosResidual99[2].elementoCodigo).toBe("91");
    expect(result?.elementosResidual99[2].tipoResidual).toBe("estrutural");
  });
});
