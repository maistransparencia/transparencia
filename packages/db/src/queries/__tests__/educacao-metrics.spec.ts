import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedEducacaoMetricas,
} from "../../../tests/fixtures/seed";
import {
  getEducacaoMetrics,
  getResumoEducacao,
  toBooleanOrNull,
  toDbEtapaEnsino,
  toEtapaEnsino,
} from "../educacao-metrics";

const PORTAL_PORCIUNCULA = createFixturePortalSlug();
const PORTAL_NATIVIDADE = createFixturePortalSlug();
const PORTAL_ISOLAMENTO_A = createFixturePortalSlug();
const PORTAL_ISOLAMENTO_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([
    cleanupFixtures(PORTAL_PORCIUNCULA),
    cleanupFixtures(PORTAL_NATIVIDADE),
    cleanupFixtures(PORTAL_ISOLAMENTO_A),
    cleanupFixtures(PORTAL_ISOLAMENTO_B),
  ]);
});

describe("educacao-metrics", () => {
  describe("helpers de etapa de ensino", () => {
    it("converte valores do banco para camelCase e vice-versa", () => {
      expect(toEtapaEnsino("anos_iniciais")).toBe("anosIniciais");
      expect(toEtapaEnsino("anos_finais")).toBe("anosFinais");
      expect(toEtapaEnsino("outro")).toBe("anosIniciais");

      expect(toDbEtapaEnsino("anosIniciais")).toBe("anos_iniciais");
      expect(toDbEtapaEnsino("anosFinais")).toBe("anos_finais");
    });

    it("é idempotente para valores já no formato de destino", () => {
      expect(toEtapaEnsino("anosIniciais")).toBe("anosIniciais");
      expect(toEtapaEnsino("anosFinais")).toBe("anosFinais");

      expect(toDbEtapaEnsino("anos_iniciais")).toBe("anos_iniciais");
      expect(toDbEtapaEnsino("anos_finais")).toBe("anos_finais");
    });
  });

  describe("toBooleanOrNull", () => {
    it("converte valores booleanos, numéricos e strings com segurança sem coerção indevida", () => {
      expect(toBooleanOrNull(true)).toBe(true);
      expect(toBooleanOrNull(false)).toBe(false);
      expect(toBooleanOrNull("true")).toBe(true);
      expect(toBooleanOrNull("t")).toBe(true);
      expect(toBooleanOrNull("1")).toBe(true);
      expect(toBooleanOrNull(1)).toBe(true);
      expect(toBooleanOrNull("false")).toBe(false);
      expect(toBooleanOrNull("f")).toBe(false);
      expect(toBooleanOrNull("0")).toBe(false);
      expect(toBooleanOrNull(0)).toBe(false);
      expect(toBooleanOrNull(null)).toBeNull();
      expect(toBooleanOrNull(undefined)).toBeNull();
      expect(toBooleanOrNull("invalido")).toBeNull();
    });
  });

  describe("getEducacaoMetrics", () => {
    it("retorna série histórica completa ordenada por ano asc, etapa_ensino asc com mapeamento camelCase", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anos_finais",
          notaIdeb: 4.8,
          metaIdeb: null,
          atingiuMetaFlag: null,
          saebMatematica: 245.1,
          saebLinguaPortuguesa: 250.3,
          indicadorFluxoAprovacao: 0.9512,
          crescimentoPontosIdeb: 0.5,
          variacaoSaebMatematica: 12.5,
          variacaoSaebPortugues: 14.2,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14974.64,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          codIbge: 3304102,
          ano: 2021,
          rede: "municipal",
          etapaEnsino: "anos_iniciais",
          notaIdeb: 5.2,
          metaIdeb: 6.4,
          atingiuMetaFlag: false,
          saebMatematica: 210.79,
          saebLinguaPortuguesa: 198.28,
          indicadorFluxoAprovacao: 0.92546,
          crescimentoPontosIdeb: null,
          variacaoSaebMatematica: null,
          variacaoSaebPortugues: null,
          despesaLiquidadaEducacao: null,
          totalMatriculasRedeMunicipal: null,
          custoAnualPorAluno: null,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          codIbge: 3304102,
          ano: 2023,
          rede: "municipal",
          etapaEnsino: "anos_iniciais",
          notaIdeb: 4.5,
          metaIdeb: null,
          atingiuMetaFlag: null,
          saebMatematica: 190.18,
          saebLinguaPortuguesa: 175.6,
          indicadorFluxoAprovacao: 0.942453,
          crescimentoPontosIdeb: -0.7,
          variacaoSaebMatematica: -20.61,
          variacaoSaebPortugues: -22.68,
          despesaLiquidadaEducacao: null,
          totalMatriculasRedeMunicipal: null,
          custoAnualPorAluno: null,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anos_iniciais",
          notaIdeb: 5.9,
          metaIdeb: null,
          atingiuMetaFlag: null,
          saebMatematica: 218.39,
          saebLinguaPortuguesa: 210.91,
          indicadorFluxoAprovacao: 0.984589,
          crescimentoPontosIdeb: 1.4,
          variacaoSaebMatematica: 28.21,
          variacaoSaebPortugues: 35.31,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14974.64,
        },
      ]);

      const metrics = await getEducacaoMetrics(PORTAL_PORCIUNCULA);

      expect(metrics).toHaveLength(4);

      // Verificação da ordenação (2021 anosIniciais, 2023 anosIniciais, 2025 anosIniciais, 2025 anosFinais)
      expect(metrics[0].ano).toBe(2021);
      expect(metrics[0].etapaEnsino).toBe("anosIniciais");
      expect(metrics[0].notaIdeb).toBe(5.2);
      expect(metrics[0].metaIdeb).toBe(6.4);
      expect(metrics[0].atingiuMeta).toBe(false);

      expect(metrics[1].ano).toBe(2023);
      expect(metrics[1].etapaEnsino).toBe("anosIniciais");
      expect(metrics[1].notaIdeb).toBe(4.5);
      expect(metrics[1].crescimentoPontosIdeb).toBe(-0.7);

      expect(metrics[2].ano).toBe(2025);
      expect(metrics[2].etapaEnsino).toBe("anosIniciais");
      expect(metrics[2].notaIdeb).toBe(5.9);
      expect(metrics[2].crescimentoPontosIdeb).toBe(1.4);
      expect(metrics[2].saebMatematica).toBe(218.39);
      expect(metrics[2].saebLinguaPortuguesa).toBe(210.91);
      expect(metrics[2].indicadorFluxoAprovacao).toBe(0.984589);
      expect(metrics[2].despesaLiquidadaEducacao).toBe(34291936.64);
      expect(metrics[2].totalMatriculasRedeMunicipal).toBe(2290);
      expect(metrics[2].custoAnualPorAluno).toBe(14974.64);

      expect(metrics[3].ano).toBe(2025);
      expect(metrics[3].etapaEnsino).toBe("anosFinais");
      expect(metrics[3].notaIdeb).toBe(4.8);
    });

    it("filtra por ano quando options.ano for fornecido", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
        },
      ]);

      const metrics = await getEducacaoMetrics(PORTAL_PORCIUNCULA, {
        ano: 2025,
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].ano).toBe(2025);
      expect(metrics[0].notaIdeb).toBe(5.9);
    });

    it("filtra por etapaEnsino quando options.etapaEnsino for fornecido", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosFinais",
          notaIdeb: 4.8,
        },
      ]);

      const anosIniciaisOnly = await getEducacaoMetrics(PORTAL_PORCIUNCULA, {
        etapaEnsino: "anosIniciais",
      });
      expect(anosIniciaisOnly).toHaveLength(1);
      expect(anosIniciaisOnly[0].etapaEnsino).toBe("anosIniciais");
      expect(anosIniciaisOnly[0].notaIdeb).toBe(5.9);

      const anosFinaisOnly = await getEducacaoMetrics(PORTAL_PORCIUNCULA, {
        etapaEnsino: "anosFinais",
      });
      expect(anosFinaisOnly).toHaveLength(1);
      expect(anosFinaisOnly[0].etapaEnsino).toBe("anosFinais");
      expect(anosFinaisOnly[0].notaIdeb).toBe(4.8);
    });

    it("filtra por ano e etapaEnsino simultaneamente", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosFinais",
          notaIdeb: 4.8,
        },
      ]);

      const result = await getEducacaoMetrics(PORTAL_PORCIUNCULA, {
        ano: 2025,
        etapaEnsino: "anosIniciais",
      });

      expect(result).toHaveLength(1);
      expect(result[0].ano).toBe(2025);
      expect(result[0].etapaEnsino).toBe("anosIniciais");
      expect(result[0].notaIdeb).toBe(5.9);
    });

    it("retorna array vazio quando não houver dados para o portal", async () => {
      const result = await getEducacaoMetrics(PORTAL_PORCIUNCULA);
      expect(result).toEqual([]);
    });

    it("retorna array vazio para portalSlug nulo, vazio ou somente espaços em branco", async () => {
      expect(await getEducacaoMetrics("")).toEqual([]);
      expect(await getEducacaoMetrics("   ")).toEqual([]);
      // @ts-expect-error teste defensivo com argumento inválido
      expect(await getEducacaoMetrics(null)).toEqual([]);
      // @ts-expect-error teste defensivo com argumento inválido
      expect(await getEducacaoMetrics(undefined)).toEqual([]);
    });
  });

  describe("getResumoEducacao", () => {
    it("retorna resumo consolidado para o ciclo mais recente (2025: nota 5,9, crescimento +1,4) com Anos Iniciais e Finais", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
          crescimentoPontosIdeb: null,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
          saebMatematica: 218.39,
          saebLinguaPortuguesa: 210.91,
          indicadorFluxoAprovacao: 0.984589,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14974.64,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosFinais",
          notaIdeb: 4.8,
          crescimentoPontosIdeb: 0.5,
          saebMatematica: 245.1,
          saebLinguaPortuguesa: 250.3,
          indicadorFluxoAprovacao: 0.9512,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14974.64,
        },
      ]);

      const resumo = await getResumoEducacao(PORTAL_PORCIUNCULA);

      expect(resumo).not.toBeNull();
      expect(resumo?.portalSlug).toBe(PORTAL_PORCIUNCULA);
      expect(resumo?.ano).toBe(2025);
      expect(resumo?.notaIdeb).toBe(5.9);
      expect(resumo?.crescimentoPontosIdeb).toBe(1.4);
      expect(resumo?.despesaLiquidadaEducacao).toBe(34291936.64);
      expect(resumo?.totalMatriculasRedeMunicipal).toBe(2290);
      expect(resumo?.custoAnualPorAluno).toBe(14974.64);

      expect(resumo?.anosIniciais?.etapaEnsino).toBe("anosIniciais");
      expect(resumo?.anosIniciais?.notaIdeb).toBe(5.9);
      expect(resumo?.anosIniciais?.crescimentoPontosIdeb).toBe(1.4);

      expect(resumo?.anosFinais?.etapaEnsino).toBe("anosFinais");
      expect(resumo?.anosFinais?.notaIdeb).toBe(4.8);
      expect(resumo?.anosFinais?.crescimentoPontosIdeb).toBe(0.5);
    });

    it("permite consultar resumo de um ano específico solicitado", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
          metaIdeb: 6.4,
          atingiuMetaFlag: false,
          crescimentoPontosIdeb: null,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
        },
      ]);

      const resumo2021 = await getResumoEducacao(PORTAL_PORCIUNCULA, 2021);

      expect(resumo2021).not.toBeNull();
      expect(resumo2021?.ano).toBe(2021);
      expect(resumo2021?.notaIdeb).toBe(5.2);
      expect(resumo2021?.metaIdeb).toBe(6.4);
      expect(resumo2021?.atingiuMeta).toBe(false);
      expect(resumo2021?.crescimentoPontosIdeb).toBeNull();
    });

    it("valida cenário de Natividade com meta atingida (atingiuMeta = true)", async () => {
      await seedEducacaoMetricas({
        portalSlug: PORTAL_NATIVIDADE,
        codIbge: 3303104,
        ano: 2021,
        etapaEnsino: "anosIniciais",
        notaIdeb: 5.5,
        metaIdeb: 5.3,
        atingiuMetaFlag: true,
        saebMatematica: 200.0,
        saebLinguaPortuguesa: 200.0,
        indicadorFluxoAprovacao: 0.95,
        despesaLiquidadaEducacao: 10000000.0,
        totalMatriculasRedeMunicipal: 0,
        custoAnualPorAluno: null,
      });

      const resumo = await getResumoEducacao(PORTAL_NATIVIDADE, 2021);

      expect(resumo).not.toBeNull();
      expect(resumo?.portalSlug).toBe(PORTAL_NATIVIDADE);
      expect(resumo?.ano).toBe(2021);
      expect(resumo?.notaIdeb).toBe(5.5);
      expect(resumo?.metaIdeb).toBe(5.3);
      expect(resumo?.atingiuMeta).toBe(true);
      expect(resumo?.despesaLiquidadaEducacao).toBe(10000000.0);
      expect(resumo?.totalMatriculasRedeMunicipal).toBe(0);
      expect(resumo?.custoAnualPorAluno).toBeNull();
    });

    it("utiliza fallback para anosFinais quando anosIniciais não existe", async () => {
      const PORTAL_FALLBACK = createFixturePortalSlug();
      await seedEducacaoMetricas({
        portalSlug: PORTAL_FALLBACK,
        ano: 2025,
        etapaEnsino: "anosFinais",
        notaIdeb: 4.9,
        crescimentoPontosIdeb: 0.6,
        despesaLiquidadaEducacao: 20000000.0,
        totalMatriculasRedeMunicipal: 1500,
        custoAnualPorAluno: 13333.33,
      });

      const resumoFinais = await getResumoEducacao(PORTAL_FALLBACK);
      expect(resumoFinais).not.toBeNull();
      expect(resumoFinais?.ano).toBe(2025);
      expect(resumoFinais?.notaIdeb).toBe(4.9);
      expect(resumoFinais?.crescimentoPontosIdeb).toBe(0.6);
      expect(resumoFinais?.despesaLiquidadaEducacao).toBe(20000000.0);
      expect(resumoFinais?.anosIniciais).toBeNull();
      expect(resumoFinais?.anosFinais?.notaIdeb).toBe(4.9);

      await cleanupFixtures(PORTAL_FALLBACK);
    });

    it("faz fallback de notaIdeb e financeiro quando anosIniciais tem nota nula mas anosFinais possui dados", async () => {
      const PORTAL_PARTIAL = createFixturePortalSlug();
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PARTIAL,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: null,
          crescimentoPontosIdeb: null,
        },
        {
          portalSlug: PORTAL_PARTIAL,
          ano: 2025,
          etapaEnsino: "anosFinais",
          notaIdeb: 5.1,
          crescimentoPontosIdeb: 0.8,
          despesaLiquidadaEducacao: 15000000.0,
          totalMatriculasRedeMunicipal: 1000,
          custoAnualPorAluno: 15000.0,
        },
      ]);

      const resumo = await getResumoEducacao(PORTAL_PARTIAL);
      expect(resumo).not.toBeNull();
      expect(resumo?.notaIdeb).toBe(5.1);
      expect(resumo?.crescimentoPontosIdeb).toBe(0.8);
      expect(resumo?.despesaLiquidadaEducacao).toBe(15000000.0);

      await cleanupFixtures(PORTAL_PARTIAL);
    });

    it("retorna null se não houver registros para o portal", async () => {
      const resumo = await getResumoEducacao(PORTAL_PORCIUNCULA);
      expect(resumo).toBeNull();
    });

    it("retorna null defensivamente para portalSlug vazio, whitespace ou nulo", async () => {
      expect(await getResumoEducacao("")).toBeNull();
      expect(await getResumoEducacao("   ")).toBeNull();
      // @ts-expect-error teste defensivo com argumento inválido
      expect(await getResumoEducacao(null)).toBeNull();
      // @ts-expect-error teste defensivo com argumento inválido
      expect(await getResumoEducacao(undefined)).toBeNull();
    });
  });

  describe("isolamento multi-tenant (Regra 23)", () => {
    it("garante que dados de um portal não vazam para consultas de outro portal", async () => {
      await seedEducacaoMetricas({
        portalSlug: PORTAL_ISOLAMENTO_A,
        ano: 2025,
        etapaEnsino: "anosIniciais",
        notaIdeb: 6.0,
        crescimentoPontosIdeb: 1.5,
      });

      await seedEducacaoMetricas({
        portalSlug: PORTAL_ISOLAMENTO_B,
        ano: 2025,
        etapaEnsino: "anosIniciais",
        notaIdeb: 4.0,
        crescimentoPontosIdeb: -0.5,
      });

      const metricsA = await getEducacaoMetrics(PORTAL_ISOLAMENTO_A);
      expect(metricsA).toHaveLength(1);
      expect(metricsA[0].portalSlug).toBe(PORTAL_ISOLAMENTO_A);
      expect(metricsA[0].notaIdeb).toBe(6.0);

      const metricsB = await getEducacaoMetrics(PORTAL_ISOLAMENTO_B);
      expect(metricsB).toHaveLength(1);
      expect(metricsB[0].portalSlug).toBe(PORTAL_ISOLAMENTO_B);
      expect(metricsB[0].notaIdeb).toBe(4.0);

      const resumoA = await getResumoEducacao(PORTAL_ISOLAMENTO_A);
      expect(resumoA?.portalSlug).toBe(PORTAL_ISOLAMENTO_A);
      expect(resumoA?.notaIdeb).toBe(6.0);

      const resumoB = await getResumoEducacao(PORTAL_ISOLAMENTO_B);
      expect(resumoB?.portalSlug).toBe(PORTAL_ISOLAMENTO_B);
      expect(resumoB?.notaIdeb).toBe(4.0);
    });
  });
});
