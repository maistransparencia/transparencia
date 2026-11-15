import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaldoCaixaEvolucaoMensalChart } from "./saldo-caixa-evolucao-mensal-chart";

const pontos = [
  {
    mesReferencia: 1,
    mesNome: "Janeiro",
    mesAbreviado: "Jan",
    saldoCaixaBancos: 3000,
    saldoRecursosLivres: 1000,
    saldoRecursosVinculados: 2000,
  },
  {
    mesReferencia: 2,
    mesNome: "Fevereiro",
    mesAbreviado: "Fev",
    saldoCaixaBancos: 4000,
    saldoRecursosLivres: 1500,
    saldoRecursosVinculados: 2500,
  },
];

describe("SaldoCaixaEvolucaoMensalChart", () => {
  it("oferece uma tabela só para leitor de tela com os valores de cada mês", () => {
    render(<SaldoCaixaEvolucaoMensalChart pontos={pontos} ano={2026} />);

    const tabela = screen.getByRole("table", {
      name: "Saldo em caixa mês a mês",
    });
    expect(tabela).toHaveClass("sr-only");
    const linhas = within(tabela).getAllByRole("row");
    expect(linhas).toHaveLength(3);
    expect(within(tabela).getByText("Janeiro")).toBeInTheDocument();
    expect(within(tabela).getByText("Fevereiro")).toBeInTheDocument();
  });

  it("esconde a parte visual do gráfico dos leitores de tela", () => {
    const { container } = render(
      <SaldoCaixaEvolucaoMensalChart pontos={pontos} ano={2026} />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("não renderiza nada sem pontos", () => {
    const { container } = render(
      <SaldoCaixaEvolucaoMensalChart pontos={[]} ano={2026} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
