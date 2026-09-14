import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarAnomaliaCard } from "../radar-anomalia-card";

const mockItemCritico: RadarCivicoCardItem = {
  anomaliaId: "anomalia-1",
  tipoAnomalia: "explosao_comissionados",
  titulo: "Variação Atípica em Cargos Comissionados",
  dimensaoReferencia: "comissionados",
  grauSeveridade: "critico",
  metodologiaBadge: "Posição Atual (Estoque 1:1)",
  tipoMetodologia: "estoque",
  textoFactual:
    "Em 2024, o quadro de pessoal registrou 165 cargos comissionados ativos, número +65% superior à mediana histórica observada (100 cargos).",
  desvioPercentual: 65,
  valorObservadoFormatted: "165 cargos",
  valorEsperadoFormatted: "100 cargos",
  ctaLabel: "Auditar Cargos Comissionados →",
  ctaUrl: "/porciuncula/pessoal?ano=2024#comissionados",
  whatsappShareUrl:
    "https://api.whatsapp.com/send?text=Em%202024%20comissionados",
};

const mockItemAlto: RadarCivicoCardItem = {
  anomaliaId: "anomalia-2",
  tipoAnomalia: "pico_despesa_homologa",
  titulo: "Concentração de Despesas em Saúde",
  dimensaoReferencia: "saude",
  grauSeveridade: "alto",
  metodologiaBadge: "Comparação Homóloga (Jan–Ago)",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período homólogo (Jan a Ago), os gastos empenhados na função Saúde somaram R$ 15,2mi, com variação de +42% sobre a mediana histórica do período (R$ 10,7mi).",
  desvioPercentual: 42,
  valorObservadoFormatted: "R$ 15,2mi",
  valorEsperadoFormatted: "R$ 10,7mi",
  ctaLabel: "Explorar Despesas de Saúde →",
  ctaUrl: "/porciuncula/despesas?ano=2024",
  whatsappShareUrl:
    "https://api.whatsapp.com/send?text=Gastos%20saude%20homologa",
};

const mockItemModerado: RadarCivicoCardItem = {
  anomaliaId: "anomalia-3",
  tipoAnomalia: "concentracao_dispensa",
  titulo: "Volume em Contratações Diretas",
  dimensaoReferencia: "dispensas",
  grauSeveridade: "moderado",
  metodologiaBadge: "Comparação Homóloga (Jan–Ago)",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período homólogo, 48.5% do volume financeiro total licitado ocorreu via dispensa ou inexigibilidade de licitação, frente à mediana histórica de 25.0%.",
  desvioPercentual: 23.5,
  valorObservadoFormatted: "48.5%",
  valorEsperadoFormatted: "25.0%",
  ctaLabel: "Examinar Licitações e Dispensas →",
  ctaUrl: "/porciuncula/licitacoes?ano=2024",
  whatsappShareUrl: "https://api.whatsapp.com/send?text=Dispensas%202024",
};

describe("RadarAnomaliaCard", () => {
  it("renderiza card crítico com badges semânticas, textos factuais e links corretos", () => {
    render(<RadarAnomaliaCard item={mockItemCritico} />);

    expect(
      screen.getByText("Variação Atípica em Cargos Comissionados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Posição Atual (Estoque 1:1)")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText(/165 cargos comissionados/)).toBeInTheDocument();
    expect(screen.getByText("165 cargos")).toBeInTheDocument();
    expect(screen.getByText("100 cargos")).toBeInTheDocument();

    const ctaLink = screen.getByTestId("radar-cta-link");
    expect(ctaLink).toHaveAttribute(
      "href",
      "/porciuncula/pessoal?ano=2024#comissionados",
    );
    expect(ctaLink).toHaveTextContent("Auditar Cargos Comissionados →");

    const whatsappButton = screen.getByTestId("radar-whatsapp-button");
    expect(whatsappButton).toHaveAttribute(
      "href",
      "https://api.whatsapp.com/send?text=Em%202024%20comissionados",
    );
    expect(whatsappButton).toHaveAttribute("target", "_blank");
    expect(whatsappButton).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renderiza card com severidade alto e metodologia homóloga", () => {
    render(<RadarAnomaliaCard item={mockItemAlto} />);

    expect(
      screen.getByText("Concentração de Despesas em Saúde"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Comparação Homóloga (Jan–Ago)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Alto Desvio")).toBeInTheDocument();
    expect(screen.getByText("R$ 15,2mi")).toBeInTheDocument();
    expect(screen.getByText("R$ 10,7mi")).toBeInTheDocument();

    const ctaLink = screen.getByTestId("radar-cta-link");
    expect(ctaLink).toHaveAttribute("href", "/porciuncula/despesas?ano=2024");
  });

  it("renderiza card com severidade moderado", () => {
    render(<RadarAnomaliaCard item={mockItemModerado} />);

    expect(
      screen.getByText("Volume em Contratações Diretas"),
    ).toBeInTheDocument();
    expect(screen.getByText("Moderado")).toBeInTheDocument();
    expect(screen.getByText("48.5%")).toBeInTheDocument();
  });
});
