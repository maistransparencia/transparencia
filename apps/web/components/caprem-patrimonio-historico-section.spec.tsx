import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CapremPatrimonioHistoricoResumo } from "@/app/[portalSlug]/caprem/view-model";
import { CapremPatrimonioHistoricoSection } from "./caprem-patrimonio-historico-section";

const mockResumo: CapremPatrimonioHistoricoResumo = {
  patrimonioPico: 60368778.97,
  anoPico: 2021,
  patrimonioAtual: 33383702.66,
  anoAtual: 2026,
  variacaoPicoAbs: -26985076.31,
  variacaoPicoPct: -44.7,
  queimaMediaAnual: 5397015.26,
  serie: [
    {
      ano: 2021,
      patrimonioFinanceiroTotal: 60368778.97,
      inconsistenciaDeclaracaoFlag: false,
      variacaoPatrimonioAbs: null,
      variacaoPatrimonioPct: null,
      quebraSerieFlag: false,
    },
    {
      ano: 2022,
      patrimonioFinanceiroTotal: 588266.38,
      inconsistenciaDeclaracaoFlag: true,
      variacaoPatrimonioAbs: -59780512.59,
      variacaoPatrimonioPct: -99.03,
      quebraSerieFlag: false,
    },
    {
      ano: 2023,
      patrimonioFinanceiroTotal: 36971987.89,
      inconsistenciaDeclaracaoFlag: false,
      variacaoPatrimonioAbs: null,
      variacaoPatrimonioPct: null,
      quebraSerieFlag: true,
    },
    {
      ano: 2024,
      patrimonioFinanceiroTotal: 39084273.78,
      inconsistenciaDeclaracaoFlag: false,
      variacaoPatrimonioAbs: 2112285.89,
      variacaoPatrimonioPct: 5.71,
      quebraSerieFlag: false,
    },
    {
      ano: 2025,
      patrimonioFinanceiroTotal: 35978565.75,
      inconsistenciaDeclaracaoFlag: false,
      variacaoPatrimonioAbs: -3105708.03,
      variacaoPatrimonioPct: -7.95,
      quebraSerieFlag: false,
    },
    {
      ano: 2026,
      patrimonioFinanceiroTotal: 33383702.66,
      inconsistenciaDeclaracaoFlag: false,
      variacaoPatrimonioAbs: -2594863.09,
      variacaoPatrimonioPct: -7.21,
      quebraSerieFlag: false,
    },
  ],
  diagnostico: {
    totalAporteExigido: 800000,
    totalAporteQuitado: 400000,
    romboAporteNaoRepassado: 400000,
    taxaAdimplenciaAporte: 50,
    hasDeficitAporte: true,
    totalEmpenhadoPatronal: 600000,
    totalLiquidadoPatronal: 600000,
    totalPagoPatronal: 450000,
    romboPatronalNaoRepassado: 150000,
    deficitMedioMensal: 12500,
    hasRetencaoPatronal: true,
    servidoresEfetivos: 100,
    servidoresTemporariosComissionados: 50,
    razaoTemporariosEfetivosPct: 50,
  },
};

