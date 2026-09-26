import { describe, expect, it } from "vitest";
import type { loadVisaoGeralData } from "./loader";
import { buildVisaoGeralViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadVisaoGeralData>>;

function makeRawVisaoGeral(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    portalConfig: { displayName: "Porciúncula" },
    posicao: {
      totalArrecadado: 1000000,
      restosPendentesTotal: 250000,
      restosPagosNoAno: 15000,
      restosPendentesAnteriores: 50000,
      totalCredoresAdmAtual: 12,
      restosPendentes: [
        {
          ano: 2023,
          administracao: "Adm. Atual",
          empenhado: 100000,
          liquidado: 80000,
          pago: 50000,
          pendente: 50000,
        },
        {
          ano: 2024,
          administracao: "Adm. Atual",
          empenhado: 300000,
          liquidado: 150000,
          pago: 100000,
          pendente: 200000,
        },
      ],
    },
    execSummary: {
      totalDotacao: 2000000,
      totalEmpenhado: 1500000,
      totalLiquidado: 1200000,
      totalPago: 1000000,
    },
    gaps: [],
    fonte: {
      totalArrecadado: 1000000,
      transferenciasUniaoArrecadado: 500000,
      transferenciasEstadoArrecadado: 300000,
      receitaPropriaArrecadado: 200000,
    },
    folha: {
      percentualFolha: 45.5,
    },
    lrfLimiteMaximo: 54,
    pctChefiasEfetivas: 80,
    contratosServicos: {
      totalContratosVigentes: 5,
      totalContratosComPendencia: 1,
      totalEmpenhado: 500000,
    },
    radarAlertas: [],
    ...overrides,
  } as unknown as RawData;
}

describe("buildVisaoGeralViewModel - despesasCardData", () => {
  it("monta despesasCardData com totais formatados de restos a pagar e liquidado secundário", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.despesasCardData.title).toBe("Restos a pagar");
    expect(vm.despesasCardData.totalRestosPagarFormatted).toBeDefined();
    expect(vm.despesasCardData.totalEmpenhadoFormatted).toBeDefined();
    expect(vm.despesasCardData.totalLiquidadoFormatted).toBeDefined();
    expect(vm.despesasCardData.secondaryTextFormatted).toBeDefined();
    expect(vm.despesasCardData.secondaryTextFormatted).toContain("liquidados");
    expect(vm.despesasCardData.subtext).toContain("12 fornecedores");
  });

  it("calcula percentuais bipartidos (percentageLiquidado e percentageEmpenhado) para antiguidadeBars", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw);

    const bars = vm.despesasCardData.antiguidadeBars;
    expect(bars).toHaveLength(2);

    const bar2023 = bars.find((b) => b.year === "2023");
    expect(bar2023).toBeDefined();
    expect(bar2023?.isCurrentYear).toBe(false);
    expect(bar2023?.percentageLiquidado).toBeGreaterThan(0);
    expect(bar2023?.percentageEmpenhado).toBeGreaterThanOrEqual(0);
    expect(
      (bar2023?.percentageLiquidado ?? 0) + (bar2023?.percentageEmpenhado ?? 0),
    ).toBe(bar2023?.percentage);

    const bar2024 = bars.find((b) => b.year === "2024");
    expect(bar2024?.isCurrentYear).toBe(true);
  });

  it("não expõe sanitizedCredores e credoresCols no ViewModel retornado", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw) as unknown as Record<
      string,
      unknown
    >;

    expect(vm.sanitizedCredores).toBeUndefined();
    expect(vm.credoresCols).toBeUndefined();
  });
});

describe("buildVisaoGeralViewModel - pessoalCardData", () => {
  it("monta pessoalCardData com limite LRF dinâmico vindo da constante fiscal", () => {
    const raw = makeRawVisaoGeral({ lrfLimiteMaximo: 54 });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.title).toBe("Pessoal");
    expect(vm.pessoalCardData.lrfLimitPercentValue).toBe(54);
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF");
    expect(vm.pessoalCardData.receitaFolhaPercentValue).toBe(45.5);
  });

  it("utiliza fallback para 54 quando lrfLimiteMaximo for nulo", () => {
    const raw = makeRawVisaoGeral({ lrfLimiteMaximo: null });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.lrfLimitPercentValue).toBe(54);
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF");
  });

  it("adapta subtexto e legenda de LRF quando há entidade filtrada", () => {
    const raw = makeRawVisaoGeral({
      context: {
        selectedYear: 2026,
        isCurrentYear: false,
        entidadesIds: ["3"],
      },
      folha: {
        percentualFolha: 2.3,
      },
    });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.subtext).toBe(
      "da receita municipal consumida por esta entidade",
    );
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF (total)");
  });
});

