import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedLicitacao,
} from "../../../tests/fixtures/seed";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getAdesaoDeAtaMetrics,
  getAdesaoExternaMetrics,
  getAnomaliasContratuaisMetrics,
  getDistribucaoModalidadesMetrics,
  getLicitacaoGapsMetrics,
  getLicitacoesEmAndamentoMetrics,
  toIsoDateString,
} from "../licitacoes-metrics";

const FIXTURE_PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(FIXTURE_PORTAL);
});

describe("licitacoes-metrics", () => {
  it("deve buscar métricas de Licitações via leitores atômicos *-metrics", async () => {
    const gaps = await getLicitacaoGapsMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(gaps)).toBe(true);

    const modalidades = await getDistribucaoModalidadesMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
    );
    expect(Array.isArray(modalidades)).toBe(true);

    const adesao = await getAdesaoDeAtaMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(adesao).toBeDefined();
    expect(typeof adesao.quantidade).toBe("number");

    const adesaoExt = await getAdesaoExternaMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(adesaoExt).toBeDefined();

    const anomalias = await getAnomaliasContratuaisMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
    );
    expect(anomalias).toBeDefined();
    expect(Array.isArray(anomalias.fracionamento)).toBe(true);
  });

  it("deve conter o limite_dispensa pré-calculado pelo dbt mart nos gaps sem licitação", async () => {
    const gaps = await getLicitacaoGapsMetrics(PORTAL_SLUG, TEST_YEAR);
    if (gaps.length > 0) {
      expect(typeof gaps[0].limiteDispensa).toBe("number");
      expect(gaps[0].limiteDispensa).toBeGreaterThan(0);
    }
  });

  describe("getLicitacoesEmAndamentoMetrics", () => {
    it("deve retornar array vazio para portalSlug inválido ou vazio", async () => {
      expect(await getLicitacoesEmAndamentoMetrics("")).toEqual([]);
      expect(await getLicitacoesEmAndamentoMetrics("   ")).toEqual([]);
      // @ts-expect-error teste com valor inválido em tempo de execução
      expect(await getLicitacoesEmAndamentoMetrics(null)).toEqual([]);
    });

    it("deve retornar array vazio para ano NaN ou empresaIds vazio", async () => {
      expect(
        await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL, {
          ano: Number.NaN,
        }),
      ).toEqual([]);
      expect(
        await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL, {
          empresaIds: [],
        }),
      ).toEqual([]);
    });

    it("deve filtrar apenas licitações em andamento/abertas e ignorar concluídas", async () => {
      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "001/2024",
        modalidade: "Pregao Eletronico",
        objeto: "Aquisição de medicamentos para UBS",
        discriminacao: "Medicamentos de atenção básica",
        valor: 150000.5,
        situacao: "Em Andamento",
        dataAbertura: "2024-05-10",
        carona: "Nao",
      });

      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "002/2024",
        modalidade: "Concorrencia",
        objeto: "Reforma de escola municipal",
        valor: 500000,
        situacao: "em_andamento",
        dataAbertura: "2024-06-15",
      });

      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "003/2024",
        modalidade: "Pregao",
        objeto: "Serviço de limpeza já concluído",
        valor: 80000,
        situacao: "homologada",
        dataAbertura: "2024-01-10",
      });

      const resultado = await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL);

      expect(resultado).toHaveLength(2);

      // Ordenadas por data_abertura desc: 2024-06-15 antes de 2024-05-10
      expect(resultado[0].licitacaoNumero).toBe("002/2024");
      expect(resultado[0].situacao).toBe("em_andamento");
      expect(resultado[0].valor).toBe(500000);

      expect(resultado[1].licitacaoNumero).toBe("001/2024");
      expect(resultado[1].situacao).toBe("em_andamento");
      expect(resultado[1].valor).toBe(150000.5);
      expect(resultado[1].discriminacao).toBe("Medicamentos de atenção básica");
      expect(resultado[1].dataAbertura).toBe("2024-05-10");

      // Validar DTOs em camelCase e modalidade em snake_case
      const item = resultado[0];
      expect(item).toHaveProperty("licitacaoId");
      expect(item.portalSlug).toBe(FIXTURE_PORTAL);
      expect(item.ano).toBe(2024);
      expect(item.empresaId).toBe("1");
      expect(resultado[1].modalidade).toBe("pregao_eletronico");
    });

    it("deve preservar valor nulo, casar situacao com espacos e aplicar desempate deterministico", async () => {
      await seedLicitacao({
        licitacaoId: "lic_b",
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "100/2024",
        modalidade: " Tomada De Preco ",
        objeto: "Objeto sem orcamento divulgado",
        valor: null as unknown as number,
        situacao: "  Em Andamento  ",
        dataAbertura: "2024-08-01",
      });

      await seedLicitacao({
        licitacaoId: "lic_a",
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "101/2024",
        modalidade: "Concorrencia Publica",
        objeto: "Objeto com orcamento divulgado",
        valor: null as unknown as number,
        situacao: " aberta ",
        dataAbertura: "2024-08-01",
      });

      const res = await getLicitacoesEmAndamentoMetrics(
        `  ${FIXTURE_PORTAL}  `,
      );
      expect(res).toHaveLength(2);
      // Desempate determinístico por licitacao_id asc
      expect(res[0].licitacaoId).toBe("lic_a");
      expect(res[1].licitacaoId).toBe("lic_b");
      expect(res[0].valor).toBeNull();
      expect(res[1].valor).toBeNull();
      expect(res[0].situacao).toBe("aberta");
      expect(res[1].situacao).toBe("em_andamento");
      expect(res[1].modalidade).toBe("tomada_de_preco");
    });

    it("deve filtrar por ano, empresaIds, suporte a empresaId/entidade singular e respeitar limite", async () => {
      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2023,
        empresaId: "1",
        licitacaoNumero: "010/2023",
        objeto: "Objeto 2023",
        situacao: "em_andamento",
        valor: 10000,
      });

      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "1",
        licitacaoNumero: "020/2024",
        objeto: "Objeto 2024 Emp 1",
        situacao: "em_andamento",
        valor: 20000,
      });

      await seedLicitacao({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        empresaId: "2",
        licitacaoNumero: "030/2024",
        objeto: "Objeto 2024 Emp 2",
        situacao: "em_andamento",
        valor: 30000,
      });

      // Filtro por ano 2024
      const ano2024 = await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL, {
        ano: 2024,
      });
      expect(ano2024).toHaveLength(2);

      // Filtro por empresaIds array
      const emp2 = await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL, {
        ano: 2024,
        empresaIds: ["2"],
      });
      expect(emp2).toHaveLength(1);
      expect(emp2[0].licitacaoNumero).toBe("030/2024");

      // Filtro por empresaId singular
      const empSingular = await getLicitacoesEmAndamentoMetrics(
        FIXTURE_PORTAL,
        {
          ano: 2024,
          empresaId: "2",
        },
      );
      expect(empSingular).toHaveLength(1);
      expect(empSingular[0].licitacaoNumero).toBe("030/2024");

      // Filtro por entidade singular
      const entidadeSingular = await getLicitacoesEmAndamentoMetrics(
        FIXTURE_PORTAL,
        {
          ano: 2024,
          entidade: "1",
        },
      );
      expect(entidadeSingular).toHaveLength(1);
      expect(entidadeSingular[0].licitacaoNumero).toBe("020/2024");

      // Limite
      const comLimite = await getLicitacoesEmAndamentoMetrics(FIXTURE_PORTAL, {
        limite: 1,
      });
      expect(comLimite).toHaveLength(1);

      // Compatibilidade de assinatura com ano como number
      const viaNum = await getLicitacoesEmAndamentoMetrics(
        FIXTURE_PORTAL,
        2023,
      );
      expect(viaNum).toHaveLength(1);
      expect(viaNum[0].licitacaoNumero).toBe("010/2023");
    });
  });

  describe("toIsoDateString", () => {
    it("deve retornar null para Date inválido onde getTime() é NaN", () => {
      const invalidDate = new Date("invalid date string");
      expect(toIsoDateString(invalidDate)).toBeNull();
    });

    it("deve formatar Date válido para YYYY-MM-DD", () => {
      const validDate = new Date("2024-05-15T12:00:00Z");
      expect(toIsoDateString(validDate)).toBe("2024-05-15");
    });

    it("deve retornar string no formato YYYY-MM-DD ou null para outros tipos", () => {
      expect(toIsoDateString("2024-10-20T00:00:00")).toBe("2024-10-20");
      expect(toIsoDateString(null)).toBeNull();
      expect(toIsoDateString(undefined)).toBeNull();
      expect(toIsoDateString("not-a-date")).toBeNull();
    });
  });
});
