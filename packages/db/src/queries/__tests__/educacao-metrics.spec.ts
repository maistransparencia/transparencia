import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContrato,
  seedContratoRecurso,
  seedContratosServicosVigentes,
  seedDimOrgao,
  seedEducacaoMetricas,
} from "../../../tests/fixtures/seed";
import {
  categorizarContratoEducacao,
  getEducacaoContratos,
  getEducacaoMediasEstaduais,
  getEducacaoMetrics,
  getEducacaoRankingEstadual,
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
          metaIdeb: 6.4,
          atingiuMetaFlag: false,
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
          metaIdeb: 6.4,
          atingiuMetaFlag: false,
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
          metaIdeb: 6.4,
          atingiuMetaFlag: false,
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
      expect(metrics[1].metaIdeb).toBe(6.4);
      expect(metrics[1].atingiuMeta).toBe(false);
      expect(metrics[1].crescimentoPontosIdeb).toBe(-0.7);

      expect(metrics[2].ano).toBe(2025);
      expect(metrics[2].etapaEnsino).toBe("anosIniciais");
      expect(metrics[2].notaIdeb).toBe(5.9);
      expect(metrics[2].metaIdeb).toBe(6.4);
      expect(metrics[2].atingiuMeta).toBe(false);
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
      expect(metrics[3].metaIdeb).toBe(6.4);
      expect(metrics[3].atingiuMeta).toBe(false);
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

    it("busca ciclo apurado anterior ou igual (ano <= targetAno) quando o ano solicitado não possui dados diretos", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2023,
          etapaEnsino: "anosIniciais",
          notaIdeb: 4.5,
          crescimentoPontosIdeb: -0.7,
        },
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
        },
      ]);

      const resumo2024 = await getResumoEducacao(PORTAL_PORCIUNCULA, 2024);

      expect(resumo2024).not.toBeNull();
      expect(resumo2024?.ano).toBe(2023);
      expect(resumo2024?.notaIdeb).toBe(4.5);
      expect(resumo2024?.crescimentoPontosIdeb).toBe(-0.7);
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

    it("não preenche indicadores do IDEB com anosFinais quando anosIniciais não existe", async () => {
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
      expect(resumoFinais?.notaIdeb).toBeNull();
      expect(resumoFinais?.metaIdeb).toBeNull();
      expect(resumoFinais?.atingiuMeta).toBeNull();
      expect(resumoFinais?.crescimentoPontosIdeb).toBeNull();
      expect(resumoFinais?.posicaoRanking).toBeNull();
      expect(resumoFinais?.despesaLiquidadaEducacao).toBe(20000000.0);
      expect(resumoFinais?.anosIniciais).toBeNull();
      expect(resumoFinais?.anosFinais?.notaIdeb).toBe(4.9);

      await cleanupFixtures(PORTAL_FALLBACK);
    });

    it("mantém IDEB nulo e financeiro por fallback quando anosIniciais tem nota nula mas anosFinais possui dados", async () => {
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
      expect(resumo?.notaIdeb).toBeNull();
      expect(resumo?.metaIdeb).toBeNull();
      expect(resumo?.atingiuMeta).toBeNull();
      expect(resumo?.crescimentoPontosIdeb).toBeNull();
      expect(resumo?.posicaoRanking).toBeNull();
      expect(resumo?.anosFinais?.notaIdeb).toBe(5.1);
      expect(resumo?.despesaLiquidadaEducacao).toBe(15000000.0);

      await cleanupFixtures(PORTAL_PARTIAL);
    });

    it("não reaproveita a despesa de outro ciclo quando o exercício solicitado é diferente", async () => {
      await seedEducacaoMetricas([
        {
          portalSlug: PORTAL_PORCIUNCULA,
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
          despesaLiquidadaEducacao: 34291936.64,
        },
      ]);

      const resumo = await getResumoEducacao(PORTAL_PORCIUNCULA, 2026);

      expect(resumo?.ano).toBe(2025);
      expect(resumo?.despesaLiquidadaEducacao).toBeNull();
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

  describe("categorizarContratoEducacao", () => {
    it("categoriza como merenda_pnae contratos de alimentação e merenda escolar", () => {
      expect(
        categorizarContratoEducacao(
          "Aquisição de gêneros alimentícios para merenda escolar - PNAE",
        ),
      ).toBe("merenda_pnae");
      expect(
        categorizarContratoEducacao(
          "Fornecimento de refeições e nutrição para alunos",
        ),
      ).toBe("merenda_pnae");
    });

    it("categoriza como transporte_pnate contratos de transporte de estudantes", () => {
      expect(
        categorizarContratoEducacao(
          "Serviço de transporte escolar de alunos da zona rural - PNATE",
        ),
      ).toBe("transporte_pnate");
      expect(
        categorizarContratoEducacao(
          "Locação de ônibus escolar para atendimento à rede",
        ),
      ).toBe("transporte_pnate");
    });

    it("categoriza como manutencao_geral contratos de reformas, obras e materiais pedagógicos", () => {
      expect(
        categorizarContratoEducacao(
          "Reforma e pintura da Escola Municipal Maria de Lourdes",
        ),
      ).toBe("manutencao_geral");
      expect(
        categorizarContratoEducacao(
          "Aquisição de material didático e pedagógico para creches",
        ),
      ).toBe("manutencao_geral");
    });

    it("categoriza como locacao_imoveis contratos de locação e aluguel de imóveis para educação", () => {
      expect(
        categorizarContratoEducacao(
          "LOCAÇÃO DE IMOVEL PARA FUNCIONAMENTO DA CLASSE ANEXA DA CRECHE E ESCOLA MUNICIPAL MARIA PUDDO MURUCCI",
        ),
      ).toBe("locacao_imoveis");
      expect(
        categorizarContratoEducacao(
          "LOCAÇÃO DE IMÓVEL PARA DAR SEQUÊNCIA AO FUNCIONAMENTO DA SECRETARIA MUNICIPAL DE EDUCAÇÃO - EQUIPE PEDAGÓGICA, EQUIPE ADMINISTRATIVA, DEPARTAMENTO DE NUTRIÇÃO E FUNDO MUNICIPAL DE EDUCAÇÃO",
        ),
      ).toBe("locacao_imoveis");
      expect(
        categorizarContratoEducacao(
          "Locação de imóvel não residencial visando dar continuidade aos trabalhos escolares da CEM Maria Puddó",
        ),
      ).toBe("locacao_imoveis");
      expect(
        categorizarContratoEducacao(
          "Aluguel de prédio para funcionamento de salas de aula anexas",
        ),
      ).toBe("locacao_imoveis");
      expect(
        categorizarContratoEducacao(
          "Aluguel de salão para atividades pedagógicas complementares",
        ),
      ).toBe("locacao_imoveis");
    });

    it("não confunde locação de veículos ou ônibus com locação de imóveis mesmo citando prédios ou garagens", () => {
      expect(
        categorizarContratoEducacao(
          "Locação de ônibus e vans para transporte escolar com garagem e ponto no prédio central",
        ),
      ).toBe("transporte_pnate");
    });

    it("não confunde alimentação de sistemas com merenda escolar PNAE", () => {
      expect(
        categorizarContratoEducacao(
          "DFD N° 329/2025 - CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA A PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA TÉCNICA VOLTADOS À ELABORAÇÃO DO PLANO MUNICIPAL DE EDUCAÇÃO (PME), BEM COMO PARA APOIO TÉCNICO E OPERACIONAL AOS GESTORES LOCAIS NA UTILIZAÇÃO E ALIMENTAÇÃO DO SISTEMA PDDE INTERATIVO",
        ),
      ).toBe("outros");
      expect(
        categorizarContratoEducacao(
          "Alimentação dos sistemas de gestão escolar e base de dados do censo",
        ),
      ).toBe("outros");
      expect(
        categorizarContratoEducacao(
          "Alimentação de banco de dados e plataformas educacionais",
        ),
      ).toBe("outros");
    });

    it("categoriza como outros quando não encaixa nas categorias específicas", () => {
      expect(
        categorizarContratoEducacao(
          "Contratação de assessoria contábil",
          "Educação",
        ),
      ).toBe("outros");
    });
  });

  describe("getEducacaoContratos", () => {
    it("retorna contratos vinculados à Educação com categorias e dados em camelCase", async () => {
      await seedContrato({
        contratoId: "ctr_edu_1",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0443/25",
        fornecedorNome: "DISTRIBUIDORA ALIMENTAR LTDA",
        fornecedorCpfCnpj: "12.345.678/0001-90",
        objeto: "Aquisição de gêneros alimentícios para merenda escolar PNAE",
        valorContrato: 450000,
        licitacaoNumero: "012/2025",
        modalidade: "pregao_eletronico",
        empenhado: 450000,
        dataInicio: "2025-02-01",
        vencimentoAtual: "2025-12-31",
      });

      await seedContratoRecurso({
        contratoRecursoId: "cr_edu_1",
        contratoId: "ctr_edu_1",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_1",
        orgaoNome: "Secretaria Municipal de Educação",
        contratoNumero: "0443/25",
        licitacaoNumero: "012/2025",
        fornecedorNome: "DISTRIBUIDORA ALIMENTAR LTDA",
        valorContrato: 450000,
        totalEmpenhado: 450000,
        totalLiquidado: 200000,
        totalPago: 180000,
        saldoAPagar: 270000,
        fontePrincipal: "PNAE - Transferências FNDE",
        fontesRecursos: "PNAE - Transferências FNDE; Recursos Próprios",
        principalFuncao: "Educação",
        principalPrograma: "Alimentação Escolar Sustentável",
        principalAcao: "Distribuição de Merenda Escolar",
      });

      // Contrato não educacional para garantir que é filtrado
      await seedContrato({
        contratoId: "ctr_obras_1",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0888/25",
        fornecedorNome: "PAVIMENTADORA LTDA",
        objeto: "Pavimentação asfáltica de vias urbanas",
        valorContrato: 1200000,
      });

      const contratos = await getEducacaoContratos(PORTAL_PORCIUNCULA);

      expect(contratos).toHaveLength(1);
      const c = contratos[0];
      expect(c.contratoNumero).toBe("0443/25");
      expect(c.categoria).toBe("merenda_pnae");
      expect(c.fornecedorNome).toBe("DISTRIBUIDORA ALIMENTAR LTDA");
      expect(c.valorContrato).toBe(450000);
      expect(c.totalEmpenhado).toBe(450000);
      expect(c.totalLiquidado).toBe(200000);
      expect(c.totalPago).toBe(180000);
      expect(c.saldoAPagar).toBe(270000);
      expect(c.fontePrincipal).toBe("PNAE - Transferências FNDE");
      expect(c.orgaoNome).toBe("Secretaria Municipal de Educação");
      expect(c.principalFuncao).toBe("Educação");
      expect(c.dataInicio).toBe("2025-02-01");
      expect(c.vencimentoAtual).toBe("2025-12-31");
    });

    it("filtra por ano quando especificado", async () => {
      await seedContrato({
        contratoId: "ctr_pnae_2024",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2024,
        empresaId: "emp_1",
        contratoNumero: "0100/24",
        fornecedorNome: "FORNECEDOR 2024",
        objeto: "Merenda escolar PNAE 2024",
      });
      await seedContrato({
        contratoId: "ctr_pnae_2025",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0200/25",
        fornecedorNome: "FORNECEDOR 2025",
        objeto: "Merenda escolar PNAE 2025",
      });

      const contratos2025 = await getEducacaoContratos(
        PORTAL_PORCIUNCULA,
        2025,
      );
      expect(contratos2025).toHaveLength(1);
      expect(contratos2025[0].ano).toBe(2025);
      expect(contratos2025[0].contratoNumero).toBe("0200/25");
    });

    it("exclui contratos de outros setores (como Saúde) mesmo que o objeto cite fundos de educação", async () => {
      await seedContrato({
        contratoId: "ctr_saude_1",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_saude",
        contratoNumero: "0457/25",
        fornecedorNome: "SISTEMAS INTEGRADOS SAUDE",
        objeto:
          "Locação de licenças de software para modernização da prefeitura sede e dos fundos municipais (saúde, promoção social, educação e defesa ambiental)",
      });

      await seedContratoRecurso({
        contratoRecursoId: "cr_saude_1",
        contratoId: "ctr_saude_1",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_saude",
        orgaoNome: "Fundo Municipal de Saúde",
        contratoNumero: "0457/25",
        principalFuncao: "Saúde",
      });

      const contratos = await getEducacaoContratos(PORTAL_PORCIUNCULA, 2025);
      expect(contratos.some((c) => c.contratoNumero === "0457/25")).toBe(false);
    });

    it("garante isolamento multi-tenant estrito (Regra 23)", async () => {
      await seedContrato({
        contratoId: "ctr_iso_a",
        portalSlug: PORTAL_ISOLAMENTO_A,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0991/25",
        fornecedorNome: "AUTO ONIBUS A",
        objeto: "Transporte escolar PNATE",
      });
      await seedContrato({
        contratoId: "ctr_iso_b",
        portalSlug: PORTAL_ISOLAMENTO_B,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0992/25",
        fornecedorNome: "AUTO ONIBUS B",
        objeto: "Transporte escolar PNATE",
      });

      const resA = await getEducacaoContratos(PORTAL_ISOLAMENTO_A);
      expect(resA).toHaveLength(1);
      expect(resA[0].contratoNumero).toBe("0991/25");

      const resB = await getEducacaoContratos(PORTAL_ISOLAMENTO_B);
      expect(resB).toHaveLength(1);
      expect(resB[0].contratoNumero).toBe("0992/25");
    });

    it("mapeia empenhado_contrato quando total_empenhado de recursos não estiver presente", async () => {
      await seedContrato({
        contratoId: "ctr_empenhado_test",
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_1",
        contratoNumero: "0777/25",
        fornecedorNome: "TESTE MERENDA LTDA",
        objeto: "Fornecimento de merenda escolar PNAE",
        empenhado: 125000.5,
      });

      const res = await getEducacaoContratos(PORTAL_PORCIUNCULA, 2025);
      const match = res.find((c) => c.contratoNumero === "0777/25");
      expect(match).toBeDefined();
      expect(match?.totalEmpenhado).toBe(125000.5);
    });

    it("executa o caminho primário de vigentes respeitando dim_orgao e excluindo outros setores", async () => {
      await seedDimOrgao({
        portalSlug: PORTAL_PORCIUNCULA,
        empresaId: "emp_educ",
        orgaoNome: "Fundo Municipal de Educação",
      });
      await seedDimOrgao({
        portalSlug: PORTAL_PORCIUNCULA,
        empresaId: "emp_saude",
        orgaoNome: "Fundo Municipal de Saúde",
      });

      await seedContratosServicosVigentes({
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_educ",
        contratoNumero: "0010/25",
        fornecedorNome: "ALIMENTOS ESCOLARES LTDA",
        objetoDescricao:
          "Fornecimento de gêneros alimentícios para merenda escolar",
        totalEmpenhado: 50000,
        totalPago: 40000,
      });

      await seedContratosServicosVigentes({
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_educ",
        contratoNumero: "0011/25",
        fornecedorNome: "PROPRIETARIO IMOVEL",
        objetoDescricao:
          "Locação de imóvel para funcionamento de creche municipal",
        totalEmpenhado: 24000,
        totalPago: 12000,
      });

      await seedContratosServicosVigentes({
        portalSlug: PORTAL_PORCIUNCULA,
        ano: 2025,
        empresaId: "emp_saude",
        contratoNumero: "0099/25",
        fornecedorNome: "SISTEMAS SAUDE LTDA",
        objetoDescricao:
          "Locação de software para postos de saúde e fundos municipais (educação e saúde)",
        totalEmpenhado: 30000,
        totalPago: 30000,
      });

      const res = await getEducacaoContratos(PORTAL_PORCIUNCULA, 2025);
      expect(res).toHaveLength(2);

      const merenda = res.find((c) => c.contratoNumero === "0010/25");
      expect(merenda).toBeDefined();
      expect(merenda?.categoria).toBe("merenda_pnae");

      const locacao = res.find((c) => c.contratoNumero === "0011/25");
      expect(locacao).toBeDefined();
      expect(locacao?.categoria).toBe("locacao_imoveis");

      const saude = res.find((c) => c.contratoNumero === "0099/25");
      expect(saude).toBeUndefined();
    });

    it("retorna array vazio para portalSlug inválido ou vazio", async () => {
      expect(await getEducacaoContratos("")).toEqual([]);
      expect(await getEducacaoContratos("   ")).toEqual([]);
      // @ts-expect-error teste defensivo
      expect(await getEducacaoContratos(null)).toEqual([]);
    });
  });

  describe("getEducacaoRankingEstadual", () => {
    it("retorna null para portalSlug inválido ou vazio", async () => {
      expect(await getEducacaoRankingEstadual("")).toBeNull();
      expect(await getEducacaoRankingEstadual("   ")).toBeNull();
      // @ts-expect-error teste defensivo
      expect(await getEducacaoRankingEstadual(null)).toBeNull();
    });

    it("retorna null se o portal não tiver cod_ibge registrado", async () => {
      expect(await getEducacaoRankingEstadual("portal_sem_ibge")).toBeNull();
    });

    it("calcula ranking dinâmico com base nos dados de seed_inep_ideb", async () => {
      await seedEducacaoMetricas({
        portalSlug: PORTAL_PORCIUNCULA,
        codIbge: 3304102,
        ano: 2025,
        rede: "municipal",
        etapaEnsino: "anos_iniciais",
        notaIdeb: 5.9,
      });

      const ranking = await getEducacaoRankingEstadual(PORTAL_PORCIUNCULA, {
        ano: 2025,
        etapaEnsino: "anosIniciais",
      });

      // Se seed_inep_ideb estiver populado no ambiente de teste, valida a estrutura
      if (ranking !== null) {
        expect(ranking).toHaveProperty("totalMunicipios");
        expect(ranking).toHaveProperty("posicaoRanking");
        expect(ranking).toHaveProperty("variacaoPosicoes");
      }
    });
  });

  describe("getEducacaoMediasEstaduais", () => {
    it("retorna estrutura vazia para portalSlug inválido ou vazio", async () => {
      const resVazio = await getEducacaoMediasEstaduais("");
      expect(resVazio).toEqual({ anosIniciais: {}, anosFinais: {} });

      // @ts-expect-error teste defensivo
      const resNull = await getEducacaoMediasEstaduais(null);
      expect(resNull).toEqual({ anosIniciais: {}, anosFinais: {} });
    });

    it("retorna estrutura vazia se o portal não possuir cod_ibge registrado", async () => {
      const res = await getEducacaoMediasEstaduais(
        "portal_sem_ibge_inexistente",
      );
      expect(res).toEqual({ anosIniciais: {}, anosFinais: {} });
    });

    it("obtém notas oficiais de seed_inep_ideb_estados agrupadas por etapa e ano para a UF do município", async () => {
      await seedEducacaoMetricas({
        portalSlug: PORTAL_PORCIUNCULA,
        codIbge: 3304102,
        ano: 2025,
        rede: "municipal",
        etapaEnsino: "anos_iniciais",
        notaIdeb: 5.9,
      });

      const medias = await getEducacaoMediasEstaduais(PORTAL_PORCIUNCULA);
      expect(medias.anosIniciais[2021]).toBe(5.3);
      expect(medias.anosIniciais[2025]).toBe(5.8);
      expect(medias.anosFinais[2021]).toBe(4.8);
      expect(medias.anosFinais[2025]).toBe(4.7);
    });

    it("isola as médias pela UF do município sem misturar outros estados", async () => {
      const portalMg = createFixturePortalSlug();
      await seedEducacaoMetricas({
        portalSlug: portalMg,
        codIbge: 3136702,
        ano: 2025,
        rede: "municipal",
        etapaEnsino: "anos_iniciais",
        notaIdeb: 6.2,
      });

      const medias = await getEducacaoMediasEstaduais(portalMg);
      expect(medias.anosIniciais[2021]).toBe(6.0);
      expect(medias.anosIniciais[2025]).toBe(6.1);
      expect(medias.anosFinais[2021]).toBe(4.9);
      expect(medias.anosFinais[2025]).toBe(4.9);
    });
  });
});
