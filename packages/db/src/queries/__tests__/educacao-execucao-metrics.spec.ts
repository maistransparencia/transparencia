import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedDespesa,
  seedEducacaoExecucao,
} from "../../../tests/fixtures/seed";
import {
  getEducacaoExecucaoAnual,
  getTopFornecedoresEducacaoMetrics,
} from "../educacao-execucao-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("educacao-execucao-metrics", () => {
  describe("getEducacaoExecucaoAnual", () => {
    it("retorna a série anual ordenada, só do portal pedido", async () => {
      await seedEducacaoExecucao([
        {
          portalSlug: PORTAL_A,
          ano: 2025,
          empenhado: 1500,
          liquidado: 1350,
          pago: 1200,
          pagoSemPessoal: 1000,
        },
        { portalSlug: PORTAL_A, ano: 2024, empenhado: 900, pago: 800 },
        { portalSlug: PORTAL_B, ano: 2025, empenhado: 1, pago: 1 },
      ]);

      const serie = await getEducacaoExecucaoAnual(PORTAL_A);

      expect(serie.map((linha) => linha.ano)).toEqual([2024, 2025]);
      expect(serie[1]).toMatchObject({
        empenhado: 1500,
        liquidado: 1350,
        pago: 1200,
        pagoSemPessoal: 1000,
      });
    });

    it("retorna vazio para portal vazio", async () => {
      expect(await getEducacaoExecucaoAnual(" ")).toEqual([]);
    });
  });

  describe("getTopFornecedoresEducacaoMetrics", () => {
    it("ranqueia fornecedores da função 12 sem pessoal e sem cruzar portais", async () => {
      const base = {
        empresaId: "1",
        ano: 2025,
        fonte: "exercicio",
        funcao: "12",
      };
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        fornecedorNome: "ALFA",
        pago: 600,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        fornecedorNome: "BETA",
        pago: 400,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        fornecedorNome: "FOLHA",
        grupoNatureza: "1",
        pago: 9000,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        funcao: "10",
        fornecedorNome: "SAUDE",
        pago: 9000,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_B,
        fornecedorNome: "OUTRO",
        pago: 9000,
      });

      const fornecedores = await getTopFornecedoresEducacaoMetrics({
        portalSlug: PORTAL_A,
        year: 2025,
      });

      expect(fornecedores.map((f) => f.fornecedorNome)).toEqual([
        "ALFA",
        "BETA",
      ]);
      expect(fornecedores[0].totalPago).toBe(600);
    });
  });
});
