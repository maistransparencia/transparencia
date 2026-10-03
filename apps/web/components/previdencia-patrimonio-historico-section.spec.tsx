import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PrevidenciaPatrimonioHistoricoResumo } from "@/app/[portalSlug]/previdencia/view-model";
import { PrevidenciaPatrimonioHistoricoSection } from "./previdencia-patrimonio-historico-section";

const mockResumo: PrevidenciaPatrimonioHistoricoResumo = {
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
      anoInconsistenciaAnterior: 2022,
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
    servidoresEfetivos: 420,
    servidoresTemporariosComissionados: 180,
    razaoTemporariosEfetivosPct: 42.86,
  },
};

describe("PrevidenciaPatrimonioHistoricoSection", () => {
  it("renderiza o cabeçalho e os 3 KPI cards de pico, patrimônio atual e queima média", () => {
    render(
      <PrevidenciaPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.getByText(
        "Evolução do Patrimônio Financeiro da Previdência (2021–2026)",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pico Histórico").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Patrimônio Atual")).toBeInTheDocument();
    expect(screen.getByText("Queima Média Anual")).toBeInTheDocument();
  });

  it("renderiza os 3 cards do diagnóstico de causas estruturais com links para legislação oficial", () => {
    render(
      <PrevidenciaPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Diagnóstico de Sustentabilidade e Riscos Estruturais do RPPS",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1. Déficit Atuarial e Aportes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2. Cota Patronal em Atraso" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "3. Diluição da Base de Efetivos" }),
    ).toBeInTheDocument();

    const lei9717Link = screen.getByRole("link", {
      name: /Lei nº 9\.717\/1998/i,
    });
    expect(lei9717Link).toBeInTheDocument();
    expect(lei9717Link).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm",
    );

    const art40Links = screen.getAllByRole("link", {
      name: /Art\. 40 da CF\/88/i,
    });
    expect(art40Links.length).toBeGreaterThanOrEqual(1);
    expect(art40Links[0]).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
    );
  });

  it("renderiza o banner de transparência metodológica com anos dinâmicos quando há inconsistência", () => {
    render(
      <PrevidenciaPatrimonioHistoricoSection
        resumo={mockResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.getByText(
        "Transparência Metodológica e Integridade da Matriz de Saldos Contábeis (SICONFI / STN)",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /No exercício de 2022, a remessa da MSC omitiu a carteira de investimentos do fundo.*quebra de série metodológica em 2023/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Série normalizada após omissão contábil de 2022")
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("não renderiza o banner de transparência metodológica quando a série é íntegra", () => {
    const cleanResumo: PrevidenciaPatrimonioHistoricoResumo = {
      ...mockResumo,
      serie: mockResumo.serie.map((p) => ({
        ...p,
        inconsistenciaDeclaracaoFlag: false,
        quebraSerieFlag: false,
        anoInconsistenciaAnterior: null,
      })),
    };

    render(
      <PrevidenciaPatrimonioHistoricoSection
        resumo={cleanResumo}
        selectedYear={2026}
      />,
    );

    expect(
      screen.queryByText(
        "Transparência Metodológica e Integridade da Matriz de Saldos Contábeis (SICONFI / STN)",
      ),
    ).not.toBeInTheDocument();
  });
});
