import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContrato,
  seedObra,
} from "../../../tests/fixtures/seed";
import {
  getContratosPorObra,
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

    it("deve enriquecer getObraDetalhe com contratos municipais correlacionados", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-ENRICH",
        nomeObra: "Construção de Ponte Municipal",
        valorInvestimentoPrevisto: 1200000,
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-042/2024",
        fornecedorNome: "CONSTRUTORA PONTE FORTE LTDA",
        fornecedorCpfCnpj: "12345678000190",
        objeto: "Construção de Ponte Municipal no centro",
        valorContrato: 1150000,
        modalidade: "concorrencia_eletronica",
        numeroObra: "OBR-ENRICH",
        vencimentoAtual: "2099-12-31",
      });

      const detalhe = await getObraDetalhe(PORTAL_A, "OBR-ENRICH");
      expect(detalhe).not.toBeNull();
      expect(detalhe?.contratos).toBeDefined();
      expect(detalhe?.contratos).toHaveLength(1);
      expect(detalhe?.contratos?.[0].contratoNumero).toBe("CTR-042/2024");
      expect(detalhe?.contratos?.[0].status).toBe("vigente");
      expect(detalhe?.contratos?.[0].valorContrato).toBe(1150000);
    });
  });

  describe("getContratosPorObra", () => {
    it("deve retornar array vazio se portalSlug ou idProjeto forem inválidos", async () => {
      expect(await getContratosPorObra("", "101")).toEqual([]);
      expect(await getContratosPorObra("   ", "101")).toEqual([]);
      expect(await getContratosPorObra(PORTAL_A, "")).toEqual([]);
      expect(await getContratosPorObra(PORTAL_A, "   ")).toEqual([]);
      // @ts-expect-error teste de runtime
      expect(await getContratosPorObra(null, "101")).toEqual([]);
      // @ts-expect-error teste de runtime
      expect(await getContratosPorObra(PORTAL_A, null)).toEqual([]);
    });

    it("deve retornar array vazio se a obra não possuir contratos correlacionados", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-FEDERAL-999",
        nomeObra: "Obra de Execução Federal Direta Sem Contrato Local",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-FEDERAL-999");
      expect(contratos).toEqual([]);
    });

    it("deve correlacionar contratos pelo campo explícito numero_obra", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-100",
        nomeObra: "Reforma Geral de Hospital",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-010/2024",
        fornecedorNome: "EMPREITEIRA ALPHA",
        fornecedorCpfCnpj: "11222333000144",
        objeto: "Prestação de serviços diversos",
        valorContrato: 450000,
        modalidade: "concorrencia",
        numeroObra: "OBR-100",
        vencimentoAtual: "2099-01-01",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-100");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("CTR-010/2024");
      expect(contratos[0].fornecedorNome).toBe("EMPREITEIRA ALPHA");
      expect(contratos[0].valorContrato).toBe(450000);
      expect(contratos[0].status).toBe("vigente");
    });

    it("deve correlacionar contratos pela menção textual do ID do projeto no objeto (>= 4 dígitos)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "PROJ-8842",
        nomeObra: "Pavimentação do Bairro Novo",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-020/2024",
        fornecedorNome: "ASFALTO E OBRAS S/A",
        fornecedorCpfCnpj: "99888777000166",
        objeto: "Contratação de empresa para execução do PROJ-8842 lote 1",
        valorContrato: 800000,
        modalidade: "concorrencia",
        vencimentoAtual: "2099-06-30",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "PROJ-8842");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("CTR-020/2024");
    });

    it("deve correlacionar contratos contendo 'PROJETO <id>' para IDs curtos (< 4 caracteres)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "101",
        nomeObra: "Drenagem Pluvial Urbana",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-030/2024",
        fornecedorNome: "SANEAMENTO BRASIL LTDA",
        fornecedorCpfCnpj: "44555666000177",
        objeto: "Execução de obras referente ao PROJETO 101 da secretaria",
        valorContrato: 320000,
        modalidade: "dispensa",
        vencimentoAtual: "2099-12-31",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "101");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("CTR-030/2024");
    });

    it("deve correlacionar contratos por similaridade temática textual (word_similarity > 0.40)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-SIMILAR",
        nomeObra: "Construção de Creche Municipal Professora Maria de Lurdes",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-040/2024",
        fornecedorNome: "EDIFICACOES MODERNAS",
        fornecedorCpfCnpj: "12345678000190",
        objeto:
          "Contratação de engenharia para construção de creche municipal professora maria",
        valorContrato: 980000,
        modalidade: "concorrencia_eletronica",
        vencimentoAtual: "2099-10-15",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-SIMILAR");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("CTR-040/2024");
    });

    it("deve correlacionar obra com contrato cujo objeto resumido é truncado mas objeto_completo contém os termos da obra", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "16868.33-35",
        nomeObra: "Sistema de Esgotamento Sanitário",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "2937/24",
        fornecedorNome: "L.PHILIPPE CONSTRUCOES LTDA",
        objeto: "Contratação de empresa especializada para realização de obra",
        objetoCompleto:
          "Contratação de empresa especializada para realização de obras e serviços de esgotamento sanitário no Município de Porciúncula",
        valorContrato: 24698277.36,
        modalidade: "concorrencia",
        vencimentoAtual: "2099-12-31",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "16868.33-35");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("2937/24");
      expect(contratos[0].fornecedorNome).toBe("L.PHILIPPE CONSTRUCOES LTDA");
    });

    it("deve evitar falsos positivos operacionais e anacrônicos para obras com nomes genéricos (ex: IMPLANTACAO UBS)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "150213.33-18",
        nomeObra: "IMPLANTACAO UBS",
        dataFimPrevista: "2018-12-31",
        situacao: "concluida",
      });

      // Contrato operacional de SAMU (ano 2024, sem relação com obra civil da UBS)
      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "0192/24",
        fornecedorNome: "CONSORCIO PUBLICO SAMU 192",
        objeto: "CONT. RATEIO DE IMPLANTAÇÃO E CUSTEIO DO SAMU 192 NOROESTE",
        valorContrato: 290403.79,
        modalidade: "dispensa",
        vencimentoAtual: "2024-12-31",
      });

      // Contrato de software (ano 2025)
      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2025,
        contratoNumero: "0293/25",
        fornecedorNome: "LEIS LTDA",
        objeto:
          "Contratação de empresa para Implantação da Plataforma de Legislação",
        valorContrato: 58350.0,
        modalidade: "dispensa",
        vencimentoAtual: "2025-12-31",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "150213.33-18");
      expect(contratos).toHaveLength(0);
    });

    it("deve garantir estrito isolamento multi-tenant impedindo cross-tenant data leakage", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-SHARED-ID",
        nomeObra: "Praça do Município A",
      });

      await seedObra({
        portalSlug: PORTAL_B,
        idProjeto: "OBR-SHARED-ID",
        nomeObra: "Praça do Município B",
      });

      // Contrato com mesmo ID de obra mas pertencente ao Município B
      await seedContrato({
        portalSlug: PORTAL_B,
        ano: 2024,
        contratoNumero: "CTR-TENANT-B/2024",
        fornecedorNome: "FORNECEDOR MUNICÍPIO B",
        numeroObra: "OBR-SHARED-ID",
      });

      const contratosA = await getContratosPorObra(PORTAL_A, "OBR-SHARED-ID");
      expect(contratosA).toHaveLength(0);

      const contratosB = await getContratosPorObra(PORTAL_B, "OBR-SHARED-ID");
      expect(contratosB).toHaveLength(1);
      expect(contratosB[0].contratoNumero).toBe("CTR-TENANT-B/2024");
    });

    it("deve resolver status como 'vigente' para vencimento futuro e 'encerrado' para vencimento passado", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-STATUS",
        nomeObra: "Obras Viárias",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2023,
        contratoNumero: "CTR-ENCERRADO",
        numeroObra: "OBR-STATUS",
        vencimentoAtual: "2023-12-31",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-VIGENTE",
        numeroObra: "OBR-STATUS",
        vencimentoAtual: "2099-12-31",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-STATUS");
      expect(contratos).toHaveLength(2);

      const vigente = contratos.find((c) => c.contratoNumero === "CTR-VIGENTE");
      const encerrado = contratos.find(
        (c) => c.contratoNumero === "CTR-ENCERRADO",
      );

      expect(vigente?.status).toBe("vigente");
      expect(encerrado?.status).toBe("encerrado");
    });

    it("deve padronizar todas as propriedades estritamente em camelCase (Regra 18)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-CAMEL",
        nomeObra: "Canalização de Córrego",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-CAMEL/2024",
        fornecedorNome: "HIDRAULICA S/A",
        fornecedorCpfCnpj: "55666777000188",
        valorContrato: 650000,
        modalidade: "pregao_eletronico",
        licitacaoNumero: "LIC-005/2024",
        numeroObra: "OBR-CAMEL",
        dataInicio: "2024-02-01",
        vencimentoAtual: "2099-02-01",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-CAMEL");
      expect(contratos).toHaveLength(1);
      const c = contratos[0];

      expect(c).toHaveProperty("contratoId");
      expect(c).toHaveProperty("contratoNumero");
      expect(c).toHaveProperty("fornecedorNome");
      expect(c).toHaveProperty("fornecedorCpfCnpj");
      expect(c).toHaveProperty("valorContrato");
      expect(c).toHaveProperty("modalidade");
      expect(c).toHaveProperty("licitacaoNumero");
      expect(c).toHaveProperty("status");
      expect(c).toHaveProperty("dataInicio");
      expect(c).toHaveProperty("vencimentoAtual");

      expect(c).not.toHaveProperty("contrato_id");
      expect(c).not.toHaveProperty("contrato_numero");
      expect(c).not.toHaveProperty("fornecedor_nome");
      expect(c).not.toHaveProperty("fornecedor_cpf_cnpj");
      expect(c).not.toHaveProperty("valor_contrato");
      expect(c).not.toHaveProperty("licitacao_numero");
      expect(c).not.toHaveProperty("data_inicio");
      expect(c).not.toHaveProperty("vencimento_atual");
    });

    it("deve desduplicar contratos com mesmo contrato_numero em anos distintos (DISTINCT ON)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "OBR-DISTINCT",
        nomeObra: "Pavimentação do Centro",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2023,
        contratoNumero: "CTR-DEDUP/2023",
        numeroObra: "OBR-DISTINCT",
        valorContrato: 100000,
        vencimentoAtual: "2023-12-31",
      });

      // Mesmo contrato_numero mas exercício mais recente e valor maior
      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-DEDUP/2023",
        numeroObra: "OBR-DISTINCT",
        valorContrato: 250000,
        vencimentoAtual: "2099-12-31",
      });

      const contratos = await getContratosPorObra(PORTAL_A, "OBR-DISTINCT");
      expect(contratos).toHaveLength(1);
      expect(contratos[0].contratoNumero).toBe("CTR-DEDUP/2023");
      expect(contratos[0].valorContrato).toBe(250000);
      expect(contratos[0].status).toBe("vigente");
    });

    it("não deve casar falso positivo quando id_projeto for puramente numérico de 4 dígitos citado como ano no objeto", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "2024",
        nomeObra: "Reforma Geral de Posto de Saúde",
      });

      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-ANO-COINCIDENCIA",
        objeto:
          "Prestação de serviços contínuos no exercício de 2024 da prefeitura",
        valorContrato: 50000,
      });

      const contratos = await getContratosPorObra(PORTAL_A, "2024");
      expect(contratos).toHaveLength(0);

      // Porém, se citar expressamente "PROJETO 2024", deve casar
      await seedContrato({
        portalSlug: PORTAL_A,
        ano: 2024,
        contratoNumero: "CTR-PROJETO-EXPLICITO",
        objeto: "Execução de reforma referente ao PROJETO 2024 da saúde",
        valorContrato: 180000,
      });

      const contratosComProjeto = await getContratosPorObra(PORTAL_A, "2024");
      expect(contratosComProjeto).toHaveLength(1);
      expect(contratosComProjeto[0].contratoNumero).toBe(
        "CTR-PROJETO-EXPLICITO",
      );
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

    it("deve filtrar obras e resumo pelo exercício ativo (ano de início, fim ou medição)", async () => {
      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob_2024",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 100000,
        dataInicioPrevista: "2024-03-01",
        dataFimPrevista: "2024-12-31",
      });

      await seedObra({
        portalSlug: PORTAL_A,
        idProjeto: "ob_2026",
        situacao: "em_execucao",
        valorInvestimentoPrevisto: 200000,
        dataInicioPrevista: "2026-02-15",
        dataFimPrevista: "2026-11-30",
      });

      // Em 2024, só ob_2024 está ativa
      const obras2024 = await getObrasPorPortal(PORTAL_A, { ano: 2024 });
      expect(obras2024).toHaveLength(1);
      expect(obras2024[0].idProjeto).toBe("ob_2024");

      const resumo2024 = await getResumoObrasPorPortal(PORTAL_A, { ano: 2024 });
      expect(resumo2024.totalObras).toBe(1);
      expect(resumo2024.valorTotalInvestimento).toBe(100000);

      // Em 2026, só ob_2026 está ativa (ob_2024 encerrou em 2024)
      const obras2026 = await getObrasPorPortal(PORTAL_A, { ano: 2026 });
      expect(obras2026).toHaveLength(1);
      expect(obras2026[0].idProjeto).toBe("ob_2026");

      const resumo2026 = await getResumoObrasPorPortal(PORTAL_A, { ano: 2026 });
      expect(resumo2026.totalObras).toBe(1);
      expect(resumo2026.valorTotalInvestimento).toBe(200000);
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
