import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ObrasKpisViewModel } from "@/app/[portalSlug]/obras/view-model";
import { ObrasHeroSection } from "./obras-hero-section";

const kpis: ObrasKpisViewModel = {
  totalObras: 4,
  emExecucao: 2,
  paralisadas: 1,
  concluidas: 1,
  cadastradas: 0,
  canceladas: 0,
  valorTotalInvestimento: 1000,
  valorTotalInvestimentoFormatado: "R$ 1.000,00",
  valorTotalInvestimentoCompacto: "R$ 1 mil",
  valorEmExecucao: 500,
  valorEmExecucaoCompacto: "R$ 500",
  valorParalisadas: 300,
  valorParalisadasCompacto: "R$ 300",
  valorConcluidas: 200,
  valorConcluidasCompacto: "R$ 200",
  valorCadastradas: 0,
  valorCadastradasCompacto: "R$ 0",
  percentualMedioExecucaoFisica: 40,
  percentualMedioExecucaoFormatado: "40%",
  obrasSemMedicaoCount: 0,
};

const kpisSemObras: ObrasKpisViewModel = {
  ...kpis,
  totalObras: 0,
  emExecucao: 0,
  paralisadas: 0,
  concluidas: 0,
  valorTotalInvestimento: 0,
  valorTotalInvestimentoCompacto: "R$ 0",
  percentualMedioExecucaoFisica: null,
  percentualMedioExecucaoFormatado: "—",
};

describe("ObrasHeroSection", () => {
  it("faz a pergunta do cidadão e mostra a barra por situação em tokens", () => {
    render(
      <ObrasHeroSection
        ano={2031}
        isCurrentYear={false}
        partialPeriod=""
        kpis={kpis}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /obras da cidade estão andando/,
    );
    expect(screen.getByText(/EXERCÍCIO 2031/)).toBeInTheDocument();
    const barra = screen.getByRole("progressbar", {
      name: /Distribuição do investimento/,
    });
    expect(barra.innerHTML).toContain("bg-danger-fill");
    expect(barra.innerHTML).not.toMatch(/rounded|slate|rose|blue/);
    expect(screen.getByText("Investimento previsto")).toBeInTheDocument();
  });

  it("sem obras não mostra valor em R$ nem o painel de investimento", () => {
    render(
      <ObrasHeroSection
        ano={2017}
        isCurrentYear={false}
        partialPeriod=""
        kpis={kpisSemObras}
      />,
    );
    expect(screen.queryByText("Investimento previsto")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Nenhuma obra pública com movimentação registrada em 2017/,
      ),
    ).toBeInTheDocument();
  });

  it("indica parcial no exercício corrente", () => {
    render(
      <ObrasHeroSection
        ano={2027}
        isCurrentYear
        partialPeriod="jan a mar"
        kpis={kpis}
      />,
    );
    expect(screen.getByText(/PARCIAL, jan a mar/)).toBeInTheDocument();
  });
});
