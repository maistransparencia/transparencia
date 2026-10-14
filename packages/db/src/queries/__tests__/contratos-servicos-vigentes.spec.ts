import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContrato,
  seedContratosServicosVigentes,
  seedLicitacao,
} from "../../../tests/fixtures/seed";
import {
  getContratoByNumero,
  getContratosServicosVigentes,
} from "../contratos-servicos-vigentes";

const FIXTURE_PORTAL = createFixturePortalSlug();
const TEST_YEAR = 2026;

describe("contratos-servicos-vigentes", () => {
  beforeAll(async () => {
    await cleanupFixtures(FIXTURE_PORTAL);

    // Contrato base para listagem e consulta direta em 2026
    await seedContratosServicosVigentes({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      contratoNumero: "0010/26",
      fornecedorNome: "EMPRESA TESTE SERVICOS LTDA",
      fornecedorCnpj: "12.345.678/0001-90",
      objetoDescricao: "Prestação de serviços contínuos de informática",
      dataInicio: "2026-01-01",
      vencimentoAtual: "2026-12-31",
      totalEmpenhado: 100000,
      totalLiquidado: 60000,
      totalPago: 50000,
      statusExecucao: "em_execucao",
    });

    // Contrato plurianual em 2024 e 2025, ausente em 2026
    await seedContratosServicosVigentes({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "2",
      ano: 2024,
      contratoNumero: "2939/24",
      fornecedorNome: "ENGTEC ENGENHARIA LTDA",
      fornecedorCnpj: "38.226.796/0001-78",
      objetoDescricao: "Reforma e manutenção predial",
      dataInicio: "2024-05-10",
      vencimentoAtual: "2025-12-31",
      totalEmpenhado: 0,
      totalLiquidado: 0,
      totalPago: 0,
      statusExecucao: "em_execucao",
    });

    await seedContratosServicosVigentes({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "2",
      ano: 2025,
      contratoNumero: "2939/24",
      fornecedorNome: "ENGTEC ENGENHARIA LTDA",
      fornecedorCnpj: "38.226.796/0001-78",
      objetoDescricao: "Reforma e manutenção predial",
      dataInicio: "2024-05-10",
      vencimentoAtual: "2025-12-31",
      totalEmpenhado: 0,
      totalLiquidado: 0,
      totalPago: 0,
      statusExecucao: "em_execucao",
    });

    // Contrato 2937/24 associado a licitação com ano diferente (2023)
    await seedContratosServicosVigentes({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "7",
      ano: 2024,
      contratoNumero: "2937/24",
      fornecedorNome: "L.PHILIPPE CONSTRUCOES LTDA",
      fornecedorCnpj: "11.816.706/0001-42",
      objetoDescricao: "Obras de esgotamento",
      dataInicio: "2024-06-21",
      vencimentoAtual: "2026-06-21",
      totalEmpenhado: 24698277.36,
      totalLiquidado: 1199032.42,
      totalPago: 1199032.42,
      statusExecucao: "em_execucao",
    });

    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "7",
      ano: 2024,
      contratoNumero: "2937/24",
      fornecedorNome: "L.PHILIPPE CONSTRUCOES LTDA",
      fornecedorCpfCnpj: "11.816.706/0001-42",
      objeto: "Obras de esgotamento",
      modalidade: "concorrencia",
      licitacaoNumero: "000231",
      valorContrato: 24698277.36,
      dataInicio: "2024-06-21",
      vencimentoAtual: "2026-06-21",
    });

    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      empresaId: "7",
      ano: 2023,
      licitacaoNumero: "000231",
      modalidade: "concorrencia",
      objeto: "Concorrência para obras de esgotamento",
      situacao: "encerrada",
    });
  });

  afterAll(async () => {
    await cleanupFixtures(FIXTURE_PORTAL);
  });

  describe("getContratosServicosVigentes", () => {
    it("deve buscar contratos de serviços vigentes via leitor atômico", async () => {
      const list = await getContratosServicosVigentes(
        FIXTURE_PORTAL,
        TEST_YEAR,
      );
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);

      const item = list[0];
      expect(item.portalSlug).toBe(FIXTURE_PORTAL);
      expect(item.fornecedorNome).toBe("EMPRESA TESTE SERVICOS LTDA");
      expect(item.fornecedorCnpj).toBe("12.345.678/0001-90");
      expect(item.objetoDescricao).toBe(
        "Prestação de serviços contínuos de informática",
      );
      expect(item.totalEmpenhado).toBe(100000);
      expect(item.totalLiquidado).toBe(60000);
      expect(item.totalPago).toBe(50000);
      expect(item.saldoPendente).toBe(50000);
      expect(item.percentualPago).toBe(50);
      expect(["em_execucao", "concluido", "inexecutado"]).toContain(
        item.statusExecucao,
      );
      expect(item.totalEmpenhado).toBeGreaterThanOrEqual(item.totalLiquidado);
      expect(item.totalLiquidado).toBeGreaterThanOrEqual(item.totalPago);
    });
  });

  describe("getContratoByNumero", () => {
    it("deve retornar null para parâmetros inválidos ou vazios", async () => {
      expect(await getContratoByNumero("", "0010/26")).toBeNull();
      expect(await getContratoByNumero(FIXTURE_PORTAL, "")).toBeNull();
    });

    it("deve buscar contrato existente por número ou retornar null caso inexistente", async () => {
      const list = await getContratosServicosVigentes(
        FIXTURE_PORTAL,
        TEST_YEAR,
      );
      const target = list[0];
      expect(target?.contratoNumero).toBeDefined();

      const found = await getContratoByNumero(
        FIXTURE_PORTAL,
        target.contratoNumero!,
        TEST_YEAR,
      );
      expect(found).not.toBeNull();
      expect(found?.fornecedorNome).toBe(target.fornecedorNome);
      expect(found?.totalEmpenhado).toBe(target.totalEmpenhado);
      expect(found?.statusExecucao).toBe(target.statusExecucao);

      const notFound = await getContratoByNumero(
        FIXTURE_PORTAL,
        "CONTRATO_INEXISTENTE_99999",
        TEST_YEAR,
      );
      expect(notFound).toBeNull();

      const zeroNotFound = await getContratoByNumero(
        FIXTURE_PORTAL,
        "0000000000",
        TEST_YEAR,
      );
      expect(zeroNotFound).toBeNull();
    });

    it("deve encontrar contrato de outro exercício quando ano informado não possui o contrato (fallback plurianual)", async () => {
      // 2939/24 existe em 2024 e 2025, mas não em 2026
      const found = await getContratoByNumero(FIXTURE_PORTAL, "2939/24", 2026);
      expect(found).not.toBeNull();
      expect(found?.contratoNumero).toBe("2939/24");
      expect(found?.ano).toBe(2025);
    });

    it("deve resolver licitacaoAno com o ano correto da licitação vinculada ao contrato", async () => {
      // 2937/24 é de 2024 mas sua licitação 000231 é da Concorrência de 2023 (mesmo consultado em 2024 ou 2026)
      const found2024 = await getContratoByNumero(
        FIXTURE_PORTAL,
        "2937/24",
        2024,
      );
      expect(found2024).not.toBeNull();
      expect(found2024?.contratoNumero).toBe("2937/24");
      expect(found2024?.licitacaoNumero).toBe("000231");
      expect(found2024?.licitacaoAno).toBe(2023);

      const found2026 = await getContratoByNumero(
        FIXTURE_PORTAL,
        "2937/24",
        2026,
      );
      expect(found2026).not.toBeNull();
      expect(found2026?.contratoNumero).toBe("2937/24");
      expect(found2026?.licitacaoNumero).toBe("000231");
      expect(found2026?.licitacaoAno).toBe(2023);
    });
  });
});
