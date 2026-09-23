import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedContrato,
  seedLicitacao,
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
});
