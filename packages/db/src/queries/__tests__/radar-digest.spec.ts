import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContratosServicosVigentes,
  seedDimOrgao,
  seedOpacidadeCredor,
  seedOpacidadeMetricas,
  seedPosicaoFiscal,
} from "../../../tests/fixtures/seed";
import { getRadarDigestMetrics } from "../radar-digest";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("getRadarDigestMetrics", () => {
  it("deve retornar null se não houver dados para o portal e ano especificados", async () => {
    const metrics = await getRadarDigestMetrics(PORTAL, 2030);
    expect(metrics).toBeNull();
  });

  it("deve agregar e retornar métricas completas do radar cívico para o portal e ano", async () => {
    const ano = 2030;

    // 1. Seed orgao
    await seedDimOrgao({
      portalSlug: PORTAL,
      empresaId: "1",
      orgaoNome: "Prefeitura Municipal",
    });

    // 2. Seed posicao fiscal
    await seedPosicaoFiscal({
      portalSlug: PORTAL,
      empresaId: "1",
      ano,
      totalArrecadado: 50000000,
      despesasPagas: 45000000,
      restosPagosNoAno: 2000000,
      saldoEstimado: 3000000,
    });

    // 3. Seed opacidade contabil
    await seedOpacidadeMetricas({
      portalSlug: PORTAL,
      ano,
      totalPago: 45000000,
      pagoResidual99: 9000000,
      pagoDesvioSensivel99: 3000000,
      taxaValorOpacidadePct: 20.0,
      classificacaoRisco: "atencao",
    });

    await seedOpacidadeCredor({
      portalSlug: PORTAL,
      ano,
      credorCodigo: "1001",
      credorNome: "Empresa de Coleta Ltda",
      totalPago: 2500000,
      categoriaPredominante: "limpeza_residuos",
      ranking: 1,
    });

    // 4. Seed contratos
    await seedContratosServicosVigentes({
      portalSlug: PORTAL,
      empresaId: "1",
      ano,
      contratoNumero: "010/2030",
      fornecedorNome: "Construtora Alfa",
      objetoDescricao: "Pavimentação Asfáltica",
      totalPago: 1800000,
      statusExecucao: "em_execucao",
    });

    await seedContratosServicosVigentes({
      portalSlug: PORTAL,
      empresaId: "1",
      ano,
      contratoNumero: "011/2030",
      fornecedorNome: "Tecnologia Beta",
      objetoDescricao: "Sistemas em Nuvem",
      totalPago: 600000,
      statusExecucao: "concluido",
    });

    const metrics = await getRadarDigestMetrics(PORTAL, ano);

    expect(metrics).not.toBeNull();
    expect(metrics?.portalSlug).toBe(PORTAL);
    expect(metrics?.ano).toBe(ano);

    // Posicao fiscal
    expect(metrics?.posicaoFiscal).toEqual({
      totalArrecadado: 50000000,
      despesasPagas: 45000000,
      restosPagosNoAno: 2000000,
      saldoEstimado: 3000000,
      restosPendentesTotal: 0,
      restosLiquidadosPendentes: 0,
    });

    // Opacidade
    expect(metrics?.opacidade).toEqual({
      taxaValorOpacidadePct: 20.0,
      classificacaoRisco: "atencao",
      pagoResidual99: 9000000,
      pagoDesvioSensivel99: 3000000,
      totalPago: 45000000,
    });

    // Destaques de Contratos (ordenados por totalPago desc)
    expect(metrics?.destaquesContratos).toHaveLength(2);
    expect(metrics?.destaquesContratos[0]).toEqual({
      fornecedorNome: "Construtora Alfa",
      objetoDescricao: "Pavimentação Asfáltica",
      totalPago: 1800000,
      statusExecucao: "em_execucao",
    });
    expect(metrics?.destaquesContratos[1]).toEqual({
      fornecedorNome: "Tecnologia Beta",
      objetoDescricao: "Sistemas em Nuvem",
      totalPago: 600000,
      statusExecucao: "concluido",
    });

    // Destaques de Credores de Opacidade
    expect(metrics?.destaquesCredoresOpacidade).toHaveLength(1);
    expect(metrics?.destaquesCredoresOpacidade[0]).toEqual({
      credorNome: "Empresa de Coleta Ltda",
      totalPago: 2500000,
      categoriaPredominante: "limpeza_residuos",
    });
  });
});
