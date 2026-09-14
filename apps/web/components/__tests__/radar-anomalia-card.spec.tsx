import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarAnomaliaCard } from "../radar-anomalia-card";

const mockItemCritico: RadarCivicoCardItem = {
  anomaliaId: "anomalia-1",
  tipoAnomalia: "explosao_comissionados",
  titulo: "Variação em Cargos Comissionados",
  dimensaoReferencia: "comissionados",
  grauSeveridade: "critico",
  metodologiaBadge: "Quadro Atual",
  tipoMetodologia: "estoque",
  textoFactual:
    "Em 2024, o quadro de pessoal registrou 165 cargos comissionados ativos, número +65% acima da média histórica observada (100 cargos).",
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
  titulo: "Aporte Expressivo em Saúde",
  dimensaoReferencia: "saude",
  grauSeveridade: "alto",
  badgeSeveridade: {
    label: "Aporte Relevante",
    variant: "alto",
    colorClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  metodologiaBadge: "Histórico Jan a Ago",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período analisado (Jan a Ago), os recursos aplicados na área de Saúde totalizaram R$ 15,2 mi — valor +42% superior à média histórica do período (R$ 10,7 mi).",
  desvioPercentual: 42,
  valorObservadoFormatted: "R$ 15,2 mi",
  valorEsperadoFormatted: "R$ 10,7 mi",
  ctaLabel: "Conferir Aplicação em Saúde →",
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
  metodologiaBadge: "Histórico Jan a Ago",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período de referência, 48,5% do volume financeiro total licitado ocorreu via dispensa ou inexigibilidade de licitação, frente à média histórica de 25,0%.",
  desvioPercentual: 23.5,
  valorObservadoFormatted: "48,5%",
  valorEsperadoFormatted: "25,0%",
  ctaLabel: "Examinar Licitações e Contratos →",
  ctaUrl: "/porciuncula/licitacoes?ano=2024",
  whatsappShareUrl: "https://api.whatsapp.com/send?text=Dispensas%202024",
};

describe("RadarAnomaliaCard", () => {
  it("renderiza card crítico com badges semânticas, textos factuais e links corretos", () => {
    render(<RadarAnomaliaCard item={mockItemCritico} />);

    expect(
      screen.getByText("Variação em Cargos Comissionados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Quadro Atual")).toBeInTheDocument();
    expect(screen.getByText("Atenção Especial")).toBeInTheDocument();
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

  it("renderiza card com severidade alto e aporte em saúde", () => {
    render(<RadarAnomaliaCard item={mockItemAlto} />);

    expect(screen.getByText("Aporte Expressivo em Saúde")).toBeInTheDocument();
    expect(screen.getByText("Histórico Jan a Ago")).toBeInTheDocument();
    expect(screen.getByText("Aporte Relevante")).toBeInTheDocument();
    expect(screen.getByText("R$ 15,2 mi")).toBeInTheDocument();
    expect(screen.getByText("R$ 10,7 mi")).toBeInTheDocument();

    const ctaLink = screen.getByTestId("radar-cta-link");
    expect(ctaLink).toHaveAttribute("href", "/porciuncula/despesas?ano=2024");
    expect(ctaLink).toHaveTextContent("Conferir Aplicação em Saúde →");
  });

  it("renderiza card com severidade moderado", () => {
    render(<RadarAnomaliaCard item={mockItemModerado} />);

    expect(
      screen.getByText("Volume em Contratações Diretas"),
    ).toBeInTheDocument();
    expect(screen.getByText("Acompanhamento")).toBeInTheDocument();
    expect(screen.getByText("48,5%")).toBeInTheDocument();
  });
});
