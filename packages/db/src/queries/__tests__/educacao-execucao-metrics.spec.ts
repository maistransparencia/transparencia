import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedDespesa,
  seedEducacaoExecucao,
} from "../../../tests/fixtures/seed";
import {
  getEducacaoExecucaoAnual,
  getEducacaoPagoPorSubfuncao,
  getTopFornecedoresEducacaoMetrics,
} from "../educacao-execucao-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("educacao-execucao-metrics", () => {
  describe("getEducacaoExecucaoAnual", () => {
    it("retorna a série anual ordenada, com pago por aluno nulo quando não calculado", async () => {
      await seedEducacaoExecucao([
        {
          portalSlug: PORTAL_A,
          ano: 2025,
          empenhado: 1500,
          liquidado: 1350,
          pago: 1200,
          pagoEnsinoSuperior: 200,
          totalMatriculasRedeMunicipal: 4,
          pagoPorAluno: 250,
        },
        { portalSlug: PORTAL_A, ano: 2024, empenhado: 900, pago: 800 },
        { portalSlug: PORTAL_B, ano: 2025, empenhado: 1, pago: 1 },
      ]);

      const serie = await getEducacaoExecucaoAnual(PORTAL_A);

      expect(serie.map((linha) => linha.ano)).toEqual([2024, 2025]);
      expect(serie[0].pagoPorAluno).toBeNull();
      expect(serie[1]).toMatchObject({
        empenhado: 1500,
        pago: 1200,
        pagoSemEnsinoSuperior: 1000,
        totalMatriculasRedeMunicipal: 4,
        pagoPorAluno: 250,
      });
    });

    it("retorna vazio para portal vazio", async () => {
      expect(await getEducacaoExecucaoAnual(" ")).toEqual([]);
    });
  });

  describe("getEducacaoPagoPorSubfuncao", () => {
    it("soma o pago da função 12 por subfunção e ignora outras funções, anos e portais", async () => {
      const base = { empresaId: "1", ano: 2025, fonte: "exercicio" };
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        funcao: "12",
        subfuncao: "361",
        subfuncaoNome: "Ensino Fundamental",
        pago: 700,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        funcao: "12",
        subfuncao: "361",
        subfuncaoNome: "Ensino Fundamental",
        pago: 300,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        funcao: "12",
        subfuncao: "364",
        subfuncaoNome: "Ensino Superior",
        pago: 50,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        funcao: "10",
        subfuncao: "301",
        subfuncaoNome: "Atenção Básica",
        pago: 999,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_A,
        ano: 2024,
        funcao: "12",
        subfuncao: "361",
        subfuncaoNome: "Ensino Fundamental",
        pago: 999,
      });
      await seedDespesa({
        ...base,
        portalSlug: PORTAL_B,
        funcao: "12",
        subfuncao: "361",
        subfuncaoNome: "Ensino Fundamental",
        pago: 999,
      });

      expect(await getEducacaoPagoPorSubfuncao(PORTAL_A, 2025)).toEqual([
        { subfuncao: "361", subfuncaoNome: "Ensino Fundamental", pago: 1000 },
        { subfuncao: "364", subfuncaoNome: "Ensino Superior", pago: 50 },
      ]);
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