describe("CapremPatrimonioHistoricoSection", () => {
  it("renderiza a seção com a âncora id='patrimonio' e título", () => {
    const { container } = render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    const section = container.querySelector("#patrimonio");
    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /evolução do patrimônio financeiro da previdência/i,
      }),
    ).toBeInTheDocument();
  });

  it("formata título para exercício único sem duplicar ano", () => {
    const singleYearResumo: CapremPatrimonioHistoricoResumo = {
      ...mockResumo,
      serie: [mockResumo.serie[5]], // Only 2026
    };

    render(
      <CapremPatrimonioHistoricoSection
        resumo={singleYearResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /evolução do patrimônio financeiro da previdência \(2026\)/i,
      }),
    ).toBeInTheDocument();
  });

  it("renderiza os 3 KPI cards de topo com valores e variações", () => {
    render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    // Card 1: Pico Histórico
    expect(screen.getAllByText("Pico Histórico").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("R$ 60.4mi")).toBeInTheDocument();
    expect(
      screen.getByText(/Em 2021 • Reserva máxima observada/i),
    ).toBeInTheDocument();

    // Card 2: Patrimônio Atual
    expect(screen.getByText("Patrimônio Atual")).toBeInTheDocument();
    expect(screen.getByText("R$ 33.4mi")).toBeInTheDocument();
    expect(screen.getByText("-44.70%")).toBeInTheDocument();

    // Card 3: Queima Média Anual
    expect(screen.getByText("Queima Média Anual")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.4mi/ano")).toBeInTheDocument();
  });

  it("exibe badge de transparência metodológica para inconsistência de declaração (2022)", () => {
    render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.getAllByText("Inconsistência de Declaração na MSC").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /Aplicações financeiras omitidas na remessa ao SICONFI/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("exibe N/D e badge de quebra de série metodológica para exercício subsequente (2023)", () => {
    render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    expect(screen.getAllByText("N/D").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Quebra de Série Metodológica").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renderiza os 3 cards de diagnóstico estrutural com hyperlinks legais oficiais do Planalto", () => {
    render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    // Card 1: Déficit Atuarial / Aporte
    expect(
      screen.getByRole("heading", { name: /1\. Déficit Atuarial e Aportes/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Déficit")).toBeInTheDocument();
    expect(screen.getByText("R$ 800.000,00")).toBeInTheDocument(); // Aporte Exigido
    expect(screen.getAllByText("R$ 400.000,00").length).toBe(2); // Aporte Quitado e Aporte Pendente

    const linkLei9717 = screen.getByRole("link", {
      name: /Lei nº 9\.717\/1998/i,
    });
    expect(linkLei9717).toBeInTheDocument();
    expect(linkLei9717).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm",
    );
    expect(linkLei9717).toHaveAttribute("target", "_blank");
    expect(linkLei9717).toHaveAttribute("rel", "noopener noreferrer");

    // Card 2: Cota Patronal em Atraso
    expect(
      screen.getByRole("heading", { name: /2\. Cota Patronal em Atraso/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Retenção")).toBeInTheDocument();
    expect(screen.getByText("R$ 600.000,00")).toBeInTheDocument(); // Patronal Liquidado
    expect(screen.getByText("R$ 450.000,00")).toBeInTheDocument(); // Patronal Quitado
    expect(screen.getByText("R$ 150.000,00")).toBeInTheDocument(); // Retenção Acumulada

    const linkArt40 = screen.getAllByRole("link", {
      name: /Art\. 40 da CF\/88/i,
    });
    expect(linkArt40.length).toBeGreaterThanOrEqual(1);
    expect(linkArt40[0]).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
    );
    expect(linkArt40[0]).toHaveAttribute("target", "_blank");
    expect(linkArt40[0]).toHaveAttribute("rel", "noopener noreferrer");

    // Card 3: Diluição da Base de Efetivos
    expect(
      screen.getByRole("heading", {
        name: /3\. Diluição da Base de Efetivos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("50.00%").length).toBeGreaterThanOrEqual(1); // Razão temporários/efetivos
  });

  it("renderiza badges de Adimplente quando não há déficit de aporte ou retenção patronal", () => {
    const adimplenteResumo: CapremPatrimonioHistoricoResumo = {
      ...mockResumo,
      diagnostico: {
        ...mockResumo.diagnostico,
        hasDeficitAporte: false,
        romboAporteNaoRepassado: 0,
        hasRetencaoPatronal: false,
        romboPatronalNaoRepassado: 0,
      },
    };

    render(
      <CapremPatrimonioHistoricoSection
        resumo={adimplenteResumo}
        selectedYear={2026}
      />,
    );

    const badges = screen.getAllByText("Adimplente");
    expect(badges.length).toBe(2);
  });

  it("renderiza banner informativo com link para o SICONFI", () => {
    render(
      <CapremPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    const siconfiLink = screen.getByRole("link", {
      name: /Acessar portal SICONFI \/ Secretaria do Tesouro Nacional/i,
    });
    expect(siconfiLink).toBeInTheDocument();
    expect(siconfiLink).toHaveAttribute(
      "href",
      "https://siconfi.tesouro.gov.br/",
    );
    expect(siconfiLink).toHaveAttribute("target", "_blank");
  });
});
