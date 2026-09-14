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
            deepLinkRota:
              "/porciuncula_prefeitura/pessoal?ano=2024#comissionados",
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
    expect(screen.getByTestId("radar-whatsapp-button")).toBeInTheDocument();
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
});
