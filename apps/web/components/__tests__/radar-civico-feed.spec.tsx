import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import posthog from "posthog-js";
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
    textoFactual: "No período analisado, R$ 15,2 mi (+42%).",
    desvioPercentual: 42,
    valorObservadoFormatted: "R$ 15,2 mi",
    valorEsperadoFormatted: "R$ 10,7 mi",
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

    const linhas = screen.getAllByTestId("radar-linha");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveAttribute(
      "href",
      "/porciuncula/pessoal?ano=2024#comissionados",
    );
    expect(
      screen.getByText("Variação em Cargos Comissionados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aporte Expressivo em Saúde")).toBeInTheDocument();
    expect(screen.getAllByText("Entender →")).toHaveLength(2);
    const badges = screen.getAllByTestId("radar-severidade-badge");
    expect(badges.map((b) => b.textContent)).toEqual(["Alta", "Média"]);
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

  it.each(["moderado", "desconhecido"])("grau %s resulta em Baixa", (grau) => {
    render(
      <RadarCivicoFeed
        items={[
          {
            ...mockItems[0],
            grauSeveridade: grau as never,
          },
        ]}
        portalSlug="porciuncula"
        ano={2024}
      />,
    );
    expect(screen.getByTestId("radar-severidade-badge")).toHaveTextContent(
      "Baixa",
    );
  });

  it("clique na linha registra civic_radar_card_clicked", () => {
    render(
      <RadarCivicoFeed
        items={[mockItems[0]]}
        portalSlug="porciuncula"
        ano={2024}
      />,
    );
    fireEvent.click(screen.getByTestId("radar-linha"));
    expect(posthog.capture).toHaveBeenCalledWith(
      "civic_radar_card_clicked",
      expect.objectContaining({
        anomaliaId: "anomalia-1",
        ctaUrl: "/porciuncula/pessoal?ano=2024#comissionados",
      }),
    );
  });
});
