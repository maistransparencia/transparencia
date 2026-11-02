import type {
  EducacaoContratoDTO,
  EducacaoExecucaoAnualDTO,
  EducacaoMetricDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import {
  buildAlunosRede,
  buildEducacaoViewModel,
  buildMinimosLegais,
  buildValorPorAluno,
} from "./view-model";

function metrica(
  parcial: Partial<EducacaoMetricDTO> &
    Pick<EducacaoMetricDTO, "ano" | "etapaEnsino">,
): EducacaoMetricDTO {
  return {
    educacaoMetricaId: `${parcial.ano}-${parcial.etapaEnsino}`,
    portalSlug: "portal_teste",
    codIbge: 3304102,
    rede: "municipal",
    notaIdeb: null,
    metaIdeb: null,
    atingiuMeta: null,
    saebMatematica: null,
    saebLinguaPortuguesa: null,
    indicadorFluxoAprovacao: null,
    crescimentoPontosIdeb: null,
    variacaoSaebMatematica: null,
    variacaoSaebPortugues: null,
    ...parcial,
  };
}

function execucao(
  parcial: Partial<EducacaoExecucaoAnualDTO> &
    Pick<EducacaoExecucaoAnualDTO, "ano">,
): EducacaoExecucaoAnualDTO {
  return {
    empenhado: 0,
    liquidado: 0,
    pago: 0,
    pagoSemPessoal: 0,
    ...parcial,
  };
}

function contrato(
  categoria: EducacaoContratoDTO["categoria"],
  valorContrato: number,
): EducacaoContratoDTO {
  return {
    contratoId: `ctr_${categoria}`,
    portalSlug: "portal_teste",
    ano: 2025,
    empresaId: "1",
    contratoNumero: `${categoria}/25`,
    licitacaoNumero: null,
    modalidade: null,
    fornecedorNome: "FORNECEDOR",
    fornecedorCpfCnpj: null,
    objeto: "Objeto",
    categoria,
    valorContrato,
    valorAditado: 0,
    totalEmpenhado: valorContrato,
    totalLiquidado: valorContrato / 2,
    totalPago: valorContrato / 2,
    saldoAPagar: valorContrato / 2,
    fontePrincipal: null,
    fontesRecursos: null,
    orgaoNome: null,
    principalFuncao: null,
    principalPrograma: null,
    principalAcao: null,
    dataInicio: "2025-01-01",
    vencimentoAtual: "2025-12-31",
  };
}

const CONTEXTO_2025 = {
  selectedYear: 2025,
  isCurrentYear: false,
  selectedEtapa: "anosIniciais" as const,
};

describe("educacao/view-model", () => {
  it("monta a execução do exercício selecionado e a série anual a partir da função 12", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [],
      contratos: [],
      execucaoAnual: [
        execucao({ ano: 2024, empenhado: 900, pago: 800 }),
        execucao({
          ano: 2025,
          empenhado: 1500,
          liquidado: 1350,
          pago: 1200,
        }),
      ],
      context: CONTEXTO_2025,
    });

    expect(vm.execucao).toMatchObject({
      ano: 2025,
      empenhado: 1500,
      pago: 1200,
      temDados: true,
    });
    expect(vm.serieAnual).toEqual([
      { ano: 2024, empenhado: 900, pago: 800 },
      { ano: 2025, empenhado: 1500, pago: 1200 },
    ]);
  });

  it("expõe alunosRede a partir das matrículas do Censo", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [],
      contratos: [],
      matriculas: {
        portalSlug: "portal_teste",
        anoCenso: 2024,
        matriculasEducacaoInfantil: 668,
        matriculasEnsinoFundamental: 1303,
        matriculasEducacaoBasica: 1971,
      },
      context: CONTEXTO_2025,
    });
    expect(vm.alunosRede).toEqual({
      total: 1971,
      educacaoInfantil: 668,
      ensinoFundamental: 1303,
      anoCenso: 2024,
    });
  });

  it("marca ausência de dados quando o exercício não tem despesa da função 12", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [],
      contratos: [],
      execucaoAnual: [execucao({ ano: 2024, empenhado: 900, pago: 800 })],
      context: CONTEXTO_2025,
    });

    expect(vm.execucao.temDados).toBe(false);
  });

  it("monta o aprendizado por etapa com a última nota até o ano selecionado, ciclo anterior e classificação", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [
        metrica({
          ano: 2021,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.2,
          metaIdeb: 6.4,
          atingiuMeta: false,
        }),
        metrica({
          ano: 2023,
          etapaEnsino: "anosIniciais",
          notaIdeb: 4.5,
          crescimentoPontosIdeb: -0.7,
        }),
        metrica({
          ano: 2025,
          etapaEnsino: "anosIniciais",
          notaIdeb: 5.9,
          metaIdeb: 5.5,
          atingiuMeta: true,
          crescimentoPontosIdeb: 1.4,
        }),
        metrica({ ano: 2023, etapaEnsino: "anosFinais", notaIdeb: 4.8 }),
      ],
      contratos: [],
      rankingAnosIniciais: {
        posicaoRanking: 46,
        totalMunicipios: 92,
        variacaoPosicoes: 3,
        anoCicloAnterior: 2023,
        redesComparadas: 92,
        totalMunicipiosCicloAnterior: 92,
      },
      rankingAnosFinais: null,
      context: { ...CONTEXTO_2025, selectedYear: 2026, isCurrentYear: true },
    });

    expect(vm.aprendizado.anosIniciais).toMatchObject({
      notaIdeb: 5.9,
      anoApuracao: 2025,
      metaIdeb: 5.5,
      atingiuMeta: true,
      notaAnterior: 4.5,
      anoAnterior: 2023,
      variacaoPontos: 1.4,
      classificacao: {
        posicao: 46,
        total: 92,
        variacaoPosicoes: 3,
        redesComparadas: 92,
        totalCicloAnterior: 92,
      },
    });
    expect(vm.aprendizado.anosFinais).toMatchObject({
      notaIdeb: 4.8,
      anoApuracao: 2023,
      metaIdeb: null,
      notaAnterior: null,
      classificacao: null,
    });
  });

  it.each([
    ["ano do ciclo anterior diferente do da nota anterior", 2021],
    ["ranking sem ano de ciclo anterior", null],
  ])(
    "descarta a variação de posição com %s",
    (_descricao, anoCicloAnterior) => {
      const vm = buildEducacaoViewModel({
        portalSlug: "portal_teste",
        allMetrics: [
          metrica({ ano: 2023, etapaEnsino: "anosIniciais", notaIdeb: 4.5 }),
          metrica({ ano: 2025, etapaEnsino: "anosIniciais", notaIdeb: 5.9 }),
        ],
        contratos: [],
        rankingAnosIniciais: {
          posicaoRanking: 46,
          totalMunicipios: 92,
          variacaoPosicoes: 3,
          redesComparadas: 92,
          anoCicloAnterior,
          totalMunicipiosCicloAnterior: 92,
        },
        context: CONTEXTO_2025,
      });

      expect(vm.aprendizado.anosIniciais.anoAnterior).toBe(2023);
      expect(vm.aprendizado.anosIniciais.classificacao).toEqual({
        posicao: 46,
        total: 92,
        variacaoPosicoes: null,
        redesComparadas: null,
        totalCicloAnterior: null,
      });
    },
  );

  it("não usa notas de ciclos posteriores ao exercício selecionado", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [
        metrica({ ano: 2021, etapaEnsino: "anosIniciais", notaIdeb: 5.2 }),
        metrica({ ano: 2025, etapaEnsino: "anosIniciais", notaIdeb: 5.9 }),
      ],
      contratos: [],
      context: { ...CONTEXTO_2025, selectedYear: 2024 },
    });

    expect(vm.aprendizado.anosIniciais.notaIdeb).toBe(5.2);
    expect(vm.aprendizado.anosIniciais.anoApuracao).toBe(2021);
  });

  it("agrega contratos por categoria", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "portal_teste",
      allMetrics: [],
      contratos: [
        contrato("merenda_pnae", 100),
        contrato("merenda_pnae", 50),
        contrato("locacao_imoveis", 24),
      ],
      context: CONTEXTO_2025,
    });

    expect(vm.contratosResumo.totalContratos).toBe(3);
    expect(vm.contratosResumo.porCategoria.merenda_pnae).toBe(2);
    expect(vm.contratosResumo.totaisPorCategoria.merenda_pnae).toMatchObject({
      quantidade: 2,
      valorContrato: 150,
    });
    expect(
      vm.contratosResumo.totaisPorCategoria.locacao_imoveis.valorContrato,
    ).toBe(24);
    expect(
      vm.contratosResumo.totaisPorCategoria.transporte_pnate.quantidade,
    ).toBe(0);
  });

  it("usa UF e médias dinâmicas de outro estado, sem literais de tenant", () => {
    const vm = buildEducacaoViewModel({
      portalSlug: "municipio_mg",
      portalConfig: { cidadeClean: "Barbacena", uf: "MG" },
      allMetrics: [
        metrica({ ano: 2021, etapaEnsino: "anosIniciais", notaIdeb: 6.1 }),
        metrica({ ano: 2023, etapaEnsino: "anosIniciais", notaIdeb: 6.4 }),
      ],
      mediasEstaduais: {
        anosIniciais: { 2021: 5.8, 2023: 6.0 },
        anosFinais: {},
      },
      contratos: [],
      context: { ...CONTEXTO_2025, selectedYear: 2023 },
    });

    expect(vm.municipioUf).toBe("MG");
    expect(vm.historico.anosIniciais.mediaEstadualLabel).toBe(
      "Média da rede pública (MG)",
    );
    expect(vm.historico.anosIniciais.periodoLabel).toBe("2021–2023");
    expect(vm.historico.anosIniciais.pontos[1].mediaEstadual).toBe(6.0);
  });
});

