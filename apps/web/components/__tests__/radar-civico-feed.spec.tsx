import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
