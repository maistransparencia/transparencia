import { describe, expect, it } from "vitest";
import { buildEducacaoViewModel } from "./view-model";

describe("educacao/view-model", () => {
  it("consolida o Troféu Cívico do ciclo 2025 para Porciúncula com +1,4 ponto e ranking estadual", () => {
    const raw = {
      portalSlug: "porciuncula_prefeitura",
      portalConfig: {
        municipioNome: "Porciúncula",
        uf: "RJ",
        displayName: "Prefeitura de Porciúncula",
      },
      allMetrics: [
        {
          educacaoMetricaId: "1",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2021,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 5.2,
          metaIdeb: 6.4,
          atingiuMeta: false,
          saebMatematica: 210.79,
          saebLinguaPortuguesa: 198.28,
          indicadorFluxoAprovacao: 0.925,
          crescimentoPontosIdeb: null,
          variacaoSaebMatematica: null,
          variacaoSaebPortugues: null,
          despesaLiquidadaEducacao: 25000000,
          totalMatriculasRedeMunicipal: 2300,
          custoAnualPorAluno: 10869.56,
        },
        {
          educacaoMetricaId: "2",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2023,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 4.5,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: 202.1,
          saebLinguaPortuguesa: 194.5,
          indicadorFluxoAprovacao: 0.942,
          crescimentoPontosIdeb: -0.7,
          variacaoSaebMatematica: -8.69,
          variacaoSaebPortugues: -3.78,
          despesaLiquidadaEducacao: 29000000,
          totalMatriculasRedeMunicipal: 2280,
          custoAnualPorAluno: 12719.3,
        },
        {
          educacaoMetricaId: "3",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 5.9,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: 218.39,
          saebLinguaPortuguesa: 210.91,
          indicadorFluxoAprovacao: 0.985,
          crescimentoPontosIdeb: 1.4,
          variacaoSaebMatematica: 16.29,
          variacaoSaebPortugues: 16.41,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14553.0,
        },
        {
          educacaoMetricaId: "4",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anosFinais" as const,
          notaIdeb: 5.3,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: 250.0,
          saebLinguaPortuguesa: 255.0,
          indicadorFluxoAprovacao: 0.96,
          crescimentoPontosIdeb: 0.4,
          variacaoSaebMatematica: 5.0,
          variacaoSaebPortugues: 6.0,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14553.0,
        },
      ],
      resumo: {
        ano: 2025,
        notaIdeb: 5.9,
        crescimentoPontosIdeb: 1.4,
        despesaLiquidadaEducacao: 34291936.64,
        totalMatriculasRedeMunicipal: 2290,
        custoAnualPorAluno: 14553.0,
        posicaoRanking: 46,
        variacaoPosicoes: 43,
        totalMunicipios: 92,
        mdePercentual: 26.8,
        fundebPercentual: 78.4,
      },
      contratos: [
        {
          contratoId: "ctr_1",
          portalSlug: "porciuncula_prefeitura",
          ano: 2025,
          empresaId: "1",
          contratoNumero: "0443/25",
          licitacaoNumero: "012/2025",
          modalidade: "pregao_eletronico",
          fornecedorNome: "DISTRIBUIDORA ALIMENTAR",
          fornecedorCpfCnpj: "00.000.000/0001-00",
          objeto: "Aquisição de gêneros alimentícios para merenda PNAE",
          categoria: "merenda_pnae" as const,
          valorContrato: 450000,
          valorAditado: 0,
          totalEmpenhado: 450000,
          totalLiquidado: 200000,
          totalPago: 180000,
          saldoAPagar: 270000,
          fontePrincipal: "PNAE",
          fontesRecursos: "PNAE",
          orgaoNome: "Secretaria de Educação",
          principalFuncao: "Educação",
          principalPrograma: null,
          principalAcao: null,
          dataInicio: "2025-02-01",
          vencimentoAtual: "2025-12-31",
        },
      ],
      context: {
        selectedYear: 2025,
        isCurrentYear: false,
        selectedEtapa: "anosIniciais" as const,
      },
    };

    const vm = buildEducacaoViewModel(raw);

    // Bloco 1: Troféu Cívico
    expect(vm.trofeuCivico.anoBaseIdeb).toBe(2025);
    expect(vm.trofeuCivico.eyebrowLabel).toBe(
      "TEMAS · EDUCAÇÃO BÁSICA · 2025 (ANO-BASE IDEB)",
    );
    expect(vm.trofeuCivico.notaAtual).toBe(5.9);
    expect(vm.trofeuCivico.notaAnterior).toBe(4.5);
    expect(vm.trofeuCivico.crescimentoPontos).toBe(1.4);
    expect(vm.trofeuCivico.isDestaqueEstadual).toBe(true);
    expect(vm.trofeuCivico.destaqueBadgeTexto).toBe(
      "Evolução de +1,4 ponto no IDEB da Rede Municipal",
    );
    expect(vm.trofeuCivico.rankingPosicaoLabel).toBe("46º lugar");
    expect(vm.trofeuCivico.rankingSubtext).toBe("Entre 92 municípios (RJ)");
    expect(vm.trofeuCivico.rankingTrend).toEqual({
      value: "+43 posições",
      isPositive: true,
    });
    expect(vm.trofeuCivico.rankingEstadualLabel).toContain(
      "46º lugar estadual",
    );
    expect(vm.trofeuCivico.custoAnualPorAluno).toBe(14553.0);
    expect(vm.trofeuCivico.totalMatriculas).toBe(2290);

    // Bloco 2: Linha do tempo e Histórico
    expect(vm.historico.anosIniciais.pontos).toHaveLength(3);
    expect(vm.historico.anosIniciais.pontos[0].ano).toBe(2021);
    expect(vm.historico.anosIniciais.pontos[0].notaIdeb).toBe(5.2);
    expect(vm.historico.anosIniciais.pontos[2].ano).toBe(2025);
    expect(vm.historico.anosIniciais.pontos[2].notaIdeb).toBe(5.9);
    expect(vm.historico.anosIniciais.pontos[2].taxaAprovacao).toBe(98.5);

    expect(vm.historico.anosFinais.pontos).toHaveLength(1);
    expect(vm.historico.anosFinais.pontos[0].notaIdeb).toBe(5.3);

    // Bloco 3: Painel Fiscal (MDE e FUNDEB)
    expect(vm.fiscal.mde.minimoConstitucionalPct).toBe(25);
    expect(vm.fiscal.mde.percentualAplicado).toBeGreaterThanOrEqual(25);
    expect(vm.fiscal.mde.cumprido).toBe(true);
    expect(vm.fiscal.mde.artigoUrl).toContain("#art212");

    expect(vm.fiscal.fundeb.minimoConstitucionalPct).toBe(70);
    expect(vm.fiscal.fundeb.percentualAplicado).toBeGreaterThanOrEqual(70);
    expect(vm.fiscal.fundeb.cumprido).toBe(true);
    expect(vm.fiscal.fundeb.artigoUrl).toContain("#art212a");

    expect(vm.fiscal.correlacao).toHaveLength(3);
    expect(vm.fiscal.correlacao[2].ano).toBe(2025);
    expect(vm.fiscal.correlacao[2].custoPorAluno).toBe(14553.0);
    expect(vm.fiscal.correlacao[2].notaIdebIniciais).toBe(5.9);

    // Bloco 4: Contratos
    expect(vm.contratos).toHaveLength(1);
    expect(vm.contratos[0].contratoNumero).toBe("0443/25");
    expect(vm.contratosResumo.totalContratos).toBe(1);
    expect(vm.contratosResumo.valorTotalContratos).toBe(450000);
    expect(vm.contratosResumo.porCategoria.merenda_pnae).toBe(1);
  });

  it("trata portal com apenas um ciclo cadastrado com fallback gracioso", () => {
    const raw = {
      portalSlug: "outro_municipio",
      portalConfig: null,
      allMetrics: [
        {
          educacaoMetricaId: "1",
          portalSlug: "outro_municipio",
          codIbge: 3300000,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 5.0,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: null,
          saebLinguaPortuguesa: null,
          indicadorFluxoAprovacao: null,
          crescimentoPontosIdeb: null,
          variacaoSaebMatematica: null,
          variacaoSaebPortugues: null,
          despesaLiquidadaEducacao: null,
          totalMatriculasRedeMunicipal: null,
          custoAnualPorAluno: null,
        },
      ],
      resumo: {
        ano: 2025,
        notaIdeb: 5.0,
        crescimentoPontosIdeb: null,
        despesaLiquidadaEducacao: null,
        totalMatriculasRedeMunicipal: null,
        custoAnualPorAluno: null,
      },
      contratos: [],
      context: {
        selectedYear: 2025,
        isCurrentYear: false,
        selectedEtapa: "anosIniciais" as const,
      },
    };

    const vm = buildEducacaoViewModel(raw);
    expect(vm.municipioNome).toBe("Município");
    expect(vm.trofeuCivico.notaAtual).toBe(5.0);
    expect(vm.trofeuCivico.notaAnterior).toBeNull();
    expect(vm.trofeuCivico.crescimentoPontos).toBeNull();
    expect(vm.trofeuCivico.isDestaqueEstadual).toBe(false);
    expect(vm.trofeuCivico.destaqueBadgeTexto).not.toMatch(/[🏆📈]/u);
    expect(vm.fiscal.mde.percentualAplicado).toBeNull();
    expect(vm.fiscal.mde.cumprido).toBeNull();
    expect(vm.fiscal.fundeb.percentualAplicado).toBeNull();
    expect(vm.fiscal.fundeb.cumprido).toBeNull();
    expect(vm.contratosResumo.totalContratos).toBe(0);
  });

  it("determina ano-base bienal e eyebrow para anos pares sem ciclo oficial (ex: 2026 -> 2025)", () => {
    const raw = {
      portalSlug: "porciuncula_prefeitura",
      portalConfig: null,
      allMetrics: [
        {
          educacaoMetricaId: "1",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 5.9,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: null,
          saebLinguaPortuguesa: null,
          indicadorFluxoAprovacao: null,
          crescimentoPontosIdeb: 1.4,
          variacaoSaebMatematica: null,
          variacaoSaebPortugues: null,
          despesaLiquidadaEducacao: null,
          totalMatriculasRedeMunicipal: null,
          custoAnualPorAluno: null,
        },
      ],
      resumo: {
        ano: 2025,
        notaIdeb: 5.9,
        crescimentoPontosIdeb: 1.4,
        despesaLiquidadaEducacao: null,
        totalMatriculasRedeMunicipal: null,
        custoAnualPorAluno: null,
      },
      contratos: [],
      context: {
        selectedYear: 2026,
        isCurrentYear: true,
        selectedEtapa: "anosIniciais" as const,
      },
    };

    const vm = buildEducacaoViewModel(raw);
    expect(vm.selectedYear).toBe(2026);
    expect(vm.trofeuCivico.anoBaseIdeb).toBe(2025);
    expect(vm.trofeuCivico.eyebrowLabel).toBe(
      "TEMAS · EDUCAÇÃO BÁSICA · EXERCÍCIO 2026 (ANO-BASE IDEB 2025)",
    );
  });
});