const semMinimo = {
  limite: null,
  percentualAplicado: null,
  resultado: "sem_dado" as const,
  baseLegal: null,
  urlBaseLegal: null,
};

describe("buildMinimosLegais", () => {
  const minimoMde = {
    limite: 25,
    percentualAplicado: 27.5,
    resultado: "cumpriu" as const,
    baseLegal: "CF/88 Art. 212",
    urlBaseLegal: "https://www.planalto.gov.br/x",
  };
  const siope = (situacao: "encerrado" | "parcial") => ({
    portalSlug: "portal_teste",
    ano: 2024,
    atual: {
      ano: 2024,
      periodo: situacao === "parcial" ? 3 : 6,
      situacao,
      investimentoPorAluno: null,
      investimentoPorAlunoBasica: null,
      investimentoPorAlunoInfantil: null,
      investimentoPorAlunoFundamental: null,
      percentualAplicadoMde: 27.5,
      percentualAplicadoFundebProfissionais: null,
      coletadoEm: null,
    },
    minimos: { mde: minimoMde, fundebProfissionais: semMinimo },
    serie: [],
  });

  it("repassa os mínimos do ano encerrado sem recalcular", () => {
    const view = buildMinimosLegais(siope("encerrado"), 2024);
    expect(view.parcial).toBe(false);
    expect(view.semDadoSiope).toBe(false);
    expect(view.mde).toEqual(minimoMde);
  });

  it("marca o ano em andamento como parcial com o período", () => {
    const view = buildMinimosLegais(siope("parcial"), 2024);
    expect(view.parcial).toBe(true);
    expect(view.periodo).toBe(3);
  });

  it("sem SIOPE devolve sem dado, sem quebrar", () => {
    const view = buildMinimosLegais(null, 2024);
    expect(view.semDadoSiope).toBe(true);
    expect(view.mde.resultado).toBe("sem_dado");
    expect(view.fundebProfissionais.resultado).toBe("sem_dado");
  });
});

