import { fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarAnomaliaCard } from "../radar-anomalia-card";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

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
  ctaLabel: "Auditar Cargos Comissionados",
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
    colorClass: "bg-blue-50 text-blue-900 border-blue-200",
  },
  metodologiaBadge: "Histórico Jan a Ago",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período analisado (Jan a Ago), os recursos aplicados na área de Saúde totalizaram R$ 15.2mi — valor +42% superior à média histórica do período (R$ 10.7mi).",
  desvioPercentual: 42,
  valorObservadoFormatted: "R$ 15.2mi",
  valorEsperadoFormatted: "R$ 10.7mi",
  ctaLabel: "Conferir Aplicação em Saúde",
  ctaUrl: "/porciuncula/despesas?ano=2024",
  whatsappShareUrl:
    "https://api.whatsapp.com/send?text=Gastos%20saude%20homologa",
};

const mockItemModerado: RadarCivicoCardItem = {
  anomaliaId: "anomalia-3",
  tipoAnomalia: "concentracao_dispensa",
  titulo: "Compras sem Licitação",
  dimensaoReferencia: "dispensas",
  grauSeveridade: "moderado",
  metodologiaBadge: "Histórico Jan a Ago",
  tipoMetodologia: "homologa",
  textoFactual:
    "No período analisado, 48.5% dos processos de contratação foram realizados por dispensa ou inexigibilidade de licitação, frente à média histórica de 25%.",
  desvioPercentual: 23.5,
  valorObservadoFormatted: "48.5%",
  valorEsperadoFormatted: "25%",
  ctaLabel: "Examinar Licitações e Compras",
  ctaUrl: "/porciuncula/licitacoes?ano=2024",
  whatsappShareUrl: "https://api.whatsapp.com/send?text=Dispensas%202024",
};

