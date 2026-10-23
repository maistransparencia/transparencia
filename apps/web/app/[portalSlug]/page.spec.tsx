import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadVisaoGeralData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadVisaoGeralData>>;

const { loadVisaoGeralDataMock } = vi.hoisted(() => ({
  loadVisaoGeralDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadVisaoGeralData: loadVisaoGeralDataMock,
}));

const { default: VisaoGeralPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      currentYear: 2024,
      selectedYear: 2024,
      isCurrentYear: true,
      entidadesIds: undefined,
    },
    portalConfig: {
      displayName: "Porciúncula",
      dataExtracao: "2024-12-31",
      dataExtracaoDate: new Date("2024-12-31"),
    },
    posicao: {
      totalArrecadado: 100000,
      despesasPagas: 80000,
      restosPagosNoAno: 5000,
      totalSaidas: 85000,
      saldoEstimado: 15000,
      saldoAposRestos: 10000,
      restosPendentes: [],
      restosPendentesTotal: 5000,
      restosPendentesAnteriores: 0,
      totalCredoresAdmAtual: 10,
    },
    execSummary: {
      totalEmpenhado: 90000,
      totalLiquidado: 85000,
      totalPago: 80000,
      totalDotacao: 100000,
      saldoOrcamentario: 10000,
    },
    gaps: [],
    fonte: undefined,
    folha: { percentualFolha: 45 },
    pctChefiasEfetivas: 80,
    lrfLimiteMaximo: 54,
    contratosServicos: {
      totalContratosVigentes: 5,
      totalContratosComPendencia: 1,
      totalEmpenhado: 50000,
    },
    posicaoFinanceira: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      mesMaisRecente: 12,
      dataHomologacao: "2024-12-31",
      totalCaixaGeral: 12000000,
      totalRecursosLivres: 4000000,
      totalRecursosVinculados: 8000000,
      totalCaixaPrevidencia: 0,
      totalRecursosPrevidencia: 0,
      entidades: [
        {
          poderOrgao: "Executivo",
          entidadeNome: "Prefeitura Municipal",
          cnpj: "29.138.342/0001-30",
          empresaId: "1",
          grupoDestinacao: "recursos_ordinarios",
          saldoCaixaBancos: 8000000,
          saldoRecursosLivres: 3000000,
          saldoRecursosVinculados: 5000000,
          mesReferencia: 12,
          dataReferencia: "2024-12-31",
        },
      ],
      previdencia: [],
    },
    radarAlertas: [],
    resumoFarmacia: { status: "conforme" },
    resumoObras: {
      totalObras: 5,
      emExecucao: 2,
      paralisadas: 1,
      concluidas: 2,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 15000000,
      valorEmExecucao: 8000000,
      valorParalisadas: 2000000,
      valorConcluidas: 5000000,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: 65,
      obrasSemMedicaoCount: 0,
    },
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("VisaoGeralPage", () => {
  it("happy-path: renderiza hero, radar cívico municipal, card resumo de saldo em caixa e pipeline de execução", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw());

    const element = await VisaoGeralPage(props);
    render(element);

    expect(screen.getByText(/Radar Cívico Municipal/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e bancos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/total em caixa municipal/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /ver detalhamento por entidade em execução orçamentária/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Em destaque" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sentinela cívica/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Obras Públicas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Obras Públicas")).toBeInTheDocument();
  });

  it("renderiza cards no radar cívico quando existirem anomalias no exercício", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        radarAlertas: [
          {
            anomaliaId: "anomalia-1",
            portalSlug: "porciuncula_prefeitura",
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
        ],
      }),
    );

    const element = await VisaoGeralPage(props);
    render(element);

    expect(screen.getByText(/Radar Cívico Municipal/)).toBeInTheDocument();
    expect(
      screen.getByText("Variação em Cargos Comissionados"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("radar-linha")).toBeInTheDocument();
  });

  it("renderiza fallback amigável quando posicaoFinanceira for nula", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ posicaoFinanceira: null }),
    );

    const element = await VisaoGeralPage(props);
    render(element);

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o exercício/i,
      ),
    ).toBeInTheDocument();
  });

  it("obras nulo: o card de obras nao renderiza", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw({ resumoObras: null }));
    render(await VisaoGeralPage(props));
    expect(
      screen.queryByRole("region", {
        name: "Obras Públicas",
      }),
    ).toBeNull();
  });

  it("renderiza o card de educacao com link para a rota de educacao", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
          atingiuMeta: false,
          posicaoRanking: 46,
          totalMunicipios: 92,
          variacaoPosicoes: -2,
          despesaLiquidadaEducacao: 33300000,
          anosIniciais: { notaIdeb: 5.9 },
          anosFinais: { notaIdeb: 5.3 },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.getByText("Educação Básica e Desempenho Escolar"),
    ).toBeInTheDocument();
    expect(screen.getByText(/IDEB 2023/)).toBeInTheDocument();
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.includes("/educacao"));
    expect(link).toBeDefined();
  });

  it("apagao da farmacia mostra faixa com Ver detalhes para a rota da farmacia", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ resumoFarmacia: { status: "apagao" } }),
    );
    render(await VisaoGeralPage(props));
    const hrefs = screen
      .getAllByRole("link", { name: /Ver detalhes/ })
      .map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.some((href) => href.endsWith("/saude/farmacia"))).toBe(true);
  });

  it("conforme da farmacia mostra o campo de busca", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ resumoFarmacia: { status: "conforme" } }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.getByPlaceholderText("Qual remédio você procura?"),
    ).toBeInTheDocument();
  });

  it("ordena Em destaque (farmacia, educacao, obras), radar e pipeline", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoFarmacia: { status: "apagao" },
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
          atingiuMeta: true,
          posicaoRanking: 3,
          totalMunicipios: 92,
          variacaoPosicoes: 1,
          despesaLiquidadaEducacao: 1000000,
          anosIniciais: { notaIdeb: 5.9 },
          anosFinais: { notaIdeb: 5.3 },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(screen.queryByText("Indicadores Sociais")).not.toBeInTheDocument();
    const farmacia = screen.getByRole("region", { name: "Farmácia SUS" });
    const educacao = screen.getByRole("region", {
      name: "Educação Básica e Desempenho Escolar",
    });
    const obras = screen.getByRole("region", {
      name: "Obras Públicas",
    });
    const radar = screen.getByTestId("radar-civico-feed-section");
    const pipeline = screen.getByRole("heading", {
      name: "Do orçamento autorizado ao pagamento",
    });
    const precede = (anterior: Element, posterior: Element) =>
      Boolean(
        anterior.compareDocumentPosition(posterior) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    expect(screen.getAllByTestId("destaque-linha")).toHaveLength(1);
    expect(precede(farmacia, educacao)).toBe(true);
    expect(precede(educacao, obras)).toBe(true);
    expect(precede(obras, radar)).toBe(true);
    expect(precede(radar, pipeline)).toBe(true);
  });

  it("sem nenhuma linha a secao Em destaque nao existe", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoObras: null,
        resumoEducacao: null,
        resumoFarmacia: { status: "indisponivel" },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(screen.queryByRole("heading", { name: "Em destaque" })).toBeNull();
    expect(screen.queryByTestId("destaque-linha")).toBeNull();
  });

  it("farmacia indisponivel com obras presente mostra so o card de obras", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoFarmacia: { status: "indisponivel" },
        resumoEducacao: null,
      }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.getByRole("heading", { name: "Em destaque" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("destaque-linha")).toBeNull();
    expect(
      screen.getByRole("region", {
        name: "Obras Públicas",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Farmácia SUS" })).toBeNull();
  });

  it("educacao com nota indisponivel oculta a linha e a secao", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoObras: null,
        resumoFarmacia: { status: "indisponivel" },
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: null,
          crescimentoPontosIdeb: null,
          atingiuMeta: null,
          posicaoRanking: null,
          totalMunicipios: null,
          variacaoPosicoes: null,
          despesaLiquidadaEducacao: null,
          anosIniciais: { notaIdeb: null },
          anosFinais: { notaIdeb: null },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(screen.queryByRole("heading", { name: "Em destaque" })).toBeNull();
    expect(
      screen.queryByRole("region", {
        name: "Educação Básica e Desempenho Escolar",
      }),
    ).toBeNull();
  });
});
