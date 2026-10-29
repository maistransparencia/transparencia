import { fireEvent, render, screen } from "@testing-library/react";
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
      decomposicaoDivida: [
        {
          empresaId: "1",
          entidadeNome: "Fundo Municipal de Assistência Social",
          valorDivida: 5000,
          percentual: 100,
        },
      ],
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

  it("não renderiza nada quando não há itens", () => {
    const { container } = render(
      <RadarGastosSensiveis itens={[]} anoAtual={2026} anoAnterior={2025} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("colore selos de variação por token", () => {
    const { container } = render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
      />,
    );

    expect(container.querySelector(".text-warn-text")).not.toBeNull();
    expect(container.querySelector(".text-danger-text")).toBeNull();
    expect(container.querySelector(".text-ok-text")).not.toBeNull();
    expect(screen.getAllByText("Sem histórico").length).toBeGreaterThan(0);
  });

  it("posiciona o menu de auditoria na última coluna da linha", () => {
    const { container } = render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const primeiraLinha = container.querySelector("tbody tr");
    const celulas = primeiraLinha?.querySelectorAll("td") ?? [];
    const celulaMenu = celulas[celulas.length - 2];
    expect(
      celulaMenu?.querySelector("button[aria-label*='auditoria' i]"),
    ).not.toBeNull();
    expect(celulas[0]?.querySelector("button")).toBeNull();
  });

  it("cada categoria renderiza o próprio ícone", () => {
    const { container } = render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
      />,
    );

    for (const icone of [
      "fuel",
      "truck",
      "building-2",
      "party-popper",
      "plane",
      "hammer",
    ]) {
      expect(container.querySelector(`svg.lucide-${icone}`)).not.toBeNull();
    }
  });

  it("renderiza as 6 categorias de gastos sensíveis incluindo Locação de Imóveis", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
      />,
    );

    expect(screen.getAllByText("Combustíveis & Frotas").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText("Locação de Máquinas & Veículos").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Locação de Imóveis").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Eventos, Shows & Festividades").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Diárias & Viagens a Serviço").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Obras & Infraestrutura").length,
    ).toBeGreaterThan(0);
  });

  it("expande a linha com dívida e mostra a decomposição por entidade", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        totalDespesasPagas={800000}
      />,
    );

    expect(
      screen.queryByText("Fundo Municipal de Assistência Social"),
    ).not.toBeInTheDocument();

    const botao = screen
      .getAllByText("Locação de Imóveis")
      .map((el) => el.closest("tr"))
      .find((tr) => tr !== null)
      ?.querySelector("button[aria-expanded]");
    expect(botao).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(botao as HTMLElement);

    expect(botao).toHaveAttribute("aria-expanded", "true");
    // a linha expandida aparece na tabela (desktop) e no accordion mobile
    expect(
      screen.getAllByText(/decomposição da dívida real/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Fundo Municipal de Assistência Social").length,
    ).toBeGreaterThan(0);
  });

  it("destaca a dívida real com os tokens de aviso e indica categorias sem dívida", () => {
    const { container } = render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        totalDespesasPagas={800000}
      />,
    );

    // desktop e mobile são renderizados juntos; o CSS alterna a exibição
    expect(container.querySelectorAll(".font-bold.text-warn-text").length).toBe(
      2,
    );
    expect(screen.getAllByText("Nada pendente").length).toBe(10);
  });

  it("calcula o percentual do pago sobre o total de despesas pagas", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        totalDespesasPagas={1000000}
      />,
    );

    expect(screen.getAllByText("50,0%").length).toBeGreaterThan(0);
  });

  it("renderiza botões de auditoria Show Your Work para cada categoria", () => {
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

  it("oferece o link Baixar registros (CSV) dentro do accordion expandido", () => {
    render(
      <RadarGastosSensiveis
        itens={sampleItens}
        anoAtual={2026}
        anoAnterior={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.queryByText("Baixar registros (CSV)"),
    ).not.toBeInTheDocument();

    const botao = screen
      .getAllByText("Locação de Imóveis")
      .map((el) => el.closest("tr"))
      .find((tr) => tr !== null)
      ?.querySelector("button[aria-expanded]");
    fireEvent.click(botao as HTMLElement);

    expect(
      screen.getAllByText("Baixar registros (CSV)").length,
    ).toBeGreaterThan(0);
  });

  it("retorna null se a lista de itens estiver vazia", () => {
    const { container } = render(
      <RadarGastosSensiveis itens={[]} anoAtual={2026} anoAnterior={2025} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
