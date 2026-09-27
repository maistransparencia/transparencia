import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContratoRecurso,
} from "../../../tests/fixtures/seed";
import {
  getContratoRecursosDetalhe,
  getContratosComRecursos,
} from "../contratos-recursos";

const TEST_PORTAL_SLUG = createFixturePortalSlug();
const TEST_ANO = 2024;
const TEST_CONTRATO_ID = "contrato_test_rec_01";
const TEST_CONTRATO_NUMERO = "0585/23";

describe("contratos-recursos", () => {
  beforeAll(async () => {
    await cleanupFixtures(TEST_PORTAL_SLUG);
    await seedContratoRecurso({
      contratoId: TEST_CONTRATO_ID,
      portalSlug: TEST_PORTAL_SLUG,
      ano: TEST_ANO,
      empresaId: "empresa_01",
      orgaoNome: "Secretaria Municipal de Educação",
      contratoNumero: TEST_CONTRATO_NUMERO,
      licitacaoNumero: "0012/23",
      fornecedorNome: "Fornecedor Teste LTDA",
      fornecedorCpfCnpj: "12.345.678/0001-90",
      valorContrato: 150000,
      valorAditado: 10000,
      totalEmpenhado: 120000,
      totalLiquidado: 100000,
      totalPago: 90000,
      saldoAPagar: 30000,
      fontePrincipal: "FUNDEB 70%",
      fontesRecursos: "FUNDEB 70%; MDE 25%",
      principalFuncao: "Educação",
      principalPrograma: "Transporte Escolar",
      principalAcao: "Manutenção do Transporte Escolar",
    });
  });

  afterAll(async () => {
    await cleanupFixtures(TEST_PORTAL_SLUG);
  });

  describe("getContratosComRecursos", () => {
    it("deve retornar array vazio para portalSlug inválido", async () => {
      expect(await getContratosComRecursos({ portalSlug: "" })).toEqual([]);
    });

    it("deve buscar contratos com recursos e validar tipagem dos DTOs de forma determinística", async () => {
      const list = await getContratosComRecursos({
        portalSlug: TEST_PORTAL_SLUG,
        ano: TEST_ANO,
        limit: 10,
      });

      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(1);

      const item = list[0];
      expect(item.contratoId).toBe(TEST_CONTRATO_ID);
      expect(item.portalSlug).toBe(TEST_PORTAL_SLUG);
      expect(item.ano).toBe(TEST_ANO);
      expect(item.empresaId).toBe("empresa_01");
      expect(item.orgaoNome).toBe("Secretaria Municipal de Educação");
      expect(item.contratoNumero).toBe(TEST_CONTRATO_NUMERO);
      expect(item.licitacaoNumero).toBe("0012/23");
      expect(item.fornecedorNome).toBe("Fornecedor Teste LTDA");
      expect(item.fornecedorCpfCnpj).toBe("12.345.678/0001-90");
      expect(item.valorContrato).toBe(150000);
      expect(item.valorAditado).toBe(10000);
      expect(item.totalEmpenhado).toBe(120000);
      expect(item.totalLiquidado).toBe(100000);
      expect(item.totalPago).toBe(90000);
      expect(item.saldoAPagar).toBe(30000);
      expect(item.fontePrincipal).toBe("FUNDEB 70%");
      expect(item.fontesRecursos).toBe("FUNDEB 70%; MDE 25%");
      expect(item.principalFuncao).toBe("Educação");
      expect(item.principalPrograma).toBe("Transporte Escolar");
      expect(item.principalAcao).toBe("Manutenção do Transporte Escolar");
    });
  });

  describe("getContratoRecursosDetalhe", () => {
    it("deve retornar null para parâmetros vazios", async () => {
      expect(
        await getContratoRecursosDetalhe({
          portalSlug: "",
          contratoNumeroOuId: "",
        }),
      ).toBeNull();
      expect(
        await getContratoRecursosDetalhe({
          portalSlug: TEST_PORTAL_SLUG,
          contratoNumeroOuId: "",
        }),
      ).toBeNull();
    });

    it("deve retornar detalhes do contrato seeded por número", async () => {
      const detalhe = await getContratoRecursosDetalhe({
        portalSlug: TEST_PORTAL_SLUG,
        contratoNumeroOuId: TEST_CONTRATO_NUMERO,
        ano: TEST_ANO,
      });

      expect(detalhe).not.toBeNull();
      expect(detalhe?.contratoId).toBe(TEST_CONTRATO_ID);
      expect(detalhe?.orgaoNome).toBe("Secretaria Municipal de Educação");
      expect(detalhe?.totalEmpenhado).toBe(120000);
      expect(detalhe?.totalLiquidado).toBe(100000);
      expect(detalhe?.totalPago).toBe(90000);
      expect(detalhe?.saldoAPagar).toBe(30000);
      expect(detalhe?.fontesRecursos).toBe("FUNDEB 70%; MDE 25%");
      expect(detalhe?.fontePrincipal).toBe("FUNDEB 70%");
    });

    it("deve retornar detalhes do contrato seeded por ID", async () => {
      const detalhe = await getContratoRecursosDetalhe({
        portalSlug: TEST_PORTAL_SLUG,
        contratoNumeroOuId: TEST_CONTRATO_ID,
      });

      expect(detalhe).not.toBeNull();
      expect(detalhe?.contratoNumero).toBe(TEST_CONTRATO_NUMERO);
      expect(detalhe?.empresaId).toBe("empresa_01");
    });

    it("deve retornar null caso contrato não exista", async () => {
      const inexistente = await getContratoRecursosDetalhe({
        portalSlug: TEST_PORTAL_SLUG,
        contratoNumeroOuId: "NUMERO_CONTRATO_TOTALMENTE_INEXISTENTE_99999",
        ano: TEST_ANO,
      });
      expect(inexistente).toBeNull();
    });
  });
});
