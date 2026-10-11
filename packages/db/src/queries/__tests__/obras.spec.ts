import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedObra,
} from "../../../tests/fixtures/seed";
import {
  getObraDetalhe,
  getObrasPorPortal,
  getResumoObrasPorPortal,
} from "../obras";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL_A);
  await cleanupFixtures(PORTAL_B);
});

describe("obras queries", () => {
  describe("getObrasPorPortal", () => {
    it("deve retornar array vazio se portalSlug for vazio ou inválido", async () => {
      expect(await getObrasPorPortal("")).toEqual([]);
      expect(await getObrasPorPortal("   ")).toEqual([]);
      // @ts-expect-error teste com valor inválido em tempo de execução
      expect(await getObrasPorPortal(null)).toEqual([]);
      // @ts-expect-error teste com valor inválido em tempo de execução
      expect(await getObrasPorPortal(undefined)).toEqual([]);
    });

    it("deve retornar array vazio se o portal não possuir obras", async () => {
      const obras = await getObrasPorPortal(PORTAL_A);
      expect(obras).toEqual([]);
    });

    it("deve retornar lista ordenada por valorInvestimentoPrevisto desc com campos estritamente em camelCase", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_menor",
        nomeObra: "Construção de Praça",
        situacao: "em_execucao",
        orgaoResponsavel: "Secretaria de Obras",
        valorInvestimentoPrevisto: 100000,
        percentualExecucaoFisica: 40.5,
        dataUltimaMedicao: "2024-05-10",
        latitude: -20.75,
        longitude: -42.04,
        dataInicioPrevista: "2024-01-01",
        dataFimPrevista: "2024-12-31",
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_maior",
        nomeObra: "Pavimentação Asfáltica",
        situacao: "concluida",
        orgaoResponsavel: "Secretaria de Infraestrutura",
        valorInvestimentoPrevisto: 500000,
        percentualExecucaoFisica: 100,
        dataUltimaMedicao: "2024-06-15",
        latitude: -20.76,
        longitude: -42.05,
      });

      const obras = await getObrasPorPortal(PORTAL_A);
      expect(obras).toHaveLength(2);

      // Ordenação decrescente por valorInvestimentoPrevisto
      expect(obras[0].idProjeto).toBe("proj_maior");
      expect(obras[0].valorInvestimentoPrevisto).toBe(500000);
      expect(obras[1].idProjeto).toBe("proj_menor");
      expect(obras[1].valorInvestimentoPrevisto).toBe(100000);

      // Verificação estrita de propriedades em camelCase (Regra 18)
      const obra = obras[0];
      expect(obra).toHaveProperty("idProjeto");
      expect(obra).toHaveProperty("portalSlug");
      expect(obra).toHaveProperty("nomeObra");
      expect(obra).toHaveProperty("situacao");
      expect(obra).toHaveProperty("orgaoResponsavel");
      expect(obra).toHaveProperty("valorInvestimentoPrevisto");
      expect(obra).toHaveProperty("percentualExecucaoFisica");
      expect(obra).toHaveProperty("dataUltimaMedicao");
      expect(obra).toHaveProperty("latitude");
      expect(obra).toHaveProperty("longitude");
      expect(obra).toHaveProperty("motivoParalisacao");
      expect(obra).toHaveProperty("dataInicioPrevista");
      expect(obra).toHaveProperty("dataFimPrevista");

      // Nenhuma chave snake_case permitida
      expect(obra).not.toHaveProperty("id_projeto");
      expect(obra).not.toHaveProperty("portal_slug");
      expect(obra).not.toHaveProperty("nome_obra");
      expect(obra).not.toHaveProperty("orgao_responsavel");
      expect(obra).not.toHaveProperty("valor_investimento_previsto");
      expect(obra).not.toHaveProperty("percentual_execucao_fisica");
      expect(obra).not.toHaveProperty("data_ultima_medicao");
      expect(obra).not.toHaveProperty("motivo_paralisacao");
      expect(obra).not.toHaveProperty("data_inicio_prevista");
      expect(obra).not.toHaveProperty("data_fim_prevista");
    });

    it("deve ordenar obras com valorInvestimentoPrevisto nulo por último (nulls last)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_sem_valor",
        nomeObra: "Obra Não Valorada",
        valorInvestimentoPrevisto: null,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_com_valor_alto",
        nomeObra: "Obra Cara",
        valorInvestimentoPrevisto: 1000000,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_com_valor_baixo",
        nomeObra: "Obra Barata",
        valorInvestimentoPrevisto: 50000,
      });

      const obras = await getObrasPorPortal(PORTAL_A);
      expect(obras).toHaveLength(3);
      expect(obras[0].idProjeto).toBe("proj_com_valor_alto");
      expect(obras[0].valorInvestimentoPrevisto).toBe(1000000);
      expect(obras[1].idProjeto).toBe("proj_com_valor_baixo");
      expect(obras[1].valorInvestimentoPrevisto).toBe(50000);
      expect(obras[2].idProjeto).toBe("proj_sem_valor");
      expect(obras[2].valorInvestimentoPrevisto).toBe(0);
    });

    it("deve filtrar por situação 'paralisada' e retornar motivoParalisacao preenchido", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_paralisado",
        nomeObra: "Reforma de Posto de Saúde",
        situacao: "paralisada",
        motivoParalisacao: "Rescisão unilateral de contrato",
        valorInvestimentoPrevisto: 150000,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_ativo",
        nomeObra: "Construção de Creche",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 300000,
      });

      const paralisadas = await getObrasPorPortal(PORTAL_A, {
        status: "paralisada",
      });
      expect(paralisadas).toHaveLength(1);
      expect(paralisadas[0].idProjeto).toBe("proj_paralisado");
      expect(paralisadas[0].situacao).toBe("paralisada");
      expect(paralisadas[0].motivoParalisacao).toBe(
        "Rescisão unilateral de contrato",
      );
    });

    it("deve retornar todas as obras quando o filtro status for 'todas'", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_1",
        situacao: "em_execucao",
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_2",
        situacao: "concluida",
      });

      const todas = await getObrasPorPortal(PORTAL_A, { status: "todas" });
      expect(todas).toHaveLength(2);
    });

    it("deve buscar textualmente com normalização unaccent e insensibilidade a caixa por nome, órgão ou id_projeto", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_educ_99",
        nomeObra: "Reforma da Creche Municipal São José",
        orgaoResponsavel: "Secretaria de Educação",
        valorInvestimentoPrevisto: 200000,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_saude_88",
        nomeObra: "Ampliação da UBS Centro",
        orgaoResponsavel: "Secretaria Municipal de Saúde",
        valorInvestimentoPrevisto: 180000,
      });

      // Busca por id_projeto
      const buscaPorId = await getObrasPorPortal(PORTAL_A, {
        busca: "educ_99",
      });
      expect(buscaPorId).toHaveLength(1);
      expect(buscaPorId[0].idProjeto).toBe("proj_educ_99");

      // Busca sem acento para termo acentuado na base
      const buscaCreche = await getObrasPorPortal(PORTAL_A, {
        busca: "reforma de creche",
      });
      expect(buscaCreche).toHaveLength(0); // "de creche" não é substring exata de "Reforma da Creche"

      const buscaCrecheExata = await getObrasPorPortal(PORTAL_A, {
        busca: "creche",
      });
      expect(buscaCrecheExata).toHaveLength(1);
      expect(buscaCrecheExata[0].idProjeto).toBe("proj_educ_99");

      // Busca com acento para termo sem acento ou acentuado
      const buscaSaoJose = await getObrasPorPortal(PORTAL_A, {
        busca: "sao jose",
      });
      expect(buscaSaoJose).toHaveLength(1);
      expect(buscaSaoJose[0].idProjeto).toBe("proj_educ_99");

      // Busca no órgão responsável
      const buscaEducacao = await getObrasPorPortal(PORTAL_A, {
        busca: "educacao",
      });
      expect(buscaEducacao).toHaveLength(1);
      expect(buscaEducacao[0].idProjeto).toBe("proj_educ_99");

      const buscaSaude = await getObrasPorPortal(PORTAL_A, {
        busca: "saude",
      });
      expect(buscaSaude).toHaveLength(1);
      expect(buscaSaude[0].idProjeto).toBe("proj_saude_88");

      // Busca com menos de 2 caracteres deve ser ignorada
      const buscaCurta = await getObrasPorPortal(PORTAL_A, {
        busca: "a",
      });
      expect(buscaCurta).toHaveLength(2);
    });

    it("deve respeitar limite e offset na paginação e ignorar valores não inteiros ou negativos", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "p1",
        valorInvestimentoPrevisto: 300,
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "p2",
        valorInvestimentoPrevisto: 200,
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "p3",
        valorInvestimentoPrevisto: 100,
      });

      const pag1 = await getObrasPorPortal(PORTAL_A, { limite: 2, offset: 0 });
      expect(pag1).toHaveLength(2);
      expect(pag1[0].idProjeto).toBe("p1");
      expect(pag1[1].idProjeto).toBe("p2");

      const pag2 = await getObrasPorPortal(PORTAL_A, { limite: 2, offset: 2 });
      expect(pag2).toHaveLength(1);
      expect(pag2[0].idProjeto).toBe("p3");

      // Valores negativos ou não inteiros não devem quebrar nem aplicar cláusulas inválidas
      const semPaginacaoInvalida = await getObrasPorPortal(PORTAL_A, {
        limite: -5,
        offset: -1,
      });
      expect(semPaginacaoInvalida).toHaveLength(3);

      const pagFloat = await getObrasPorPortal(PORTAL_A, {
        limite: 1.5,
        offset: 0.5,
      });
      expect(pagFloat).toHaveLength(3);
    });

    it("deve validar limites de coordenadas brasileiras e filtrar dummy (0, 0), positivas (África/oceanos) e espelhadas", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_valido",
        latitude: -20.75,
        longitude: -42.04,
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_dummy_zero",
        latitude: 0,
        longitude: 0,
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_fora_limite",
        latitude: 99.99,
        longitude: -200,
      });
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_africa_positiva",
        latitude: -22.048,
        longitude: 22.048,
      });

      const detalheValido = await getObraDetalhe(PORTAL_A, "proj_valido");
      expect(detalheValido?.latitude).toBe(-20.75);
      expect(detalheValido?.longitude).toBe(-42.04);

      const detalheDummy = await getObraDetalhe(PORTAL_A, "proj_dummy_zero");
      expect(detalheDummy?.latitude).toBeNull();
      expect(detalheDummy?.longitude).toBeNull();

      const detalheFora = await getObraDetalhe(PORTAL_A, "proj_fora_limite");
      expect(detalheFora?.latitude).toBeNull();
      expect(detalheFora?.longitude).toBeNull();

      const detalheAfrica = await getObraDetalhe(
        PORTAL_A,
        "proj_africa_positiva",
      );
      expect(detalheAfrica?.latitude).toBeNull();
      expect(detalheAfrica?.longitude).toBeNull();
    });

    it("deve formatar data sem deslocamento de timezone", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_data",
        dataUltimaMedicao: "2024-03-01",
      });

      const detalhe = await getObraDetalhe(PORTAL_A, "proj_data");
      expect(detalhe?.dataUltimaMedicao).toBe("2024-03-01");
    });

    it("deve garantir estrito isolamento multi-tenant entre prefeituras", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_portal_a",
        nomeObra: "Obra de A",
        valorInvestimentoPrevisto: 100000,
      });

      await seedObra({
        portalSlug: PORTAL_B,
        idProjeto: "proj_portal_b",
        nomeObra: "Obra de B",
        valorInvestimentoPrevisto: 200000,
      });

      const obrasA = await getObrasPorPortal(PORTAL_A);
      expect(obrasA).toHaveLength(1);
      expect(obrasA[0].idProjeto).toBe("proj_portal_a");

      const obrasB = await getObrasPorPortal(PORTAL_B);
      expect(obrasB).toHaveLength(1);
      expect(obrasB[0].idProjeto).toBe("proj_portal_b");
    });
  });

  describe("getObraDetalhe", () => {
    it("deve retornar null se portalSlug ou idProjeto forem inválidos", async () => {
      expect(await getObraDetalhe("", "proj_1")).toBeNull();
      expect(await getObraDetalhe("   ", "proj_1")).toBeNull();
      expect(await getObraDetalhe(PORTAL_A, "")).toBeNull();
      expect(await getObraDetalhe(PORTAL_A, "   ")).toBeNull();
      // @ts-expect-error teste de runtime
      expect(await getObraDetalhe(null, "proj_1")).toBeNull();
      // @ts-expect-error teste de runtime
      expect(await getObraDetalhe(PORTAL_A, null)).toBeNull();
    });

    it("deve retornar o detalhe completo da obra existente", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_detalhe",
        nomeObra: "Construção de Escola",
        situacao: "em_execucao",
        orgaoResponsavel: "Secretaria de Educação",
        valorInvestimentoPrevisto: 750000.5,
        percentualExecucaoFisica: 55.25,
        dataUltimaMedicao: "2024-04-18",
        latitude: -20.745,
        longitude: -42.043,
        dataInicioPrevista: "2024-02-01",
        dataFimPrevista: "2024-11-30",
      });

      const detalhe = await getObraDetalhe(PORTAL_A, "proj_detalhe");
      expect(detalhe).not.toBeNull();
      expect(detalhe?.idProjeto).toBe("proj_detalhe");
      expect(detalhe?.portalSlug).toBe(PORTAL_A);
      expect(detalhe?.nomeObra).toBe("Construção de Escola");
      expect(detalhe?.situacao).toBe("em_execucao");
      expect(detalhe?.orgaoResponsavel).toBe("Secretaria de Educação");
      expect(detalhe?.valorInvestimentoPrevisto).toBe(750000.5);
      expect(detalhe?.percentualExecucaoFisica).toBe(55.25);
      expect(detalhe?.dataUltimaMedicao).toBe("2024-04-18");
      expect(detalhe?.latitude).toBe(-20.745);
      expect(detalhe?.longitude).toBe(-42.043);
      expect(detalhe?.dataInicioPrevista).toBe("2024-02-01");
      expect(detalhe?.dataFimPrevista).toBe("2024-11-30");
    });

    it("deve retornar null se idProjeto não existir no portal", async () => {
      const detalhe = await getObraDetalhe(PORTAL_A, "id_inexistente");
      expect(detalhe).toBeNull();
    });

    it("deve retornar null ao buscar obra pertencente a outro portal (isolamento multi-tenant)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "proj_compartilhado",
        nomeObra: "Obra Exclusiva A",
      });

      const tentativaEmB = await getObraDetalhe(PORTAL_B, "proj_compartilhado");
      expect(tentativaEmB).toBeNull();
    });
  });

  describe("getResumoObrasPorPortal", () => {
    it("deve retornar resumo zerado se portalSlug for vazio ou inválido", async () => {
      const zerado = {
        totalObras: 0,
        emExecucao: 0,
        paralisadas: 0,
        concluidas: 0,
        cadastradas: 0,
        canceladas: 0,
        valorTotalInvestimento: 0,
        valorEmExecucao: 0,
        valorParalisadas: 0,
        valorConcluidas: 0,
        valorCadastradas: 0,
        percentualMedioExecucaoFisica: null,
        obrasSemMedicaoCount: 0,
      };

      expect(await getResumoObrasPorPortal("")).toEqual(zerado);
      expect(await getResumoObrasPorPortal("   ")).toEqual(zerado);
      // @ts-expect-error teste de runtime
      expect(await getResumoObrasPorPortal(null)).toEqual(zerado);
    });

    it("deve retornar resumo zerado se o município não possuir obras", async () => {
      const resumo = await getResumoObrasPorPortal(PORTAL_A);
      expect(resumo).toEqual({
        totalObras: 0,
        emExecucao: 0,
        paralisadas: 0,
        concluidas: 0,
        cadastradas: 0,
        canceladas: 0,
        valorTotalInvestimento: 0,
        valorEmExecucao: 0,
        valorParalisadas: 0,
        valorConcluidas: 0,
        valorCadastradas: 0,
        percentualMedioExecucaoFisica: null,
        obrasSemMedicaoCount: 0,
      });
    });

    it("deve agregar contadores por status, soma de investimento e percentual médio de execução", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob1",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 200000,
        percentualExecucaoFisica: 50,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob2",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 300000,
        percentualExecucaoFisica: 70,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob3",
        situacao: "paralisada",
        valorInvestimentoPrevisto: 150000,
        percentualExecucaoFisica: 20,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob4",
        situacao: "concluida",
        valorInvestimentoPrevisto: 100000,
        percentualExecucaoFisica: 100,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob5",
        situacao: "cadastrada",
        valorInvestimentoPrevisto: 50000,
        percentualExecucaoFisica: null,
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob6",
        situacao: "cancelada",
        valorInvestimentoPrevisto: 25000,
        percentualExecucaoFisica: null,
      });

      const resumo = await getResumoObrasPorPortal(PORTAL_A);

      expect(resumo.totalObras).toBe(6);
      expect(resumo.emExecucao).toBe(2);
      expect(resumo.paralisadas).toBe(1);
      expect(resumo.concluidas).toBe(1);
      expect(resumo.cadastradas).toBe(1);
      expect(resumo.canceladas).toBe(1);
      expect(resumo.valorTotalInvestimento).toBe(825000);
      expect(resumo.valorEmExecucao).toBe(500000);
      expect(resumo.valorParalisadas).toBe(150000);
      expect(resumo.valorConcluidas).toBe(100000);
      expect(resumo.valorCadastradas).toBe(50000);
      expect(resumo.obrasSemMedicaoCount).toBe(2);
      // Média de percentual (50 + 70 + 20 + 100) / 4 = 240 / 4 = 60
      expect(resumo.percentualMedioExecucaoFisica).toBe(60);
    });

    it("deve filtrar obras e resumo por ano de início previsto", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob_2024",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 100000,
        dataInicioPrevista: "2024-03-01",
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob_2026",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 200000,
        dataInicioPrevista: "2026-02-15",
      });

      // Em 2024, só ob_2024 deve aparecer
      const obras2024 = await getObrasPorPortal(PORTAL_A, { ano: 2024 });
      expect(obras2024).toHaveLength(1);
      expect(obras2024[0].idProjeto).toBe("ob_2024");

      const resumo2024 = await getResumoObrasPorPortal(PORTAL_A, { ano: 2024 });
      expect(resumo2024.totalObras).toBe(1);
      expect(resumo2024.valorTotalInvestimento).toBe(100000);

      // Em 2026, ambas devem aparecer
      const obras2026 = await getObrasPorPortal(PORTAL_A, { ano: 2026 });
      expect(obras2026).toHaveLength(2);

      const resumo2026 = await getResumoObrasPorPortal(PORTAL_A, { ano: 2026 });
      expect(resumo2026.totalObras).toBe(2);
      expect(resumo2026.valorTotalInvestimento).toBe(300000);
    });

    it("deve isolar agregados por município", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "obA",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 100000,
      });

      await seedObra({
        portalSlug: PORTAL_B,
        idProjeto: "obB",
        situacao: "concluida",
        valorInvestimentoPrevisto: 200000,
      });

      const resumoA = await getResumoObrasPorPortal(PORTAL_A);
      expect(resumoA.totalObras).toBe(1);
      expect(resumoA.emExecucao).toBe(1);
      expect(resumoA.concluidas).toBe(0);
      expect(resumoA.valorTotalInvestimento).toBe(100000);

      const resumoB = await getResumoObrasPorPortal(PORTAL_B);
      expect(resumoB.totalObras).toBe(1);
      expect(resumoB.emExecucao).toBe(0);
      expect(resumoB.concluidas).toBe(1);
      expect(resumoB.valorTotalInvestimento).toBe(200000);
    });
  });
});