describe("buildAlunosRede", () => {
  it("expõe total e ano real do Censo", () => {
    expect(
      buildAlunosRede({
        portalSlug: "portal_teste",
        anoCenso: 2024,
        matriculasEducacaoInfantil: 668,
        matriculasEnsinoFundamental: 1303,
        matriculasEducacaoBasica: 1971,
      }),
    ).toEqual({
      total: 1971,
      educacaoInfantil: 668,
      ensinoFundamental: 1303,
      anoCenso: 2024,
    });
  });

  it("devolve null sem matrícula, nunca zero", () => {
    expect(buildAlunosRede(null)).toBeNull();
    expect(buildAlunosRede(undefined)).toBeNull();
  });
});

describe("buildValorPorAluno", () => {
  const ano = (
    anoRef: number,
    investimentoPorAluno: number | null,
    situacao: "encerrado" | "parcial" = "encerrado",
  ) => ({
    ano: anoRef,
    periodo: situacao === "parcial" ? 4 : 6,
    situacao,
    investimentoPorAluno,
    investimentoPorAlunoBasica: null,
    investimentoPorAlunoInfantil: null,
    investimentoPorAlunoFundamental: null,
    percentualAplicadoMde: null,
    percentualAplicadoFundebProfissionais: null,
    coletadoEm: null,
  });
  const dto = (serie: ReturnType<typeof ano>[], anoPedido: number) => ({
    portalSlug: "portal_teste",
    ano: anoPedido,
    atual: serie.find((item) => item.ano === anoPedido) ?? null,
    minimos: {
      mde: semMinimo,
      fundebProfissionais: semMinimo,
    },
    serie,
  });

  it("compara ano fechado com o ano fechado anterior", () => {
    const view = buildValorPorAluno(
      dto([ano(2023, 10000), ano(2024, 11000)], 2024),
      2024,
    );
    expect(view.anoAnterior).toBe(2023);
    expect(view.variacaoValor).toBe(1000);
    expect(view.variacaoPercentual).toBeCloseTo(10);
  });

  it("não compara ano parcial", () => {
    const view = buildValorPorAluno(
      dto([ano(2024, 11000), ano(2025, 5000, "parcial")], 2025),
      2025,
    );
    expect(view.parcial).toBe(true);
    expect(view.variacaoValor).toBeNull();
    expect(view.serie).toHaveLength(2);
  });

  it("explica a causa quando não há valor", () => {
    expect(
      buildValorPorAluno(dto([ano(2024, null)], 2024), 2024).semValorCausa,
    ).toBe("nao_informado_ao_fnde");
    expect(buildValorPorAluno(dto([], 2024), 2024).semValorCausa).toBe(
      "sem_dado_siope",
    );
    expect(buildValorPorAluno(null, 2024).valor).toBeNull();
  });
});
