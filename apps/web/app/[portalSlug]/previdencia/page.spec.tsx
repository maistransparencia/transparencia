import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadPrevidenciaData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadPrevidenciaData>>;

const { loadPrevidenciaDataMock } = vi.hoisted(() => ({
  loadPrevidenciaDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadPrevidenciaData: loadPrevidenciaDataMock,
}));

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn().mockImplementation((slug?: string) => {
    if (slug === "municipio_sem_rpps") {
      return Promise.resolve({
        portalSlug: "municipio_sem_rpps",
        displayName: "Município Sem RPPS",
        previdencia: {
          habilitado: false,
          sigla: "INSS",
          nome: "Regime Geral",
        },
      });
    }
    if (slug === "natividade") {
      return Promise.resolve({
        portalSlug: "natividade",
        displayName: "Prefeitura de Natividade",
        previdencia: {
          habilitado: true,
          sigla: "IPAMN",
          nome: "Instituto de Previdência de Natividade",
        },
      });
    }
    return Promise.resolve({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
      previdencia: {
        habilitado: true,
        sigla: "CAPREM",
        nome: "Fundo de Previdência",
      },
    });
  }),
}));

const { default: PrevidenciaPage, generateMetadata } = await import("./page");

function makeRaw(
  overrides: { previdencia?: Record<string, unknown> } & Record<
    string,
    unknown
  > = {},
): RawData {
  const { previdencia: prevOverride, ...rest } = overrides;
  return {
    context: { selectedYear: 2024, isCurrentYear: false },
    portalConfig: {
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
      previdencia: {
        habilitado: true,
        sigla: "CAPREM",
        nome: "Fundo de Previdência",
      },
    },
    previdencia: {
      entidades: [],
      natureza: [],
      cadprevParcelamentos: [],
      actuarialTrend: [],
      totalEmpenhado: 1000,
      totalLiquidado: 900,
      totalPago: 800,
      taxaExecucao: 0.8,
      totalAporteAtuarial: 500,
      totalDividaResgatada: 100,
      totalCaspPlanoSaude: 0,
      actuarialRisk: {
        totalAporteExigido: 500,
        totalAporteQuitado: 400,
        romboAporteNaoRepassado: 100,
        taxaAdimplenciaAporte: 80,
        totalEmpenhadoPatronal: 300,
        totalPagoPatronal: 250,
        romboPatronalNaoRepassado: 50,
        deficitMedioMensal: 5,
        totalAmortizacaoDivida: 100,
        variacaoAmortizacaoPct: 0,
        servidoresEfetivos: 20,
        servidoresTemporariosComissionados: 2,
        razaoTemporariosEfetivosPct: 10,
      },
      ...prevOverride,
    },
    caprem: {
      entidades: [],
      natureza: [],
      cadprevParcelamentos: [],
      actuarialTrend: [],
      totalEmpenhado: 1000,
      totalLiquidado: 900,
      totalPago: 800,
      taxaExecucao: 0.8,
      totalAporteAtuarial: 500,
      totalDividaResgatada: 100,
      totalCaspPlanoSaude: 0,
      actuarialRisk: {
        totalAporteExigido: 500,
        totalAporteQuitado: 400,
        romboAporteNaoRepassado: 100,
        taxaAdimplenciaAporte: 80,
        totalEmpenhadoPatronal: 300,
        totalPagoPatronal: 250,
        romboPatronalNaoRepassado: 50,
        deficitMedioMensal: 5,
        totalAmortizacaoDivida: 100,
        variacaoAmortizacaoPct: 0,
        servidoresEfetivos: 20,
        servidoresTemporariosComissionados: 2,
        razaoTemporariosEfetivosPct: 10,
      },
      ...prevOverride,
    },
    ...rest,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("PrevidenciaPage", () => {
  it("happy-path: renderiza KPIs principais mesmo sem entidades/natureza", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(makeRaw());

    const element = await PrevidenciaPage(props);
    render(element);

    expect(screen.getByText("Total Empenhado")).toBeInTheDocument();
    expect(screen.getByText("Índice de Adimplência")).toBeInTheDocument();
  });

  it("renderiza sigla institucional dinâmica da autarquia (ex: IPAMN)", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        portalConfig: {
          portalSlug: "natividade",
          displayName: "Prefeitura de Natividade",
          previdencia: {
            habilitado: true,
            sigla: "IPAMN",
            nome: "Instituto de Previdência de Natividade",
          },
        },
      }),
    );

    const element = await PrevidenciaPage({
      params: Promise.resolve({ portalSlug: "natividade" }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(
      screen.getByText(/Total Empenhado para o IPAMN/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/TEMAS · PREVIDÊNCIA MUNICIPAL \(IPAMN\)/i),
    ).toBeInTheDocument();
  });

  it("esconde a seção de composição contábil quando natureza está vazia", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({ previdencia: { natureza: [] } }),
    );

    const element = await PrevidenciaPage(props);
    render(element);

    expect(
      screen.queryByText("Composição Contábil dos Repasses"),
    ).not.toBeInTheDocument();
  });

  it("exibe a seção de composição contábil quando natureza tem dados", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        previdencia: {
          natureza: [
            {
              elemento: "97",
              descricao: "Aporte",
              destino: "aporte_atuarial_caprem",
              empenhado: 100,
              pago: 90,
            },
          ],
        },
      }),
    );

    const element = await PrevidenciaPage(props);
    render(element);

    expect(
      screen.getByText("Composição Contábil dos Repasses"),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de disponibilidade financeira em caixa do RPPS (SICONFI)", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        posicaoFinanceira: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          mesMaisRecente: 12,
          dataHomologacao: "2024-12-31",
          totalCaixaGeral: 15000000,
          totalRecursosLivres: 5000000,
          totalRecursosVinculados: 10000000,
          totalCaixaPrevidencia: 8500000,
          totalRecursosPrevidencia: 8500000,
          hasSaldoDescoberto: false,
          entidades: [],
          previdencia: [
            {
              poderOrgao: "10132",
              entidadeNome: "CAPREM",
              cnpj: "33.444.555/0001-66",
              empresaId: "4",
              grupoDestinacao: "previdencia",
              saldoCaixaBancos: 8500000,
              saldoRecursosLivres: 0,
              saldoRecursosVinculados: 8500000,
              saldoCaixaAnoAnterior: 7500000,
              variacaoAnualPercentual: 13.3,
              saldoDescobertoFlag: false,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
          ],
        },
      }),
    );

    const element = await PrevidenciaPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e aplicações do rpps/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/segregado do caixa geral do município/i),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 8.5mi")).toBeInTheDocument();
  });

  it("renderiza a seção de evolução do patrimônio histórico da previdência", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        previdencia: {
          actuarialTrend: [
            {
              ano: 2021,
              patrimonioFinanceiroTotal: 60368778.97,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: null,
              variacaoPatrimonioPct: null,
            },
            {
              ano: 2022,
              patrimonioFinanceiroTotal: 588266.38,
              inconsistenciaDeclaracaoFlag: true,
              variacaoPatrimonioAbs: -59780512.59,
              variacaoPatrimonioPct: -99.03,
            },
            {
              ano: 2023,
              patrimonioFinanceiroTotal: 36971987.89,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: null,
              variacaoPatrimonioPct: null,
            },
            {
              ano: 2026,
              patrimonioFinanceiroTotal: 33383702.66,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: -2594863.09,
              variacaoPatrimonioPct: -7.21,
            },
          ],
        },
      }),
    );

    const element = await PrevidenciaPage(props);
    const { container } = render(element);

    expect(container.querySelector("#patrimonio")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /evolução do patrimônio financeiro da previdência/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pico Histórico").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("R$ 60.4mi")).toBeInTheDocument();
    expect(screen.getByText("Queima Média Anual")).toBeInTheDocument();
  });

  it("renderiza mensagem informativa quando portal sem RPPS (habilitado === false)", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        portalConfig: {
          portalSlug: "municipio_sem_rpps",
          displayName: "Município Sem RPPS",
          previdencia: {
            habilitado: false,
            sigla: "INSS",
            nome: "Regime Geral",
          },
        },
      }),
    );

    const element = await PrevidenciaPage({
      params: Promise.resolve({ portalSlug: "municipio_sem_rpps" }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(
      screen.getByText(
        "Município sem Regime Próprio de Previdência Social (RPPS) ativo",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Regime Geral de Previdência Social \(RGPS \/ INSS\)/i),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de acordos CADPREV sem os cards de KPI redundantes", async () => {
    loadPrevidenciaDataMock.mockResolvedValue(
      makeRaw({
        previdencia: {
          cadprevParcelamentos: [
            {
              numeroCadprev: "00999/2024",
              descricao: "Termo de Confissão Cadprev Teste",
              elemento: "71",
              empenhado: 50000,
              pago: 45000,
            },
          ],
        },
      }),
    );

    const element = await PrevidenciaPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /acordos de parcelamento e dívidas previdenciárias \(cadprev \/ ministério da previdência\)/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Termo de Confissão Cadprev Teste"),
    ).toBeInTheDocument();
  });
});

describe("generateMetadata", () => {
  it("gera metadata dinâmica com a sigla e nome da previdência (ex: CAPREM)", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    expect(meta.title).toBe("CAPREM | Prefeitura de Porciúncula");
    expect(meta.description).toContain("CAPREM");
    expect(meta.description).toContain("Fundo de Previdência");
    expect(meta.keywords).toContain("CAPREM");
    expect(meta.keywords).toContain("RPPS");
  });

  it("gera metadata dinâmica para outra autarquia (ex: IPAMN)", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ portalSlug: "natividade" }),
      searchParams: Promise.resolve({}),
    });

    expect(meta.title).toBe("IPAMN | Prefeitura de Natividade");
    expect(meta.description).toContain("IPAMN");
    expect(meta.keywords).toContain("IPAMN");
  });

  it("gera metadata com fallback quando previdência está desabilitada (habilitado === false)", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ portalSlug: "municipio_sem_rpps" }),
      searchParams: Promise.resolve({}),
    });

    expect(meta.title).toBe("Previdência | Município Sem RPPS");
    expect(meta.description).toContain(
      "não possui Regime Próprio de Previdência Social",
    );
    expect(meta.keywords).toContain("RGPS");
    expect(meta.keywords).toContain("INSS");
  });
});
