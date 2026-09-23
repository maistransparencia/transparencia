import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContrato,
  seedLicitacao,
  seedLicitacaoItem,
} from "../../../tests/fixtures/seed";
import { searchLicitacoesEContratos } from "../licitacoes-contratos-search";

const FIXTURE_PORTAL = createFixturePortalSlug();

describe("searchLicitacoesEContratos", () => {
  beforeEach(async () => {
    await cleanupFixtures(FIXTURE_PORTAL);

    // Sementeia licitações para teste
    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      licitacaoNumero: "0043/24",
      objeto: "Locação de veículos leves e pesados para a frota municipal",
      modalidade: "pregao_eletronico",
      valorEstimado: 150000,
      situacao: "em_andamento",
    });

    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2023,
      licitacaoNumero: "0012/23",
      objeto: "Aquisição de computadores e notebooks",
      modalidade: "concorrencia",
      valorEstimado: 85000,
      situacao: "encerrada",
    });

    // Sementeia contratos para teste
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      contratoNumero: "0043/24",
      fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
      objeto: "Locação de Imóvel Residencial e Comercial",
      valorContrato: 24000,
      modalidade: "dispensa",
      vencimentoAtual: "2099-12-31",
    });

    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2023,
      contratoNumero: "0088/23",
      fornecedorNome: "AUTO MECANICA SILVA LTDA",
      objeto: "Manutenção de frota escolar",
      valorContrato: 32000,
      modalidade: "pregao_presencial",
      vencimentoAtual: "2020-01-01",
    });
  });

  afterEach(async () => {
    await cleanupFixtures(FIXTURE_PORTAL);
  });

  it("deve retornar lista vazia e total 0 para termo curto (< 2 caracteres) ou vazio", async () => {
    const emptyResult = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "",
    });
    expect(emptyResult.total).toBe(0);
    expect(emptyResult.licitacoes).toEqual([]);
    expect(emptyResult.contratos).toEqual([]);

    const singleCharResult = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "a",
    });
    expect(singleCharResult.total).toBe(0);
  });

  it("deve retornar lista vazia para portalSlug vazio", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: "",
      termo: "veiculos",
    });
    expect(result.total).toBe(0);
    expect(result.licitacoes).toEqual([]);
    expect(result.contratos).toEqual([]);
  });

  it("deve realizar busca exata por número com máscara (ex: 0043/24) priorizando match exato", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
    });

    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.licitacoes.length).toBeGreaterThanOrEqual(1);
    expect(result.contratos.length).toBeGreaterThanOrEqual(1);

    const licitacao = result.licitacoes[0];
    expect(licitacao.numero).toBe("0043/24");
    expect(licitacao.tipo).toBe("licitacao");
    expect(licitacao.href).toContain("numero=0043%2F24");

    const contrato = result.contratos[0];
    expect(contrato.numero).toBe("0043/24");
    expect(contrato.tipo).toBe("contrato");
    expect(contrato.fornecedorNome).toBe("JUSTINA REGINA R. MONTEIRO");
    expect(contrato.href).toContain("contratoNumero=0043%2F24");
  });

  it("deve buscar por termos sem acento via unaccent (ex: 'locacao de veiculos')", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "locacao de veiculos",
    });

    expect(result.licitacoes.length).toBeGreaterThanOrEqual(1);
    expect(result.licitacoes[0].objeto).toContain("veículos");
  });

  it("deve buscar por razão social ou fornecedor parcial (ex: 'justina')", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "justina",
    });

    expect(result.contratos.length).toBeGreaterThanOrEqual(1);
    expect(result.contratos[0].fornecedorNome).toBe(
      "JUSTINA REGINA R. MONTEIRO",
    );
  });

  it("deve retornar zero resultados para termos inexistentes", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "termo_inexistente_xyz_123",
    });

    expect(result.total).toBe(0);
    expect(result.licitacoes).toEqual([]);
    expect(result.contratos).toEqual([]);
  });

  it("deve filtrar por ano quando especificado", async () => {
    const result2024 = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "veiculos",
      ano: 2024,
    });
    expect(result2024.licitacoes.every((l) => l.ano === 2024)).toBe(true);

    const result2023 = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "computadores",
      ano: 2024,
    });
    expect(result2023.total).toBe(0);
  });

  it("deve filtrar por tipo ('licitacao' ou 'contrato')", async () => {
    const licitacoesApenas = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
      tipo: "licitacao",
    });
    expect(licitacoesApenas.licitacoes.length).toBeGreaterThan(0);
    expect(licitacoesApenas.contratos).toEqual([]);

    const contratosApenas = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
      tipo: "contrato",
    });
    expect(contratosApenas.contratos.length).toBeGreaterThan(0);
    expect(contratosApenas.licitacoes).toEqual([]);
  });

  it("deve respeitar o limite de resultados por categoria", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
      limite: 1,
    });

    expect(result.licitacoes.length).toBeLessThanOrEqual(1);
    expect(result.contratos.length).toBeLessThanOrEqual(1);
  });

  it("deve produzir DTOs estritamente em camelCase e com propriedades válidas", async () => {
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
    });

    const item = result.contratos[0];
    expect(item).toBeDefined();
    expect(typeof item.id).toBe("string");
    expect(item.tipo).toBe("contrato");
    expect(typeof item.numero).toBe("string");
    expect(typeof item.objeto).toBe("string");
    expect(typeof item.fornecedorNome).toBe("string");
    expect(typeof item.valor).toBe("number");
    expect(typeof item.ano).toBe("number");
    expect(typeof item.portalSlug).toBe("string");
    expect(typeof item.href).toBe("string");
  });

  it("deve resolver status de contrato como 'vigente' para vencimento futuro e 'encerrado' para vencimento passado", async () => {
    const resultVigente = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
      tipo: "contrato",
    });
    expect(resultVigente.contratos.length).toBeGreaterThan(0);
    expect(resultVigente.contratos[0].status).toBe("vigente");

    const resultEncerrado = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0088/23",
      tipo: "contrato",
    });
    expect(resultEncerrado.contratos.length).toBeGreaterThan(0);
    expect(resultEncerrado.contratos[0].status).toBe("encerrado");
  });

  it("deve buscar contratos por CNPJ ou pelo número da licitação de origem", async () => {
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      contratoNumero: "0999/24",
      fornecedorNome: "FORNECEDOR ESPECIAL LTDA",
      fornecedorCpfCnpj: "99.888.777/0001-66",
      licitacaoNumero: "LIC-ORIGEM-77",
      objeto: "Fornecimento de equipamentos",
    });

    const byCnpj = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "99.888.777",
      tipo: "contrato",
    });
    expect(byCnpj.contratos.length).toBeGreaterThan(0);
    expect(byCnpj.contratos[0].numero).toBe("0999/24");

    const byLicitacaoOrigem = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "LIC-ORIGEM-77",
      tipo: "contrato",
    });
    expect(byLicitacaoOrigem.contratos.length).toBeGreaterThan(0);
    expect(byLicitacaoOrigem.contratos[0].numero).toBe("0999/24");
  });

  it("deve encontrar contrato plurianual ativo de anos anteriores ao filtrar pelo exercício corrente", async () => {
    // Contrato celebrado em 2024 vigente até 2027
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      contratoNumero: "PLURI-001/24",
      fornecedorNome: "CONSTRUTORA HORIZONTE LTDA",
      objeto: "Construção do complexo esportivo municipal",
      dataInicio: "2024-03-01",
      vencimentoAtual: "2027-03-01",
      valorContrato: 500000,
    });

    // Contrato celebrado em 2024 já encerrado em 2025
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      contratoNumero: "ENCER-002/24",
      fornecedorNome: "EMPRESA ENCERRADA",
      objeto: "Construção de muro escolar",
      dataInicio: "2024-01-01",
      vencimentoAtual: "2025-12-31",
      valorContrato: 40000,
    });

    // Contrato celebrado em 2024 sem dataInicio, mas com vencimentoAtual em 2026
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2024,
      contratoNumero: "PLURI-NODATE/24",
      fornecedorNome: "SERVICOS AMBIENTAIS LTDA",
      objeto: "Manutenção de áreas verdes",
      dataInicio: null,
      vencimentoAtual: "2026-12-31",
      valorContrato: 60000,
    });

    // Busca sob o exercício 2026
    const result2026 = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      termo: "Construção",
      tipo: "contrato",
    });

    expect(result2026.contratos.some((c) => c.numero === "PLURI-001/24")).toBe(
      true,
    );
    expect(result2026.contratos.some((c) => c.numero === "ENCER-002/24")).toBe(
      false,
    );

    const contratoPluri = result2026.contratos.find(
      (c) => c.numero === "PLURI-001/24",
    );
    expect(contratoPluri).toBeDefined();
    expect(contratoPluri?.ano).toBe(2024);
    expect(contratoPluri?.anoCelebracao).toBe(2024);
    expect(contratoPluri?.status).toBe("vigente");
    expect(contratoPluri?.dataInicio).toBe("2024-03-01");
    expect(contratoPluri?.vencimentoAtual).toBe("2027-03-01");

    // Contrato sem dataInicio mas ano <= 2026 e vencimentoAtual >= 2026
    const resultManutencao = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      termo: "Manutenção",
      tipo: "contrato",
    });
    expect(
      resultManutencao.contratos.some((c) => c.numero === "PLURI-NODATE/24"),
    ).toBe(true);
  });

  it("deve encontrar licitação por nome ou documento de fornecedor homologado em seus itens", async () => {
    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-HOMOL-01/26",
      objeto: "Aquisição de materiais permanentes e mobiliário",
      situacao: "homologada",
    });

    await seedLicitacaoItem({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-HOMOL-01/26",
      numeroItem: 1,
      descricao: "Armários de aço",
      fornecedorNome: "DOHA EMPREENDIMENTOS E SERVICOS LTDA",
      fornecedorCpfCnpj: "11.222.333/0001-44",
      situacaoItem: "homologado",
    });

    // Busca pelo nome do fornecedor homologado
    const byNome = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "DOHA",
      tipo: "licitacao",
    });
    expect(byNome.licitacoes.length).toBeGreaterThan(0);
    const itemEncontrado = byNome.licitacoes.find(
      (l) => l.numero === "LIC-HOMOL-01/26",
    );
    expect(itemEncontrado).toBeDefined();
    expect(itemEncontrado?.fornecedorNome).toContain(
      "DOHA EMPREENDIMENTOS E SERVICOS LTDA",
    );

    // Busca pelo documento do fornecedor homologado
    const byDoc = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "11.222.333",
      tipo: "licitacao",
    });
    expect(byDoc.licitacoes.some((l) => l.numero === "LIC-HOMOL-01/26")).toBe(
      true,
    );
  });

  it("não deve gerar falso positivo trigramático para termos curtos (ex: 'doha' vs preposição 'do')", async () => {
    // Licitação que contém a palavra 'do' no objeto, mas nenhum termo com 'doha'
    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-ALMOX-99/26",
      objeto:
        "Aquisição de peças do almoxarifado central para manutenção preventiva",
      situacao: "em_andamento",
    });

    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "doha",
      tipo: "licitacao",
    });

    // Não deve conter a licitação que apenas possui 'do' no objeto
    expect(result.licitacoes.some((l) => l.numero === "LIC-ALMOX-99/26")).toBe(
      false,
    );
  });

  it("deve normalizar pontuações corporativas irregulares tanto no termo quanto no cadastro", async () => {
    // Contrato cadastrado com espaço após ponto: "L. PHILIPPE LTDA"
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      contratoNumero: "CTR-CORP-01/26",
      fornecedorNome: "L. PHILIPPE SERVICOS LTDA",
      objeto: "Assessoria tributária especializada",
    });

    // Licitação com item cadastrado sem espaço após ponto: "L.PHILIPPE LTDA"
    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-CORP-02/26",
      objeto: "Consultoria contábil municipal",
    });
    await seedLicitacaoItem({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-CORP-02/26",
      numeroItem: 1,
      fornecedorNome: "L.PHILIPPE SERVICOS LTDA",
      situacaoItem: "homologado",
    });

    // Teste 1: Termo sem espaço ("L.PHILIPPE")
    const searchNoSpace = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "L.PHILIPPE",
    });
    expect(
      searchNoSpace.contratos.some((c) => c.numero === "CTR-CORP-01/26"),
    ).toBe(true);
    expect(
      searchNoSpace.licitacoes.some((l) => l.numero === "LIC-CORP-02/26"),
    ).toBe(true);

    // Teste 2: Termo com espaço ("L. PHILIPPE")
    const searchWithSpace = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "L. PHILIPPE",
    });
    expect(
      searchWithSpace.contratos.some((c) => c.numero === "CTR-CORP-01/26"),
    ).toBe(true);
    expect(
      searchWithSpace.licitacoes.some((l) => l.numero === "LIC-CORP-02/26"),
    ).toBe(true);

    // Teste 3: Termo sem ponto ("L PHILIPPE")
    const searchNoDot = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "L PHILIPPE",
    });
    expect(
      searchNoDot.contratos.some((c) => c.numero === "CTR-CORP-01/26"),
    ).toBe(true);
    expect(
      searchNoDot.licitacoes.some((l) => l.numero === "LIC-CORP-02/26"),
    ).toBe(true);
  });

  it("deve normalizar pontuações corporativas para termos curtos (< 5 chars) onde trigrama está desativado", async () => {
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      contratoNumero: "CTR-SHORT-01/26",
      fornecedorNome: "A. B. SERVICOS LTDA",
      objeto: "Manutenção predial",
    });

    // Termo de 4 caracteres: "A.B."
    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "A.B.",
      tipo: "contrato",
    });
    expect(result.contratos.some((c) => c.numero === "CTR-SHORT-01/26")).toBe(
      true,
    );
  });

  it("deve encontrar contratos e licitações por CNPJ digitado sem pontuação", async () => {
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      contratoNumero: "CTR-CNPJ-RAW/26",
      fornecedorNome: "EMPRESA DIGITOS RAW",
      fornecedorCpfCnpj: "55.666.777/0001-88",
      objeto: "Fornecimento de combustível",
    });

    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "55666777000188",
      tipo: "contrato",
    });
    expect(result.contratos.some((c) => c.numero === "CTR-CNPJ-RAW/26")).toBe(
      true,
    );
  });

  it("não deve indexar fornecedores de itens de licitação não homologados (ex: cancelados)", async () => {
    await seedLicitacao({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-DESC-01/26",
      objeto: "Aquisição de drones para vigilância",
      situacao: "em_andamento",
    });

    await seedLicitacaoItem({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      licitacaoNumero: "LIC-DESC-01/26",
      numeroItem: 1,
      fornecedorNome: "FORNECEDOR REJEITADO XYZ",
      situacaoItem: "cancelado",
    });

    const result = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "REJEITADO XYZ",
      tipo: "licitacao",
    });
    expect(result.licitacoes.some((l) => l.numero === "LIC-DESC-01/26")).toBe(
      false,
    );
  });

  it("não deve vazar contrato antigo com vencimento_atual nulo para exercícios futuros", async () => {
    await seedContrato({
      portalSlug: FIXTURE_PORTAL,
      ano: 2020,
      contratoNumero: "CTR-ANTIGO-NULL/20",
      fornecedorNome: "EMPRESA DO PASSADO",
      objeto: "Serviços pontuais antigos",
      vencimentoAtual: null,
      dataInicio: "2020-01-01",
    });

    const result2026 = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      ano: 2026,
      termo: "Serviços pontuais antigos",
      tipo: "contrato",
    });
    expect(
      result2026.contratos.some((c) => c.numero === "CTR-ANTIGO-NULL/20"),
    ).toBe(false);
  });

  it("deve realizar busca global sem filtro de ano quando ano for undefined", async () => {
    const globalResult = await searchLicitacoesEContratos({
      portalSlug: FIXTURE_PORTAL,
      termo: "0043/24",
      ano: undefined,
    });

    expect(globalResult.total).toBeGreaterThanOrEqual(2);
    expect(globalResult.licitacoes.length).toBeGreaterThanOrEqual(1);
    expect(globalResult.contratos.length).toBeGreaterThanOrEqual(1);
  });
});