describe("buildVisaoGeralViewModel - licitacoesCardData", () => {
  it("exibe contagem de compras em andamento no plural quando maior que 1 ou zero", () => {
    const rawZero = makeRawVisaoGeral({ licitacoesEmAndamentoCount: 0 });
    const vmZero = buildVisaoGeralViewModel(rawZero);
    const itemZero = vmZero.licitacoesCardData.items.find((i) =>
      i.label.includes("ompras em andamento"),
    );
    expect(itemZero).toBeDefined();
    expect(itemZero?.count).toBe(0);
    expect(itemZero?.label).toBe("Compras em andamento");

    const rawPlural = makeRawVisaoGeral({ licitacoesEmAndamentoCount: 5 });
    const vmPlural = buildVisaoGeralViewModel(rawPlural);
    const itemPlural = vmPlural.licitacoesCardData.items.find((i) =>
      i.label.includes("ompras em andamento"),
    );
    expect(itemPlural).toBeDefined();
    expect(itemPlural?.count).toBe(5);
    expect(itemPlural?.label).toBe("Compras em andamento");
  });

  it("exibe contagem de compras em andamento no singular quando igual a 1", () => {
    const rawSingular = makeRawVisaoGeral({ licitacoesEmAndamentoCount: 1 });
    const vmSingular = buildVisaoGeralViewModel(rawSingular);
    const itemSingular = vmSingular.licitacoesCardData.items.find((i) =>
      i.label.includes("ompra em andamento"),
    );
    expect(itemSingular).toBeDefined();
    expect(itemSingular?.count).toBe(1);
    expect(itemSingular?.label).toBe("Compra em andamento");
  });
});

