import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadDespesasData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadDespesasData>>;

const { loadDespesasDataMock } = vi.hoisted(() => ({
  loadDespesasDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadDespesasData: loadDespesasDataMock,
}));

const { default: DespesasPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    metricasGerais: {
      empenhado: 1_000_000,
      liquidado: 800_000,
      pago: 700_000,
      taxaLiquidacao: 80,
      taxaPagamento: 70,
    },
    radarGastosSensiveis: {
      itens: [
        {
          categoria: "combustivel_frota",
          valorPagoAnoAtual: 150_000,
          valorPagoAnoAnterior: 100_000,
          valorLiquidadoAnoAtual: 150_000,
          valorEmpenhadoAnoAtual: 200_000,
          valorLiquidadoPendente: 0,
          variacaoPercentual: 50,
          tendencia: "aumento",
        },
      ],
      anoAtual: 2024,
      anoAnterior: 2023,
    },
    restosResumo: {
      totalPendente: 200_000,
      totalLiquidadoPendente: 50_000,
      fornecedoresAguardando: 5,
      dividaMaisAntigaAno: 2021,
      topFornecedores: [],
    },
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("DespesasPage", () => {
  it("happy-path: renderiza KPIs principais com dados completos", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    expect(
      screen.getByText("Despesas & Controle de Gastos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Total empenhado")).toBeInTheDocument();
    expect(
      screen.getByText("Radar de Gastos Sensíveis & Controle Fiscal"),
    ).toBeInTheDocument();
    expect(screen.getByText("Combustíveis & Frotas")).toBeInTheDocument();
  });

  it("esconde seções condicionais quando as listas vêm vazias", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    // topFornecedores de restos vazio -> não renderiza nome
    expect(screen.queryByText("Fornecedor X")).not.toBeInTheDocument();
  });

  it("exibe seções condicionais quando os dados vêm populados", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({
        restosResumo: {
          totalPendente: 200_000,
          totalLiquidadoPendente: 50_000,
          fornecedoresAguardando: 5,
          dividaMaisAntigaAno: 2021,
          topFornecedores: [
            {
              fornecedor: "Fornecedor X",
              valor: 1000,
              valorTotal: 1000,
              liquidado: 600,
              empenhadoALiquidar: 400,
            },
          ],
        },
      }),
    );

    const element = await DespesasPage(props);
    render(element);

    expect(screen.getByText("Fornecedor X")).toBeInTheDocument();
  });
});
