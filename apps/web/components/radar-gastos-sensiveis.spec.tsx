import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type ItemGastoSensivel,
  RadarGastosSensiveis,
} from "./radar-gastos-sensiveis";

describe("RadarGastosSensiveis Component", () => {
  const sampleItens: ItemGastoSensivel[] = [
    {
      categoria: "combustivel_frota",
      valorPagoAnoAtual: 100000,
      valorPagoAnoAnterior: 90000,
      valorLiquidadoAnoAtual: 100000,
      valorEmpenhadoAnoAtual: 110000,
      valorLiquidadoPendente: 0,
      variacaoPercentual: 11.1,
      tendencia: "aumento",
    },
    {
      categoria: "locacao_maquinas_veiculos",
      valorPagoAnoAtual: 80000,
      valorPagoAnoAnterior: 85000,
      valorLiquidadoAnoAtual: 80000,
      valorEmpenhadoAnoAtual: 90000,
      valorLiquidadoPendente: 0,
      variacaoPercentual: -5.9,
      tendencia: "economia",
    },
    {
      categoria: "locacao_imoveis",
      valorPagoAnoAtual: 60000,
      valorPagoAnoAnterior: 50000,
      valorLiquidadoAnoAtual: 60000,
      valorEmpenhadoAnoAtual: 65000,
      valorLiquidadoPendente: 5000,
      dividaRealAcumulada: 5000,
      variacaoPercentual: 20.0,
      tendencia: "aumento",
    },
    {
      categoria: "eventos_festas",
      valorPagoAnoAtual: 40000,
      valorPagoAnoAnterior: 40000,
      valorLiquidadoAnoAtual: 40000,
      valorEmpenhadoAnoAtual: 40000,
      valorLiquidadoPendente: 0,
      variacaoPercentual: 0,
      tendencia: "estavel",
    },
    {
      categoria: "diarias_viagens",
      valorPagoAnoAtual: 20000,
      valorPagoAnoAnterior: 25000,
      valorLiquidadoAnoAtual: 20000,
      valorEmpenhadoAnoAtual: 22000,
      valorLiquidadoPendente: 0,
      variacaoPercentual: -20.0,
      tendencia: "economia",
    },
    {
      categoria: "obras_infraestrutura",
      valorPagoAnoAtual: 500000,
      valorPagoAnoAnterior: 0,
      valorLiquidadoAnoAtual: 500000,
      valorEmpenhadoAnoAtual: 600000,
      valorLiquidadoPendente: 0,
      variacaoPercentual: null,
      tendencia: "sem_historico",
    },
  ];

  it("renderiza todos os 6 cards de gastos sensíveis incluindo Locação de Imóveis", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
      />,
    );

    expect(screen.getByText("Combustíveis & Frotas")).toBeInTheDocument();
    expect(
      screen.getByText("Locação de Máquinas & Veículos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Locação de Imóveis")).toBeInTheDocument();
    expect(
      screen.getByText("Eventos, Shows & Festividades"),
    ).toBeInTheDocument();
    expect(screen.getByText("Diárias & Viagens a Serviço")).toBeInTheDocument();
    expect(screen.getByText("Obras & Infraestrutura")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Aluguel de prédios, salas, galpões e terrenos para órgãos públicos",
      ),
    ).toBeInTheDocument();
  });

  it("renderiza botões de auditoria Show Your Work para cada card", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const auditButtons = screen.getAllByRole("button", {
      name: /opções de auditoria/i,
    });
    expect(auditButtons.length).toBe(6);
  });

  it("retorna null se a lista de itens estiver vazia", () => {
    const { container } = render(
      <RadarGastosSensiveis itens={[]} anoAtual={2026} anoAnterior={2025} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
