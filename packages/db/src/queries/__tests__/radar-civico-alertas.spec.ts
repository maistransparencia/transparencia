import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedAnomaliaFiscal,
} from "../../../tests/fixtures/seed";
import {
  enrichDeepLink,
  getRadarAnomaliasCount,
  getRadarAnomaliasCountByYear,
  getRadarCivicoAlertas,
} from "../radar-civico-alertas";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
  await cleanupFixtures(`${PORTAL}_outro`);
});

describe("radar-civico-alertas", () => {
  describe("enrichDeepLink", () => {
    it("deve retornar a rota intacta quando não houver parâmetros adicionais", () => {
      expect(
        enrichDeepLink("/porciuncula/pessoal?ano=2024#comissionados"),
      ).toBe("/porciuncula/pessoal?ano=2024#comissionados");
      expect(enrichDeepLink("/porciuncula/despesas", {})).toBe(
        "/porciuncula/despesas",
      );
      expect(enrichDeepLink("")).toBe("");
    });

    it("deve preservar searchParams e âncoras temáticas ao adicionar parâmetros", () => {
      const result = enrichDeepLink("/[slug]/pessoal?ano=2024#comissionados", {
        entidade: "1",
      });
      expect(result).toBe("/[slug]/pessoal?ano=2024&entidade=1#comissionados");
    });

    it("deve atualizar parâmetro existente sem duplicar", () => {
      const result = enrichDeepLink(
        "/porciuncula/pessoal?ano=2024&entidade=1#comissionados",
        { entidade: "2" },
      );
      expect(result).toBe(
        "/porciuncula/pessoal?ano=2024&entidade=2#comissionados",
      );
    });

    it("deve ignorar valores vazios, undefined ou nulos", () => {
      const result = enrichDeepLink(
        "/porciuncula/pessoal?ano=2024#comissionados",
        { entidade: undefined, orgao: null, outro: "" },
      );
      expect(result).toBe("/porciuncula/pessoal?ano=2024#comissionados");
    });

    it("deve preservar âncoras temáticas do CAPREM (#atuarial e #patronal) ao enriquecer deep link", () => {
      expect(
        enrichDeepLink(`/${PORTAL}/caprem?ano=2024#atuarial`, {
          entidade: "1",
        }),
      ).toBe(`/${PORTAL}/caprem?ano=2024&entidade=1#atuarial`);

      expect(
        enrichDeepLink(`/${PORTAL}/caprem?ano=2024#patronal`, {
          entidade: "2",
        }),
      ).toBe(`/${PORTAL}/caprem?ano=2024&entidade=2#patronal`);
    });
  });

  describe("getRadarCivicoAlertas", () => {
    it("deve retornar array vazio se portalSlug for vazio ou inválido", async () => {
      expect(await getRadarCivicoAlertas("")).toEqual([]);
      expect(await getRadarCivicoAlertas("   ")).toEqual([]);
      // @ts-expect-error teste com valor inválido em tempo de execução
      expect(await getRadarCivicoAlertas(null)).toEqual([]);
      // @ts-expect-error teste com valor inválido em tempo de execução
      expect(await getRadarCivicoAlertas(undefined)).toEqual([]);
    });

    it("deve retornar array vazio se ano for NaN", async () => {
      expect(await getRadarCivicoAlertas(PORTAL, { ano: Number.NaN })).toEqual(
        [],
      );
    });

    it("deve retornar lista ordenada prioritariamente por severidade decrescente e desvio", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "concentracao_dispensa",
        dimensaoReferencia: "dispensas",
        grauSeveridade: "moderado",
        desvioPercentual: 25.5,
        valorObservado: 50000,
        valorEsperado: 40000,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/licitacoes?ano=2024`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 65.0,
        valorObservado: 120,
        valorEsperado: 72,
        mesInicial: 1,
        mesFinal: 8,
        deepLinkRota: `/${PORTAL}/pessoal?ano=2024#comissionados`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "pico_despesa_homologa",
        dimensaoReferencia: "saude",
        grauSeveridade: "alto",
        desvioPercentual: 45.2,
        valorObservado: 350000,
        valorEsperado: 240000,
        mesInicial: 1,
        mesFinal: 8,
        deepLinkRota: `/${PORTAL}/despesas?ano=2024`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "recursos_livres",
        grauSeveridade: "critico",
        desvioPercentual: 80.0,
        valorObservado: -150000,
        valorEsperado: 100000,
        mesInicial: 1,
        mesFinal: 8,
        deepLinkRota: `/${PORTAL}/posicao-fiscal?ano=2024`,
      });

      const alertas = await getRadarCivicoAlertas(PORTAL);

      expect(alertas).toHaveLength(4);

      // Críticos primeiro (ordenados por maior desvioPercentual: 80 > 65)
      expect(alertas[0].grauSeveridade).toBe("critico");
      expect(alertas[0].tipoAnomalia).toBe("rombo_caixa");
      expect(alertas[0].desvioPercentual).toBe(80.0);

      expect(alertas[1].grauSeveridade).toBe("critico");
      expect(alertas[1].tipoAnomalia).toBe("explosao_comissionados");
      expect(alertas[1].desvioPercentual).toBe(65.0);

      // Alto em seguida
      expect(alertas[2].grauSeveridade).toBe("alto");
      expect(alertas[2].tipoAnomalia).toBe("pico_despesa_homologa");

      // Moderado por último
      expect(alertas[3].grauSeveridade).toBe("moderado");
      expect(alertas[3].tipoAnomalia).toBe("concentracao_dispensa");

      // Validação de DTOs e tipagem em camelCase
      const primeiro = alertas[0];
      expect(primeiro).toHaveProperty("anomaliaId");
      expect(primeiro.portalSlug).toBe(PORTAL);
      expect(primeiro.ano).toBe(2024);
      expect(primeiro.dimensaoReferencia).toBe("recursos_livres");
      expect(primeiro.valorObservado).toBe(-150000);
      expect(primeiro.valorEsperado).toBe(100000);
      expect(primeiro.mesInicial).toBe(1);
      expect(primeiro.mesFinal).toBe(8);
      expect(primeiro.deepLinkRota).toBe(`/${PORTAL}/posicao-fiscal?ano=2024`);
    });

    it("deve filtrar por ano e severidade mínima corretamente", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2023,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 55,
        valorObservado: 100,
        valorEsperado: 64,
        deepLinkRota: `/${PORTAL}/pessoal?ano=2023`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "concentracao_dispensa",
        dimensaoReferencia: "dispensas",
        grauSeveridade: "moderado",
        desvioPercentual: 20,
        valorObservado: 50000,
        valorEsperado: 41000,
        deepLinkRota: `/${PORTAL}/licitacoes?ano=2024`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "pico_despesa_homologa",
        dimensaoReferencia: "saude",
        grauSeveridade: "alto",
        desvioPercentual: 42,
        valorObservado: 400000,
        valorEsperado: 280000,
        deepLinkRota: `/${PORTAL}/despesas?ano=2024`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "recursos_livres",
        grauSeveridade: "critico",
        desvioPercentual: 75,
        valorObservado: -100000,
        valorEsperado: 50000,
        deepLinkRota: `/${PORTAL}/posicao-fiscal?ano=2024`,
      });

      // Filtro por ano 2024 e severidade mínima alto (alto + critico)
      const alertas2024Alto = await getRadarCivicoAlertas(PORTAL, {
        ano: 2024,
        severidadeMinima: "alto",
      });
      expect(alertas2024Alto).toHaveLength(2);
      expect(alertas2024Alto.map((a) => a.grauSeveridade)).toEqual([
        "critico",
        "alto",
      ]);

      // Filtro apenas por severidade mínima critico
      const alertasCriticos = await getRadarCivicoAlertas(PORTAL, {
        severidadeMinima: "critico",
      });
      expect(alertasCriticos).toHaveLength(2);
      expect(alertasCriticos.every((a) => a.grauSeveridade === "critico")).toBe(
        true,
      );

      // Filtro com ano inexistente retorna vazio
      const alertas2020 = await getRadarCivicoAlertas(PORTAL, { ano: 2020 });
      expect(alertas2020).toEqual([]);
    });

    it("deve enriquecer deepLinkRota com entidade preservando parâmetros existentes", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 60,
        valorObservado: 110,
        valorEsperado: 70,
        deepLinkRota: `/${PORTAL}/pessoal?ano=2024#comissionados`,
      });

      const alertasComEntidade = await getRadarCivicoAlertas(PORTAL, {
        entidade: "1",
      });

      expect(alertasComEntidade).toHaveLength(1);
      expect(alertasComEntidade[0].deepLinkRota).toBe(
        `/${PORTAL}/pessoal?ano=2024&entidade=1#comissionados`,
      );

      const alertasSemEntidade = await getRadarCivicoAlertas(PORTAL);
      expect(alertasSemEntidade[0].deepLinkRota).toBe(
        `/${PORTAL}/pessoal?ano=2024#comissionados`,
      );
    });

    it("deve respeitar a opção limite", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "recursos_livres",
        grauSeveridade: "critico",
        desvioPercentual: 90,
        deepLinkRota: `/${PORTAL}/posicao-fiscal`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 80,
        deepLinkRota: `/${PORTAL}/pessoal`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "pico_despesa_homologa",
        dimensaoReferencia: "saude",
        grauSeveridade: "alto",
        desvioPercentual: 40,
        deepLinkRota: `/${PORTAL}/despesas`,
      });

      const alertas = await getRadarCivicoAlertas(PORTAL, { limite: 2 });
      expect(alertas).toHaveLength(2);
      expect(alertas[0].desvioPercentual).toBe(90);
      expect(alertas[1].desvioPercentual).toBe(80);

      // Deve ignorar limite com valor de ponto flutuante ou não-positivo
      const alertasFloat = await getRadarCivicoAlertas(PORTAL, { limite: 1.5 });
      expect(alertasFloat).toHaveLength(3);
    });

    it("deve sanitizar portalSlug com trim e aplicar desempate determinístico por anomalia_id", async () => {
      await seedAnomaliaFiscal({
        anomaliaId: "anomalia_b",
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "alto",
        desvioPercentual: 50,
        deepLinkRota: `/${PORTAL}/pessoal`,
      });

      await seedAnomaliaFiscal({
        anomaliaId: "anomalia_a",
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "pico_despesa_homologa",
        dimensaoReferencia: "saude",
        grauSeveridade: "alto",
        desvioPercentual: 50,
        deepLinkRota: `/${PORTAL}/despesas`,
      });

      const alertas = await getRadarCivicoAlertas(`  ${PORTAL}  `);
      expect(alertas).toHaveLength(2);
      expect(alertas[0].anomaliaId).toBe("anomalia_a");
      expect(alertas[1].anomaliaId).toBe("anomalia_b");
    });

    it("deve retornar e tipar anomalias previdenciárias de aporte atuarial e retenção patronal", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "inadimplencia_aporte_rpps",
        dimensaoReferencia: "aporte_atuarial",
        grauSeveridade: "critico",
        desvioPercentual: 35.0,
        valorObservado: 650000,
        valorEsperado: 1000000,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/caprem?ano=2024#atuarial`,
        metodoDeteccao: "limite_normativo_adimplencia",
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "retencao_patronal_rpps",
        dimensaoReferencia: "contribuicao_patronal",
        grauSeveridade: "critico",
        desvioPercentual: 100.0,
        valorObservado: 50000,
        valorEsperado: 0,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/caprem?ano=2024#patronal`,
        metodoDeteccao: "fluxo_patronal_em_aberto",
      });

      const alertas = await getRadarCivicoAlertas(PORTAL);
      expect(alertas).toHaveLength(2);

      const atuarial = alertas.find(
        (a) => a.tipoAnomalia === "inadimplencia_aporte_rpps",
      );
      expect(atuarial).toBeDefined();
      expect(atuarial?.dimensaoReferencia).toBe("aporte_atuarial");
      expect(atuarial?.grauSeveridade).toBe("critico");
      expect(atuarial?.desvioPercentual).toBe(35.0);
      expect(atuarial?.valorObservado).toBe(650000);
      expect(atuarial?.valorEsperado).toBe(1000000);
      expect(atuarial?.deepLinkRota).toBe(
        `/${PORTAL}/caprem?ano=2024#atuarial`,
      );
      expect(atuarial?.metodoDeteccao).toBe("limite_normativo_adimplencia");

      const patronal = alertas.find(
        (a) => a.tipoAnomalia === "retencao_patronal_rpps",
      );
      expect(patronal).toBeDefined();
      expect(patronal?.dimensaoReferencia).toBe("contribuicao_patronal");
      expect(patronal?.grauSeveridade).toBe("critico");
      expect(patronal?.desvioPercentual).toBe(100.0);
      expect(patronal?.valorObservado).toBe(50000);
      expect(patronal?.valorEsperado).toBe(0);
      expect(patronal?.deepLinkRota).toBe(
        `/${PORTAL}/caprem?ano=2024#patronal`,
      );
      expect(patronal?.metodoDeteccao).toBe("fluxo_patronal_em_aberto");
    });

    it("deve carregar e mapear corretamente anomalias de compras públicas do PNCP (desconto nulo e deságio extremo)", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2026,
        tipoAnomalia: "desconto_nulo_pregao",
        dimensaoReferencia: "licitacao_000517",
        grauSeveridade: "critico",
        desvioPercentual: 10.0,
        valorObservado: 0.0,
        valorEsperado: 10.0,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/licitacoes?ano=2026&numero=000517#itens`,
        metodoDeteccao: "limite_competitividade_pregao",
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2026,
        tipoAnomalia: "desagio_extremo_inexequibilidade",
        dimensaoReferencia: "licitacao_000290",
        grauSeveridade: "critico",
        desvioPercentual: 22.37,
        valorObservado: 72.37,
        valorEsperado: 50.0,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/licitacoes?ano=2026&numero=000290#itens`,
        metodoDeteccao: "limite_inexequibilidade_art59",
      });

      const alertas = await getRadarCivicoAlertas(PORTAL);
      expect(alertas).toHaveLength(2);

      const descontoNulo = alertas.find(
        (a) => a.tipoAnomalia === "desconto_nulo_pregao",
      );
      expect(descontoNulo).toBeDefined();
      expect(descontoNulo?.dimensaoReferencia).toBe("licitacao_000517");
      expect(descontoNulo?.grauSeveridade).toBe("critico");
      expect(descontoNulo?.desvioPercentual).toBe(10.0);
      expect(descontoNulo?.valorObservado).toBe(0.0);
      expect(descontoNulo?.valorEsperado).toBe(10.0);
      expect(descontoNulo?.deepLinkRota).toBe(
        `/${PORTAL}/licitacoes?ano=2026&numero=000517#itens`,
      );
      expect(descontoNulo?.metodoDeteccao).toBe(
        "limite_competitividade_pregao",
      );

      const desagioExtremo = alertas.find(
        (a) => a.tipoAnomalia === "desagio_extremo_inexequibilidade",
      );
      expect(desagioExtremo).toBeDefined();
      expect(desagioExtremo?.dimensaoReferencia).toBe("licitacao_000290");
      expect(desagioExtremo?.grauSeveridade).toBe("critico");
      expect(desagioExtremo?.desvioPercentual).toBe(22.37);
      expect(desagioExtremo?.valorObservado).toBe(72.37);
      expect(desagioExtremo?.valorEsperado).toBe(50.0);
      expect(desagioExtremo?.deepLinkRota).toBe(
        `/${PORTAL}/licitacoes?ano=2026&numero=000290#itens`,
      );
      expect(desagioExtremo?.metodoDeteccao).toBe(
        "limite_inexequibilidade_art59",
      );
    });

    it("deve carregar e mapear corretamente anomalia de inconsistência de vínculos de pessoal", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2026,
        tipoAnomalia: "inconsistencia_vinculo_pessoal",
        dimensaoReferencia: "quadro_pessoal",
        grauSeveridade: "critico",
        desvioPercentual: 100.0,
        valorObservado: 187.0,
        valorEsperado: 0.0,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/pessoal?ano=2026#regime`,
        metodoDeteccao: "harmonizacao_vinculo_art37",
      });

      const alertas = await getRadarCivicoAlertas(PORTAL);
      expect(alertas).toHaveLength(1);

      const vinculoAlerta = alertas[0];
      expect(vinculoAlerta?.tipoAnomalia).toBe(
        "inconsistencia_vinculo_pessoal",
      );
      expect(vinculoAlerta?.dimensaoReferencia).toBe("quadro_pessoal");
      expect(vinculoAlerta?.grauSeveridade).toBe("critico");
      expect(vinculoAlerta?.desvioPercentual).toBe(100.0);
      expect(vinculoAlerta?.valorObservado).toBe(187.0);
      expect(vinculoAlerta?.valorEsperado).toBe(0.0);
      expect(vinculoAlerta?.deepLinkRota).toBe(
        `/${PORTAL}/pessoal?ano=2026#regime`,
      );
      expect(vinculoAlerta?.metodoDeteccao).toBe("harmonizacao_vinculo_art37");
    });

    it("deve carregar e mapear corretamente anomalia de dependência de transferências externas sob Art. 11 da LRF", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "dependencia_transferencias",
        dimensaoReferencia: "receita_propria",
        grauSeveridade: "critico",
        desvioPercentual: 5.0,
        valorObservado: 5.0,
        valorEsperado: 10.0,
        mesInicial: 1,
        mesFinal: 12,
        deepLinkRota: `/${PORTAL}/receitas?ano=2024`,
        metodoDeteccao: "art11_lrf_arrecadacao_propria",
      });

      const alertas = await getRadarCivicoAlertas(PORTAL);
      expect(alertas).toHaveLength(1);

      const alerta = alertas[0];
      expect(alerta?.tipoAnomalia).toBe("dependencia_transferencias");
      expect(alerta?.dimensaoReferencia).toBe("receita_propria");
      expect(alerta?.grauSeveridade).toBe("critico");
      expect(alerta?.desvioPercentual).toBe(5.0);
      expect(alerta?.valorObservado).toBe(5.0);
      expect(alerta?.valorEsperado).toBe(10.0);
      expect(alerta?.deepLinkRota).toBe(`/${PORTAL}/receitas?ano=2024`);
      expect(alerta?.metodoDeteccao).toBe("art11_lrf_arrecadacao_propria");
    });
  });

  describe("getRadarAnomaliasCount", () => {
    it("deve retornar 0 se portalSlug for vazio ou inválido", async () => {
      expect(await getRadarAnomaliasCount({ portalSlug: "" })).toBe(0);
      expect(await getRadarAnomaliasCount({ portalSlug: "   " })).toBe(0);
      // @ts-expect-error teste com valor inválido
      expect(await getRadarAnomaliasCount({ portalSlug: null })).toBe(0);
      // @ts-expect-error teste com valor inválido
      expect(await getRadarAnomaliasCount({ portalSlug: undefined })).toBe(0);
    });

    it("deve retornar 0 se ano for NaN", async () => {
      expect(
        await getRadarAnomaliasCount({
          portalSlug: PORTAL,
          ano: Number.NaN,
        }),
      ).toBe(0);
    });

    it("deve contar apenas anomalias com severidade crítico no ano especificado", async () => {
      // Anomalia crítica em 2024
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "deficit",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/posicao-fiscal`,
      });

      // Segunda anomalia crítica em 2024
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/pessoal`,
      });

      // Anomalia de severidade alta em 2024 (não deve ser contabilizada)
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "pico_despesa_homologa",
        dimensaoReferencia: "despesas",
        grauSeveridade: "alto",
        deepLinkRota: `/${PORTAL}/despesas`,
      });

      // Anomalia de severidade moderada em 2024 (não deve ser contabilizada)
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "concentracao_dispensa",
        dimensaoReferencia: "dispensas",
        grauSeveridade: "moderado",
        deepLinkRota: `/${PORTAL}/licitacoes`,
      });

      // Anomalia crítica em 2025 (outro ano)
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2025,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "deficit",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/posicao-fiscal`,
      });

      // Anomalia crítica em outro portal
      await seedAnomaliaFiscal({
        portalSlug: `${PORTAL}_outro`,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "deficit",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}_outro/posicao-fiscal`,
      });

      const count2024 = await getRadarAnomaliasCount({
        portalSlug: PORTAL,
        ano: 2024,
      });
      expect(count2024).toBe(2);

      const count2025 = await getRadarAnomaliasCount({
        portalSlug: PORTAL,
        ano: 2025,
      });
      expect(count2025).toBe(1);

      const count2026 = await getRadarAnomaliasCount({
        portalSlug: PORTAL,
        ano: 2026,
      });
      expect(count2026).toBe(0);

      // Sem especificar ano, conta todos os críticos do portal
      const countTotal = await getRadarAnomaliasCount({
        portalSlug: PORTAL,
      });
      expect(countTotal).toBe(3);
    });
  });

  describe("getRadarAnomaliasCountByYear", () => {
    it("deve retornar objeto vazio se portalSlug for inválido", async () => {
      expect(await getRadarAnomaliasCountByYear({ portalSlug: "" })).toEqual(
        {},
      );
      // @ts-expect-error teste com valor inválido
      expect(await getRadarAnomaliasCountByYear({ portalSlug: null })).toEqual(
        {},
      );
    });

    it("deve retornar mapa consolidado de alertas críticos por ano", async () => {
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2023,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "deficit",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/posicao-fiscal`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "rombo_caixa",
        dimensaoReferencia: "deficit",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/posicao-fiscal`,
      });

      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        deepLinkRota: `/${PORTAL}/pessoal`,
      });

      // Não crítico
      await seedAnomaliaFiscal({
        portalSlug: PORTAL,
        ano: 2024,
        tipoAnomalia: "concentracao_dispensa",
        dimensaoReferencia: "dispensas",
        grauSeveridade: "moderado",
        deepLinkRota: `/${PORTAL}/licitacoes`,
      });

      const mapByYear = await getRadarAnomaliasCountByYear({
        portalSlug: PORTAL,
      });

      expect(mapByYear).toEqual({
        2023: 1,
        2024: 2,
      });
    });
  });
});