describe("RadarAnomaliaCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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
    expect(ctaLink).toHaveTextContent("Auditar Cargos Comissionados");

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
    expect(screen.getByText("R$ 15.2mi")).toBeInTheDocument();
    expect(screen.getByText("R$ 10.7mi")).toBeInTheDocument();

    const ctaLink = screen.getByTestId("radar-cta-link");
    expect(ctaLink).toHaveAttribute("href", "/porciuncula/despesas?ano=2024");
    expect(ctaLink).toHaveTextContent("Conferir Aplicação em Saúde");
  });

  it("renderiza card com severidade moderado e compras sem licitação", () => {
    render(<RadarAnomaliaCard item={mockItemModerado} />);

    expect(screen.getByText("Compras sem Licitação")).toBeInTheDocument();
    expect(screen.getByText("Acompanhamento")).toBeInTheDocument();
    expect(screen.getByText("48.5%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renderiza card de opacidade com rótulo customizado de limite de alerta", () => {
    const mockItemOpacidade: RadarCivicoCardItem = {
      anomaliaId: "anomalia-opac",
      tipoAnomalia: "opacidade_gastos_genericos",
      titulo: "Elevada Opacidade em Gastos Genéricos",
      dimensaoReferencia: "gastos_genericos",
      grauSeveridade: "alto",
      metodologiaBadge: "Quota de Alerta (30%)",
      tipoMetodologia: "estoque",
      esperadoLabel: "Limite de Alerta",
      textoFactual: "Opacidade de 30.3% em 2026.",
      desvioPercentual: 1.03,
      valorObservadoFormatted: "30.3%",
      valorEsperadoFormatted: "30%",
      ctaLabel: "Fiscalizar Gastos Genéricos",
      ctaUrl: "/porciuncula/despesas?ano=2026#gastos-genericos",
      whatsappShareUrl: "https://api.whatsapp.com/send?text=Opacidade",
    };

    render(<RadarAnomaliaCard item={mockItemOpacidade} />);

    expect(
      screen.getByText("Elevada Opacidade em Gastos Genéricos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Quota de Alerta (30%)")).toBeInTheDocument();
    expect(screen.getByText("Limite de Alerta")).toBeInTheDocument();
    expect(screen.getByText("30.3%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renderiza card de inadimplência no aporte atuarial com fundamentação legal oficial (Lei 9.717/1998)", () => {
    const mockItemAtuarial: RadarCivicoCardItem = {
      anomaliaId: "anomalia-atuarial",
      tipoAnomalia: "inadimplencia_aporte_rpps",
      titulo: "Inadimplência no Aporte Atuarial (RPPS)",
      dimensaoReferencia: "aporte_atuarial",
      grauSeveridade: "critico",
      metodologiaBadge: "Meta Atuarial",
      tipoMetodologia: "estoque",
      esperadoLabel: "Aporte Exigido",
      textoFactual:
        "Em 2024, o município quitou R$ 650.0mil do aporte atuarial exigido de R$ 1.0mi.",
      desvioPercentual: 35,
      desvioPercentualFormatted: "-35%",
      valorObservadoFormatted: "R$ 650.0mil",
      valorEsperadoFormatted: "R$ 1.0mi",
      ctaLabel: "Auditar Aporte Atuarial",
      ctaUrl: "/porciuncula/caprem?ano=2024#atuarial",
      whatsappShareUrl: "https://api.whatsapp.com/send?text=Atuarial",
      fundamentacaoLegal: {
        label: "Lei nº 9.717/1998",
        url: "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm",
      },
    };

    render(<RadarAnomaliaCard item={mockItemAtuarial} />);

    expect(
      screen.getByText("Inadimplência no Aporte Atuarial (RPPS)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Meta Atuarial")).toBeInTheDocument();
    expect(screen.getByText("Aporte Exigido")).toBeInTheDocument();
    expect(screen.getByText("R$ 650.0mil")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.0mi")).toBeInTheDocument();
    expect(screen.getByText("-35%")).toBeInTheDocument();

    const legalLink = screen.getByTestId("radar-legal-link");
    expect(legalLink).toBeInTheDocument();
    expect(legalLink).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm",
    );
    expect(legalLink).toHaveAttribute("target", "_blank");
    expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(legalLink).toHaveTextContent("Lei nº 9.717/1998");
  });

  it("renderiza card de retenção patronal com fundamentação legal no Art. 40 da CF/88", () => {
    const mockItemPatronal: RadarCivicoCardItem = {
      anomaliaId: "anomalia-patronal",
      tipoAnomalia: "retencao_patronal_rpps",
      titulo: "Retenção de Contribuição Patronal (RPPS)",
      dimensaoReferencia: "contribuicao_patronal",
      grauSeveridade: "critico",
      metodologiaBadge: "Fluxo em Aberto",
      tipoMetodologia: "estoque",
      esperadoLabel: "Repasse Devido",
      textoFactual:
        "Em 2024, foram apurados R$ 50.0mil em contribuições patronais não repassadas.",
      desvioPercentual: 100,
      desvioPercentualFormatted: "+100%",
      valorObservadoFormatted: "R$ 50.0mil",
      valorEsperadoFormatted: "R$ 0",
      ctaLabel: "Verificar Repasse Patronal",
      ctaUrl: "/porciuncula/caprem?ano=2024#patronal",
      whatsappShareUrl: "https://api.whatsapp.com/send?text=Patronal",
      fundamentacaoLegal: {
        label: "Art. 40 da CF/88",
        url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
      },
    };

    render(<RadarAnomaliaCard item={mockItemPatronal} />);

    expect(
      screen.getByText("Retenção de Contribuição Patronal (RPPS)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fluxo em Aberto")).toBeInTheDocument();
    expect(screen.getByText("Repasse Devido")).toBeInTheDocument();
    expect(screen.getByText("R$ 50.0mil")).toBeInTheDocument();
    expect(screen.getByText("R$ 0")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();

    const legalLink = screen.getByTestId("radar-legal-link");
    expect(legalLink).toBeInTheDocument();
    expect(legalLink).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
    );
    expect(legalLink).toHaveAttribute("target", "_blank");
    expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(legalLink).toHaveTextContent("Art. 40 da CF/88");
  });

  it("dispara evento civic_radar_card_viewed no carregamento do card", () => {
    render(<RadarAnomaliaCard item={mockItemCritico} />);

    expect(posthog.capture).toHaveBeenCalledWith("civic_radar_card_viewed", {
      anomaliaId: "anomalia-1",
      tipoAnomalia: "explosao_comissionados",
      grauSeveridade: "critico",
      dimensaoReferencia: "comissionados",
      ctaUrl: "/porciuncula/pessoal?ano=2024#comissionados",
      source: "home_radar_civico",
    });
  });

  it("dispara eventos civic_radar_card_clicked e funnel_home_to_internal_page ao clicar no CTA", () => {
    render(<RadarAnomaliaCard item={mockItemCritico} />);

    const ctaLink = screen.getByTestId("radar-cta-link");
    fireEvent.click(ctaLink);

    expect(posthog.capture).toHaveBeenCalledWith("civic_radar_card_clicked", {
      anomaliaId: "anomalia-1",
      tipoAnomalia: "explosao_comissionados",
      grauSeveridade: "critico",
      dimensaoReferencia: "comissionados",
      ctaUrl: "/porciuncula/pessoal?ano=2024#comissionados",
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "funnel_home_to_internal_page",
      {
        from: "home_radar_civico",
        to: "/porciuncula/pessoal?ano=2024#comissionados",
        anomaliaId: "anomalia-1",
        tipoAnomalia: "explosao_comissionados",
      },
    );
  });

  it("respeita funnelSource customizado no funil ao clicar no CTA", () => {
    render(
      <RadarAnomaliaCard
        item={mockItemCritico}
        funnelSource="radar_historico"
      />,
    );

    const ctaLink = screen.getByTestId("radar-cta-link");
    fireEvent.click(ctaLink);

    expect(posthog.capture).toHaveBeenCalledWith(
      "funnel_home_to_internal_page",
      {
        from: "radar_historico",
        to: "/porciuncula/pessoal?ano=2024#comissionados",
        anomaliaId: "anomalia-1",
        tipoAnomalia: "explosao_comissionados",
      },
    );
  });

  it("dispara evento civic_radar_whatsapp_shared ao clicar no botão do WhatsApp", () => {
    render(<RadarAnomaliaCard item={mockItemCritico} />);

    const whatsappButton = screen.getByTestId("radar-whatsapp-button");
    fireEvent.click(whatsappButton);

    expect(posthog.capture).toHaveBeenCalledWith(
      "civic_radar_whatsapp_shared",
      {
        anomaliaId: "anomalia-1",
        tipoAnomalia: "explosao_comissionados",
        grauSeveridade: "critico",
      },
    );
  });
});
