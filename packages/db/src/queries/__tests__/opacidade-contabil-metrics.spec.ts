import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedOpacidadeCredor,
  seedOpacidadeMetricas,
} from "../../../tests/fixtures/seed";
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
});