describe("buildVisaoGeralViewModel - radarCivicoFeedData", () => {
  it("converte alertas de diferentes tipos para cards com narrativa factual e URLs de compartilhamento", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-comiss",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "explosao_comissionados",
          dimensaoReferencia: "comissionados",
          grauSeveridade: "critico",
          desvioPercentual: 65,
          valorObservado: 165,
          valorEsperado: 100,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_estoque",
        },
        {
          anomaliaId: "anomalia-caixa",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "rombo_caixa",
          dimensaoReferencia: "recursos_livres",
          grauSeveridade: "critico",
          desvioPercentual: 80,
          valorObservado: 500000,
          valorEsperado: 2500000,
          mesInicial: 12,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_estoque",
        },
        {
          anomaliaId: "anomalia-saude",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "pico_despesa_homologa",
          dimensaoReferencia: "saude",
          grauSeveridade: "alto",
          desvioPercentual: 42,
          valorObservado: 15200000,
          valorEsperado: 10700000,
          mesInicial: 1,
          mesFinal: 8,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_fluxo_homologo",
        },
        {
          anomaliaId: "anomalia-dispensa",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "concentracao_dispensa",
          dimensaoReferencia: "dispensas",
          grauSeveridade: "moderado",
          desvioPercentual: 23.5,
          valorObservado: 48.5,
          valorEsperado: 25.0,
          mesInicial: 1,
          mesFinal: 8,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_fluxo_homologo",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const feed = vm.radarCivicoFeedData;

    expect(feed).toHaveLength(4);

    // Card 1: Comissionados
    const cardComiss = feed[0];
    expect(cardComiss.titulo).toBe("Variação em Cargos Comissionados");
    expect(cardComiss.metodologiaBadge).toBe("Quadro Atual");
    expect(cardComiss.tipoMetodologia).toBe("estoque");
    expect(cardComiss.grauSeveridade).toBe("critico");
    expect(cardComiss.badgeSeveridade?.label).toBe("Atenção Especial");
    expect(cardComiss.textoFactual).toContain(
      "165 cargos comissionados ativos",
    );
    expect(cardComiss.textoFactual).toContain("+65% acima da média histórica");
    expect(cardComiss.ctaUrl).toBe(
      "/porciuncula/pessoal?ano=2024#comissionados",
    );
    expect(cardComiss.whatsappShareUrl).toContain(
      "api.whatsapp.com/send?text=",
    );
    expect(decodeURIComponent(cardComiss.whatsappShareUrl)).toContain(
      "Porciúncula",
    );

    // Card 2: Rombo Caixa
    const cardCaixa = feed[1];
    expect(cardCaixa.titulo).toBe("Disponibilidade em Recursos Livres");
    expect(cardCaixa.metodologiaBadge).toBe("Quadro Atual");
    expect(cardCaixa.badgeSeveridade?.label).toBe("Atenção Especial");
    expect(cardCaixa.textoFactual).toContain(
      "recursos livres encerrou o período em",
    );
    expect(cardCaixa.ctaUrl).toBe("/porciuncula/receitas?ano=2024#saldo-caixa");

    // Card 3: Despesa Homóloga em Saúde (Investimento Social)
    const cardSaude = feed[2];
    expect(cardSaude.titulo).toBe("Aporte Expressivo em Saúde");
    expect(cardSaude.metodologiaBadge).toBe("Histórico Jan a Ago");
    expect(cardSaude.badgeSeveridade?.label).toBe("Aporte Relevante");
    expect(cardSaude.tipoMetodologia).toBe("homologa");
    expect(cardSaude.textoFactual).toContain(
      "área de Saúde totalizaram R$ 15.2mi",
    );
    expect(cardSaude.valorObservadoFormatted).toBe("R$ 15.2mi");
    expect(cardSaude.valorEsperadoFormatted).toBe("R$ 10.7mi");
    expect(cardSaude.ctaLabel).toBe("Conferir Aplicação em Saúde");
    expect(cardSaude.ctaUrl).toBe("/porciuncula/despesas?ano=2024");

    // Card 4: Compras sem Licitação (Dispensas)
    const cardDispensa = feed[3];
    expect(cardDispensa.titulo).toBe("Compras sem Licitação");
    expect(cardDispensa.metodologiaBadge).toBe("Histórico Jan a Ago");
    expect(cardDispensa.badgeSeveridade?.label).toBe("Acompanhamento");
    expect(cardDispensa.tipoMetodologia).toBe("homologa");
    expect(cardDispensa.textoFactual).toContain(
      "48.5% dos processos de contratação foram realizados por dispensa",
    );
    expect(cardDispensa.valorObservadoFormatted).toBe("48.5%");
    expect(cardDispensa.ctaLabel).toBe("Examinar Licitações e Compras");
    expect(cardDispensa.ctaUrl).toBe("/porciuncula/licitacoes?ano=2024");
  });

  it("mapeia dimensao_referencia com acentuação correta usando o dicionário (ex: habitacao -> Habitação)", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-habitacao",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "pico_despesa_homologa",
          dimensaoReferencia: "habitacao",
          grauSeveridade: "critico",
          desvioPercentual: 376.11,
          valorObservado: 500000,
          valorEsperado: 105000,
          mesInicial: 1,
          mesFinal: 8,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_fluxo_homologo",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Aporte Expressivo em Habitação");
    expect(card.badgeSeveridade?.label).toBe("Aporte Relevante");
    expect(card.textoFactual).toContain(
      "área de Habitação totalizaram R$ 500.0mil",
    );
    expect(card.valorObservadoFormatted).toBe("R$ 500.0mil");
    expect(card.valorEsperadoFormatted).toBe("R$ 105.0mil");
    expect(card.ctaLabel).toBe("Conferir Aplicação em Habitação");
  });

  it("monta card para opacidade de gastos genéricos (.99) quando acima de 30%", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-opacidade",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "opacidade_gastos_genericos",
          dimensaoReferencia: "gastos_genericos",
          grauSeveridade: "alto",
          desvioPercentual: 1.03,
          valorObservado: 30.31,
          valorEsperado: 30.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "limite_prudencial",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Elevada Opacidade em Gastos Genéricos");
    expect(card.metodologiaBadge).toBe("Quota de Alerta (30%)");
    expect(card.esperadoLabel).toBe("Limite de Alerta");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("30.3%");
    expect(card.valorEsperadoFormatted).toBe("30%");
    expect(card.ctaLabel).toBe("Fiscalizar Gastos Genéricos");
    expect(card.ctaUrl).toBe("/porciuncula/despesas?ano=2026#gastos-genericos");
    expect(card.textoFactual).toContain(
      "superando o limite prudencial de 30% estabelecido para a transparência pública",
    );
  });

  it("monta card para inadimplência no aporte atuarial do RPPS com fundamentação legal", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-caprem-atuarial",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "inadimplencia_aporte_rpps",
          dimensaoReferencia: "aporte_atuarial",
          grauSeveridade: "critico",
          desvioPercentual: 35.0,
          valorObservado: 650000,
          valorEsperado: 1000000,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "limite_normativo_adimplencia",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Inadimplência no Aporte Atuarial (RPPS)");
    expect(card.metodologiaBadge).toBe("Meta Atuarial");
    expect(card.esperadoLabel).toBe("Aporte Exigido");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("R$ 650.0mil");
    expect(card.valorEsperadoFormatted).toBe("R$ 1.0mi");
    expect(card.desvioPercentualFormatted).toBe("-35%");
    expect(card.ctaLabel).toBe("Auditar Aporte Atuarial");
    expect(card.ctaUrl).toBe("/porciuncula/caprem?ano=2024#atuarial");
    expect(card.fundamentacaoLegal).toEqual({
      label: "Lei nº 9.717/1998",
      url: "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm#art1",
    });
    expect(card.textoFactual).toContain(
      "déficit de recolhimento de 35% no plano de amortização previdenciária",
    );
  });

  it("monta card para retenção patronal do RPPS com fundamentação legal e valor esperado zero", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-caprem-patronal",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "retencao_patronal_rpps",
          dimensaoReferencia: "contribuicao_patronal",
          grauSeveridade: "critico",
          desvioPercentual: 100.0,
          valorObservado: 50000,
          valorEsperado: 0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "fluxo_patronal_em_aberto",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Retenção de Contribuição Patronal (RPPS)");
    expect(card.metodologiaBadge).toBe("Fluxo em Aberto");
    expect(card.esperadoLabel).toBe("Passivo Tolerado");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("R$ 50.0mil");
    expect(card.valorEsperadoFormatted).toBe("R$ 0");
    expect(card.desvioPercentualFormatted).toBe("+100%");
    expect(card.ctaLabel).toBe("Verificar Repasse Patronal");
    expect(card.ctaUrl).toBe("/porciuncula/caprem?ano=2024#patronal");
    expect(card.fundamentacaoLegal).toEqual({
      label: "Art. 40 da CF/88",
      url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
    });
    expect(card.textoFactual).toContain(
      "não repassadas tempestivamente ao RPPS/CAPREM",
    );
  });

  it("monta card para desconto nulo em pregão com fundamentação no Art. 5º da Lei 14.133/2021", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-desconto-nulo",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "desconto_nulo_pregao",
          dimensaoReferencia: "licitacao_000517",
          grauSeveridade: "critico",
          desvioPercentual: 10.0,
          valorObservado: 0.0,
          valorEsperado: 10.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: "000517",
          metodoDeteccao: "limite_competitividade_pregao",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Desconto Nulo em Pregão");
    expect(card.metodologiaBadge).toBe("Competitividade PNCP");
    expect(card.esperadoLabel).toBe("Margem Esperada");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("0%");
    expect(card.valorEsperadoFormatted).toBe("10%");
    expect(card.desvioPercentualFormatted).toBe("-10%");
    expect(card.ctaLabel).toBe("Auditar Itens do Pregão");
    expect(card.ctaUrl).toBe(
      "/porciuncula/licitacoes?ano=2026&numero=000517#itens",
    );
    expect(card.fundamentacaoLegal).toEqual({
      label: "Art. 5º da Lei nº 14.133/2021",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art5",
    });
    expect(card.textoFactual).toContain(
      "indicando ausência de competitividade efetiva em relação à margem prudencial esperada (10%)",
    );
  });

  it("monta card para risco de inexequibilidade com fundamentação no Art. 59, III da Lei 14.133/2021", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-desagio-extremo",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "desagio_extremo_inexequibilidade",
          dimensaoReferencia: "licitacao_000290",
          grauSeveridade: "critico",
          desvioPercentual: 22.37,
          valorObservado: 72.37,
          valorEsperado: 50.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: "000290",
          metodoDeteccao: "limite_inexequibilidade_art59",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Risco de Inexequibilidade Contratual");
    expect(card.metodologiaBadge).toBe("Risco de Inexequibilidade");
    expect(card.esperadoLabel).toBe("Limite de Exequibilidade");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("72.4%");
    expect(card.valorEsperadoFormatted).toBe("50%");
    expect(card.desvioPercentualFormatted).toBe("+22.4%");
    expect(card.ctaLabel).toBe("Verificar Propostas Homologadas");
    expect(card.ctaUrl).toBe(
      "/porciuncula/licitacoes?ano=2026&numero=000290#itens",
    );
    expect(card.fundamentacaoLegal).toEqual({
      label: "Art. 59, III da Lei nº 14.133/2021",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art59",
    });
    expect(card.textoFactual).toContain(
      "patamar que exige comprovação de exequibilidade da proposta contratual (50%)",
    );
  });

  it("monta card para inconsistência em vínculos de pessoal com fundamentação no Art. 37 da CF/88", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-inconsistencia-vinculo",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "inconsistencia_vinculo_pessoal",
          dimensaoReferencia: "quadro_pessoal",
          grauSeveridade: "critico",
          desvioPercentual: 100.0,
          valorObservado: 187,
          valorEsperado: 0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "harmonizacao_vinculo_art37",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Inconsistência em Vínculos de Pessoal");
    expect(card.metodologiaBadge).toBe("Harmonização Cadastral");
    expect(card.esperadoLabel).toBe("Padrão Constitucional");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("187 vínculos");
    expect(card.valorEsperadoFormatted).toBe("0 vínculos");
    expect(card.desvioPercentualFormatted).toBe("+100%");
    expect(card.ctaLabel).toBe("Auditar Vínculos Cadastrais");
    expect(card.ctaUrl).toBe("/porciuncula/pessoal?ano=2026#regime");
    expect(card.fundamentacaoLegal).toEqual({
      label: "Art. 37 da CF/88",
      url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37",
    });
    expect(card.textoFactual).toContain(
      "foram identificados 187 profissionais cadastrados com categorias funcionais atípicas no portal de origem, exigindo harmonização com base no Art. 37 da Constituição Federal.",
    );
  });

  it("monta card para dependência de transferências externas com fundamentação no Art. 11 da LRF", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-dependencia",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "dependencia_transferencias",
          dimensaoReferencia: "receita_propria",
          grauSeveridade: "critico",
          desvioPercentual: 5.0,
          valorObservado: 5.0,
          valorEsperado: 10.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "art11_lrf_arrecadacao_propria",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Dependência de Transferências Externas");
    expect(card.metodologiaBadge).toBe("Art. 11 da LRF");
    expect(card.esperadoLabel).toBe("Parâmetro LRF");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.valorObservadoFormatted).toBe("5%");
    expect(card.valorEsperadoFormatted).toBe("10%");
    expect(card.desvioPercentualFormatted).toBe("-5%");
    expect(card.ctaLabel).toBe("Analisar Fontes de Receita");
    expect(card.ctaUrl).toBe("/porciuncula/receitas?ano=2024");
    expect(card.fundamentacaoLegal).toEqual({
      label: "Art. 11 da LRF",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art11",
    });
    expect(card.textoFactual).toContain(
      "a receita própria representou apenas 5% da arrecadação, patamar inferior ao parâmetro referencial de 10% preconizado pelo Art. 11 da LRF.",
    );
  });

  it("monta card para desidratação do patrimônio do RPPS com fundamentação na Resolução CMN 4.963/2021 e Lei 9.717/1998", () => {
    const raw = makeRawVisaoGeral({
      radarAlertas: [
        {
          anomaliaId: "anomalia-desidratacao",
          portalSlug: "porciuncula",
          ano: 2025,
          tipoAnomalia: "desidratacao_patrimonio_rpps",
          dimensaoReferencia: "patrimonio_previdenciario",
          grauSeveridade: "critico",
          desvioPercentual: 20.78,
          valorObservado: 35980000,
          valorEsperado: 45420000,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "variacao_trienal_patrimonio",
        },
      ],
    });

    const vm = buildVisaoGeralViewModel(raw);
    const card = vm.radarCivicoFeedData[0];
    expect(card.titulo).toBe("Desidratação do Patrimônio (RPPS)");
    expect(card.metodologiaBadge).toBe("Variação Trienal");
    expect(card.esperadoLabel).toBe("Saldo Inicial (Triênio)");
    expect(card.tipoMetodologia).toBe("estoque");
    expect(card.grauSeveridade).toBe("critico");
    expect(card.valorObservadoFormatted).toBe("R$ 36.0mi");
    expect(card.valorEsperadoFormatted).toBe("R$ 45.4mi");
    expect(card.desvioPercentualFormatted).toBe("-20.8%");
    expect(card.ctaLabel).toBe("Auditar Patrimônio Previdenciário");
    expect(card.ctaUrl).toBe("/porciuncula/caprem?ano=2025#patrimonio");
    expect(card.fundamentacaoLegal).toEqual([
      {
        label: "Resolução CMN nº 4.963/2021",
        url: "https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4963",
      },
      {
        label: "Lei nº 9.717/1998",
        url: "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm",
      },
    ]);
    expect(card.textoFactual).toContain(
      "retração de 20.8% e consumo de R$ 9.4mi ao longo do triênio",
    );
  });

  it("retorna array vazio quando não houver alertas", () => {
    const raw = makeRawVisaoGeral({ radarAlertas: [] });
    const vm = buildVisaoGeralViewModel(raw);
    expect(vm.radarCivicoFeedData).toEqual([]);
  });
});
