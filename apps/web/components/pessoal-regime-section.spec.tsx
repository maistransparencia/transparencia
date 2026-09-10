import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type PessoalRegimeItem,
  PessoalRegimeSection,
} from "./pessoal-regime-section";

describe("PessoalRegimeSection Component", () => {
  const mockData: PessoalRegimeItem[] = [
    {
      categoriaRegime: "efetivo_concurso",
      categoriaRegimeRotulo: "Concursados (Efetivos)",
      totalProfissionais: 500,
      totalProventos: 2_500_000,
      proventoMedio: 5_000,
      percentualProfissionais: 71.43,
      percentualFolha: 62.5,
    },
    {
      categoriaRegime: "comissionado",
      categoriaRegimeRotulo: "Cargos em Comissão",
      totalProfissionais: 100,
      totalProventos: 1_000_000,
      proventoMedio: 10_000,
      percentualProfissionais: 14.29,
      percentualFolha: 25.0,
    },
    {
      categoriaRegime: "contrato_temporario",
      categoriaRegimeRotulo: "Contratos Temporários",
      totalProfissionais: 100,
      totalProventos: 500_000,
      proventoMedio: 5_000,
      percentualProfissionais: 14.28,
      percentualFolha: 12.5,
    },
  ];

  it("renderiza mensagem amigável quando dados estão vazios", () => {
    render(<PessoalRegimeSection data={[]} ano={2025} />);
    expect(
      screen.getByText(/Sem dados de regime funcional disponíveis/i),
    ).toBeInTheDocument();
  });

  it("renderiza cabeçalho, contagem total e volume financeiro", () => {
    render(
      <PessoalRegimeSection
        data={mockData}
        ano={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /Quadro e Folha por Regime Jurídico/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/700 profissionais/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.0mi/i)).toBeInTheDocument();
  });

  it("renderiza cards individuais para cada categoria com métricas", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    expect(screen.getByText("Concursados (Efetivos)")).toBeInTheDocument();
    expect(screen.getByText("Cargos em Comissão")).toBeInTheDocument();
    expect(screen.getByText("Contratos Temporários")).toBeInTheDocument();

    expect(screen.getByText(/71[.,]43%/)).toBeInTheDocument();
    expect(screen.getByText(/14[.,]29%/)).toBeInTheDocument();
    expect(screen.getByText(/14[.,]28%/)).toBeInTheDocument();

    expect(screen.getByText(/62[.,]50%.*da despesa/)).toBeInTheDocument();
    expect(screen.getByText(/25[.,]00%.*da despesa/)).toBeInTheDocument();
    expect(screen.getByText(/12[.,]50%.*da despesa/)).toBeInTheDocument();
  });

  it("renderiza barra de progresso proporcional", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("renderiza botão ShowYourWorkButton quando portalSlug é fornecido", () => {
    render(
      <PessoalRegimeSection
        data={mockData}
        ano={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /opções de auditoria/i,
      }),
    ).toBeInTheDocument();
  });

  it("não renderiza ShowYourWorkButton quando portalSlug não é fornecido", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    expect(
      screen.queryByRole("button", {
        name: /opções de auditoria/i,
      }),
    ).not.toBeInTheDocument();
  });
});
