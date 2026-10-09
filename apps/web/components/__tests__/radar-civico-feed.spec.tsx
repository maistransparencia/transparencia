import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarCivicoFeed } from "../radar-civico-feed";

const mockItems: RadarCivicoCardItem[] = [
  {
    anomaliaId: "anomalia-1",
    tipoAnomalia: "explosao_comissionados",
    titulo: "Variação em Cargos Comissionados",
    dimensaoReferencia: "comissionados",
    grauSeveridade: "critico",
    metodologiaBadge: "Quadro Atual",
    tipoMetodologia: "estoque",
    textoFactual: "Em 2024, 165 cargos (+65%).",
    desvioPercentual: 65,
    valorObservadoFormatted: "165 cargos",
    valorEsperadoFormatted: "100 cargos",
    ctaLabel: "Auditar Cargos Comissionados",
    ctaUrl: "/porciuncula/pessoal?ano=2024#comissionados",
    whatsappShareUrl: "https://api.whatsapp.com/send?text=msg1",
  },
  {
    anomaliaId: "anomalia-2",
    tipoAnomalia: "pico_despesa_homologa",
    titulo: "Aporte Expressivo em Saúde",
    dimensaoReferencia: "saude",
    grauSeveridade: "alto",
    metodologiaBadge: "Histórico Jan a Ago",
    tipoMetodologia: "homologa",
    textoFactual: "No período analisado, R$ 15.2mi (+42%).",
    desvioPercentual: 42,
    valorObservadoFormatted: "R$ 15.2mi",
    valorEsperadoFormatted: "R$ 10.7mi",
    ctaLabel: "Conferir Aplicação em Saúde",
    ctaUrl: "/porciuncula/despesas?ano=2024",
    whatsappShareUrl: "https://api.whatsapp.com/send?text=msg2",
  },
];

describe("RadarCivicoFeed", () => {
  it("renderiza feed com múltiplos cards de anomalia no primeiro scroll e link para todos os anos", () => {
    render(
      <RadarCivicoFeed
        items={mockItems}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    expect(screen.getByText(/Radar Cívico Municipal/)).toBeInTheDocument();
    expect(
      screen.getByText("Radar Cívico Municipal (2024)"),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Ver todos os anos →" });
    expect(link).toHaveAttribute("href", "/porciuncula/radar");

    const cards = screen.getAllByTestId("radar-anomalia-card");
    expect(cards).toHaveLength(2);

    expect(
      screen.getByText("Variação em Cargos Comissionados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aporte Expressivo em Saúde")).toBeInTheDocument();

    const container = screen.getByTestId("radar-cards-container");
    expect(container).toHaveClass("snap-x");
  });

  it("renderiza empty state de conformidade quando não houver anomalias no exercício", () => {
    render(
      <RadarCivicoFeed
        items={[]}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    expect(screen.getByText(/Radar Cívico Municipal/)).toBeInTheDocument();
    expect(screen.getByTestId("radar-empty-state")).toBeInTheDocument();
    expect(
      screen.getByText("Contas e Indicadores em Conformidade Histórica"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhuma anomalia fiscal ou desvio atípico/),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Ver todos os anos →" });
    expect(link).toHaveAttribute("href", "/porciuncula/radar");
  });

  it("não renderiza pílula no título mantendo o cabeçalho limpo", () => {
    render(
      <RadarCivicoFeed
        items={mockItems}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    expect(
      screen.queryByTestId("radar-licitacoes-andamento-pill"),
    ).not.toBeInTheDocument();
  });

  it("renderiza indicador de scroll horizontal em mobile quando houver múltiplos cards", () => {
    render(
      <RadarCivicoFeed
        items={mockItems}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    const indicator = screen.getByTestId("radar-scroll-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("md:hidden");

    const counter = screen.getByTestId("radar-scroll-counter");
    expect(counter).toHaveTextContent("1 de 2 alertas");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("permite navegar entre os alertas ao clicar nos botões e nos marcadores e aciona scrollIntoView", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <RadarCivicoFeed
        items={mockItems}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: "Próximo alerta" });
    const prevBtn = screen.getByRole("button", { name: "Alerta anterior" });
    const tabs = screen.getAllByRole("tab");
    const counter = screen.getByTestId("radar-scroll-counter");

    // Inicialmente no primeiro card
    expect(counter).toHaveTextContent("1 de 2 alertas");
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Avança para o segundo card
    fireEvent.click(nextBtn);
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(counter).toHaveTextContent("2 de 2 alertas");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    // Retorna para o primeiro card via marcador (tab)
    fireEvent.click(tabs[0]);
    expect(counter).toHaveTextContent("1 de 2 alertas");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("atualiza o indicador ao rolar o container usando a largura real dos cards (cardWidth > 0)", () => {
    render(
      <RadarCivicoFeed
        items={mockItems}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    const container = screen.getByTestId("radar-cards-container");
    const counter = screen.getByTestId("radar-scroll-counter");
    const tabs = screen.getAllByRole("tab");

    expect(counter).toHaveTextContent("1 de 2 alertas");

    // Simula layout real com cardWidth > 0 no firstElementChild
    const firstChild = container.firstElementChild as HTMLElement;
    Object.defineProperty(firstChild, "clientWidth", {
      value: 360,
      configurable: true,
    });
    // step = 360 + 16 = 376. Com scrollLeft = 380, round(380 / 376) = 1 (segundo card)
    Object.defineProperty(container, "scrollLeft", {
      value: 380,
      configurable: true,
    });

    fireEvent.scroll(container);

    expect(counter).toHaveTextContent("2 de 2 alertas");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("não renderiza indicador de scroll quando houver apenas 1 card", () => {
    render(
      <RadarCivicoFeed
        items={[mockItems[0]]}
        portalName="Porciúncula"
        portalSlug="porciuncula"
        ano={2024}
      />,
    );

    expect(
      screen.queryByTestId("radar-scroll-indicator"),
    ).not.toBeInTheDocument();
  });
});
