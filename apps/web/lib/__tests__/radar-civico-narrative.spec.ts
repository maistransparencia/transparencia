import { describe, expect, it } from "vitest";
import {
  formatarDimensao,
  formatDesvioPercentual,
  formatFactualNarrative,
  formatPercentNumber,
  getMesNome,
  isInvestimentoSocial,
} from "../radar-civico-narrative";

describe("radar-civico-narrative", () => {
  describe("getMesNome", () => {
    it("returns correct abbreviation for valid months 1-12", () => {
      expect(getMesNome(1)).toBe("Jan");
      expect(getMesNome(6)).toBe("Jun");
      expect(getMesNome(12)).toBe("Dez");
    });

    it("returns empty string for null, undefined, or invalid months", () => {
      expect(getMesNome(null)).toBe("");
      expect(getMesNome(undefined)).toBe("");
      expect(getMesNome(0)).toBe("");
      expect(getMesNome(13)).toBe("");
      expect(getMesNome(-1)).toBe("");
    });
  });

  describe("formatarDimensao", () => {
    it("returns mapped names for known dimensions and functions", () => {
      expect(formatarDimensao("saude")).toBe("Saúde");
      expect(formatarDimensao("educacao")).toBe("Educação");
      expect(formatarDimensao("comissionados")).toBe("Cargos Comissionados");
      expect(formatarDimensao("caixa")).toBe("Disponibilidade em Caixa");
      expect(formatarDimensao("dispensas")).toBe("Compras sem Licitação");
      expect(formatarDimensao("gastos_genericos")).toBe(
        "Gastos Genéricos (.99)",
      );
      expect(formatarDimensao("aporte_atuarial")).toBe(
        "Aporte Atuarial (RPPS)",
      );
      expect(formatarDimensao("contribuicao_patronal")).toBe(
        "Contribuição Patronal (RPPS)",
      );
      expect(formatarDimensao("quadro_pessoal")).toBe("Quadro de Pessoal");
      expect(formatarDimensao("receita_propria")).toBe("Receita Própria");
      expect(formatarDimensao("patrimonio_previdenciario")).toBe(
        "Patrimônio Previdenciário (RPPS)",
      );
    });

    it("formats unmapped snake_case strings to Title Case", () => {
      expect(formatarDimensao("recursos_especiais")).toBe("Recursos Especiais");
    });

    it("formats licitacao_ prefix as Licitação with slashes", () => {
      expect(formatarDimensao("licitacao_000517")).toBe("Licitação 000517");
      expect(formatarDimensao("licitacao_016_2026")).toBe("Licitação 016/2026");
    });

    it("returns 'Geral' for undefined, null, or empty strings", () => {
      expect(formatarDimensao(undefined)).toBe("Geral");
      expect(formatarDimensao(null)).toBe("Geral");
      expect(formatarDimensao("")).toBe("Geral");
    });
  });

  describe("isInvestimentoSocial", () => {
    it("returns true for social functions", () => {
      expect(isInvestimentoSocial("saude")).toBe(true);
      expect(isInvestimentoSocial("educacao")).toBe(true);
      expect(isInvestimentoSocial("assistencia_social")).toBe(true);
      expect(isInvestimentoSocial("cultura")).toBe(true);
      expect(isInvestimentoSocial("SAUDE ")).toBe(true);
    });

    it("returns false for non-social functions or empty", () => {
      expect(isInvestimentoSocial("administracao")).toBe(false);
      expect(isInvestimentoSocial("legislativa")).toBe(false);
      expect(isInvestimentoSocial(null)).toBe(false);
      expect(isInvestimentoSocial(undefined)).toBe(false);
    });
  });

  describe("formatDesvioPercentual and formatPercentNumber", () => {
    it("formats integers without decimals", () => {
      expect(formatDesvioPercentual(45)).toBe("45");
      expect(formatDesvioPercentual(-45)).toBe("45");
      expect(formatPercentNumber(30)).toBe("30");
    });

    it("formats decimals with at most one decimal place", () => {
      expect(formatDesvioPercentual(45.67)).toBe("45.7");
      expect(formatDesvioPercentual(-45.67)).toBe("45.7");
      expect(formatPercentNumber(30.44)).toBe("30.4");
    });
  });

  describe("formatFactualNarrative", () => {
    it("formats explosao_comissionados with positive deviation", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "explosao_comissionados",
          ano: 2024,
          valorObservado: 120,
          valorEsperado: 80,
          desvioPercentual: 50,
          mesFinal: null,
          dimensaoReferencia: "comissionados",
        },
        2024,
      );
      expect(narrative).toContain("Em 2024, o quadro de pessoal registrou");
      expect(narrative).toContain("+50% acima da média histórica observada");
    });

    it("formats explosao_comissionados with negative deviation and fallback anoContexto", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "explosao_comissionados",
          ano: 0,
          valorObservado: 40,
          valorEsperado: 80,
          desvioPercentual: -50,
          mesFinal: null,
          dimensaoReferencia: "comissionados",
        },
        2025,
      );
      expect(narrative).toContain("Em 2025, o quadro de pessoal registrou");
      expect(narrative).toContain("-50% abaixo da média histórica observada");
    });

    it("formats rombo_caixa with year reference", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "rombo_caixa",
          ano: 2024,
          valorObservado: -500000,
          valorEsperado: 1000000,
          desvioPercentual: -150,
          mesFinal: null,
          dimensaoReferencia: "caixa",
        },
        2024,
      );
      expect(narrative).toContain(
        "Em 2024, a disponibilidade financeira líquida",
      );
      expect(narrative).toContain(
        "posicionando-se 150% abaixo da média histórica",
      );
    });

    it("formats pico_despesa_homologa for social investment with month range", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "pico_despesa_homologa",
          ano: 2024,
          valorObservado: 5000000,
          valorEsperado: 3000000,
          desvioPercentual: 66.7,
          mesFinal: 6,
          dimensaoReferencia: "saude",
        },
        2024,
      );
      expect(narrative).toContain("No período analisado (Jan a Jun)");
      expect(narrative).toContain("área de Saúde");
      expect(narrative).toContain("+66.7% superior à média histórica");
    });

    it("formats pico_despesa_homologa for single month (Jan)", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "pico_despesa_homologa",
          ano: 2024,
          valorObservado: 500000,
          valorEsperado: 300000,
          desvioPercentual: 66.7,
          mesFinal: 1,
          dimensaoReferencia: "saude",
        },
        2024,
      );
      expect(narrative).toContain("No período analisado (Jan)");
    });

    it("formats pico_despesa_homologa for non-social function with negative deviation", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "pico_despesa_homologa",
          ano: 2024,
          valorObservado: 100000,
          valorEsperado: 200000,
          desvioPercentual: -50,
          mesFinal: 12,
          dimensaoReferencia: "legislativa",
        },
        2024,
      );
      expect(narrative).toContain("função Legislativa");
      expect(narrative).toContain(
        "com variação de -50% em relação à média histórica",
      );
    });

    it("formats concentracao_dispensa with year and percentages", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "concentracao_dispensa",
          ano: 2024,
          valorObservado: 45.2,
          valorEsperado: 15.0,
          desvioPercentual: 201.3,
          mesFinal: null,
          dimensaoReferencia: "dispensas",
        },
        2024,
      );
      expect(narrative).toBe(
        "Em 2024, no período analisado, 45.2% dos processos de contratação foram realizados por dispensa ou inexigibilidade de licitação, frente à média histórica de 15%.",
      );
    });

    it("formats opacidade_gastos_genericos with year and default expected limit", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "opacidade_gastos_genericos",
          ano: 2024,
          valorObservado: 35.5,
          valorEsperado: null,
          desvioPercentual: 18.3,
          mesFinal: null,
          dimensaoReferencia: "gastos_genericos",
        },
        2024,
      );
      expect(narrative).toBe(
        "Em 2024, 35.5% das despesas pagas foram alocadas sob subitens genéricos (.99), superando o limite prudencial de 30% estabelecido para a transparência pública.",
      );
    });

    it("formats inadimplencia_aporte_rpps with observed, expected and deficit deviation", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "inadimplencia_aporte_rpps",
          ano: 2024,
          valorObservado: 650000,
          valorEsperado: 1000000,
          desvioPercentual: 35.0,
          dimensaoReferencia: "aporte_atuarial",
        },
        2024,
      );
      expect(narrative).toBe(
        "Em 2024, o município quitou R$ 650.0mil do aporte atuarial exigido de R$ 1.0mi, registrando déficit de recolhimento de 35% no plano de amortização previdenciária.",
      );
    });

    it("formats retencao_patronal_rpps with observed retained amount", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "retencao_patronal_rpps",
          ano: 2024,
          valorObservado: 50000,
          valorEsperado: 0,
          desvioPercentual: 100.0,
          dimensaoReferencia: "contribuicao_patronal",
        },
        2024,
      );
      expect(narrative).toBe(
        "Em 2024, foram apurados R$ 50.0mil em contribuições previdenciárias patronais liquidadas e não repassadas tempestivamente ao RPPS/CAPREM.",
      );
    });

    it("formats desconto_nulo_pregao with observed discount and expected margin", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "desconto_nulo_pregao",
          ano: 2026,
          valorObservado: 0.0,
          valorEsperado: 10.0,
          desvioPercentual: 10.0,
          dimensaoReferencia: "licitacao_000517",
        },
        2026,
      );
      expect(narrative).toBe(
        "Em 2026, o certame licitatório registrou desconto homologado de apenas 0%, indicando ausência de competitividade efetiva em relação à margem prudencial esperada (10%).",
      );
    });

    it("formats desagio_extremo_inexequibilidade with observed discount and threshold", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "desagio_extremo_inexequibilidade",
          ano: 2026,
          valorObservado: 72.37,
          valorEsperado: 50.0,
          desvioPercentual: 22.37,
          dimensaoReferencia: "licitacao_000290",
        },
        2026,
      );
      expect(narrative).toBe(
        "Em 2026, o certame licitatório registrou deságio homologado expressivo de 72.4%, patamar que exige comprovação de exequibilidade da proposta contratual (50%).",
      );
    });

    it("formats inconsistencia_vinculo_pessoal with observed count (plural)", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "inconsistencia_vinculo_pessoal",
          ano: 2026,
          valorObservado: 187,
          valorEsperado: 0,
          desvioPercentual: 100.0,
          dimensaoReferencia: "quadro_pessoal",
        },
        2026,
      );
      expect(narrative).toBe(
        "Em 2026, foram identificados 187 profissionais cadastrados com categorias funcionais atípicas no portal de origem, exigindo harmonização com base no Art. 37 da Constituição Federal.",
      );
    });

    it("formats inconsistencia_vinculo_pessoal with observed count (singular)", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "inconsistencia_vinculo_pessoal",
          ano: 2022,
          valorObservado: 1,
          valorEsperado: 0,
          desvioPercentual: 100.0,
          dimensaoReferencia: "quadro_pessoal",
        },
        2022,
      );
      expect(narrative).toBe(
        "Em 2022, foram identificados 1 profissional cadastrado com categorias funcionais atípicas no portal de origem, exigindo harmonização com base no Art. 37 da Constituição Federal.",
      );
    });

    it("formats dependencia_transferencias with observed percentage, expected and legal basis", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "dependencia_transferencias",
          ano: 2024,
          valorObservado: 5.0,
          valorEsperado: 10.0,
          desvioPercentual: 5.0,
          dimensaoReferencia: "receita_propria",
        },
        2024,
      );
      expect(narrative).toBe(
        "Em 2024, a receita própria representou apenas 5% da arrecadação, patamar inferior ao parâmetro referencial de 10% preconizado pelo Art. 11 da LRF.",
      );
    });

    it("formats desidratacao_patrimonio_rpps with observed, consumed amount and estimated horizon", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "desidratacao_patrimonio_rpps",
          ano: 2025,
          valorObservado: 35980000,
          valorEsperado: 45420000,
          desvioPercentual: 20.8,
          dimensaoReferencia: "patrimonio_previdenciario",
        },
        2025,
      );
      expect(narrative).toBe(
        "Em 2025, o patrimônio financeiro da previdência encerrou em R$ 36.0mi, registrando retração de 20.8% e consumo de R$ 9.4mi ao longo do triênio. Mantido o ritmo de queima, o horizonte de sustentabilidade estimado é de 7.6 anos.",
      );
    });

    it("formats desidratacao_patrimonio_rpps with singular 'ano' when horizon rounds to 1", () => {
      const narrative = formatFactualNarrative(
        {
          tipoAnomalia: "desidratacao_patrimonio_rpps",
          ano: 2025,
          valorObservado: 1000000,
          valorEsperado: 3000000,
          desvioPercentual: 66.7,
          dimensaoReferencia: "patrimonio_previdenciario",
        },
        2025,
      );
      expect(narrative).toBe(
        "Em 2025, o patrimônio financeiro da previdência encerrou em R$ 1.0mi, registrando retração de 66.7% e consumo de R$ 2.0mi ao longo do triênio. Mantido o ritmo de queima, o horizonte de sustentabilidade estimado é de 1 ano.",
      );
    });

    it("formats unknown anomaly type using fallback variation narrative", () => {
      const positiveNarrative = formatFactualNarrative(
        {
          tipoAnomalia: "anomalia_desconhecida",
          ano: 2024,
          valorObservado: 100,
          valorEsperado: 80,
          desvioPercentual: 25,
          mesFinal: null,
          dimensaoReferencia: "geral",
        },
        2024,
      );
      expect(positiveNarrative).toBe(
        "Registrada variação de +25% no indicador em relação ao padrão histórico observado.",
      );

      const negativeNarrative = formatFactualNarrative(
        {
          tipoAnomalia: "anomalia_desconhecida",
          ano: 2024,
          valorObservado: 75,
          valorEsperado: 100,
          desvioPercentual: -25,
          mesFinal: null,
          dimensaoReferencia: "geral",
        },
        2024,
      );
      expect(negativeNarrative).toBe(
        "Registrada variação de -25% no indicador em relação ao padrão histórico observado.",
      );
    });
  });
});
