import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { loadRadarData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadRadarData>>;

const { loadRadarDataMock } = vi.hoisted(() => ({
  loadRadarDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadRadarData: loadRadarDataMock,
}));

const { default: RadarPage } = await import("./page");

function makeRaw(overrides: Partial<RawData> = {}): RawData {
  return {
    portalSlug: "porciuncula",
    portalConfig: {
      displayName: "Porciúncula",
      stateUF: "RJ",
    } as unknown as RawData["portalConfig"],
    entidades: [],
    alertas: [],
    entidade: undefined,
    ...overrides,
  };
}

describe("RadarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza empty-state global de conformidade quando não houver alertas em nenhum exercício", async () => {
    loadRadarDataMock.mockResolvedValue(makeRaw({ alertas: [] }));

    const page = await RadarPage({
      params: Promise.resolve({ portalSlug: "porciuncula" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("Radar Cívico Municipal")).toBeInTheDocument();
    expect(screen.getByTestId("radar-empty-state")).toBeInTheDocument();
    expect(
      screen.getByText("Contas e Indicadores em Plena Conformidade Histórica"),
    ).toBeInTheDocument();
  });

  it("renderiza seções anuais cronológicas, barra de âncoras e cards de alerta", async () => {
    loadRadarDataMock.mockResolvedValue(
      makeRaw({
        alertas: [
          {
            anomaliaId: "anomalia-2026-1",
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
            metodoDeteccao: "limite_normativo",
          },
          {
            anomaliaId: "anomalia-2024-1",
            portalSlug: "porciuncula",
            ano: 2024,
            tipoAnomalia: "rombo_caixa",
            dimensaoReferencia: "recursos_livres",
            grauSeveridade: "critico",
            desvioPercentual: 60,
            valorObservado: 200000,
            valorEsperado: 1500000,
            mesInicial: 12,
            mesFinal: 12,
            licitacaoNumero: null,
            metodoDeteccao: "iqr_estoque",
          },
        ],
      }),
    );

    const page = await RadarPage({
      params: Promise.resolve({ portalSlug: "porciuncula" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    // Título e resumo geral
    expect(screen.getByText("Radar Cívico Municipal")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Seções por ano
    expect(screen.getByTestId("radar-secao-ano-2026")).toBeInTheDocument();
    expect(screen.getByTestId("radar-secao-ano-2024")).toBeInTheDocument();

    // Cards renderizados
    expect(
      screen.getByText("Elevada Opacidade em Gastos Genéricos"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Disponibilidade em Recursos Livres"),
    ).toBeInTheDocument();

    // Barra de navegação rápida por exercício
    const navAnchors = screen.getByRole("navigation", {
      name: "Navegação por exercício",
    });
    expect(navAnchors).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });
});
