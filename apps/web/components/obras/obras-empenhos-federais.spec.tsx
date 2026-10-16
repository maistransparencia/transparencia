import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ObraEmpenhoFederalViewModel } from "@/app/[portalSlug]/obras/view-model";
import { ObrasEmpenhosFederais } from "./obras-empenhos-federais";

const mockEmpenhos: ObraEmpenhoFederalViewModel[] = [
  {
    nrEmpenho: "2023NE003130",
    anoEmpenho: 2023,
    ugEmitente: "175004",
    valorEmpenho: 150000,
    valorEmpenhoFormatado: "R$ 150.000,00",
    dataEmissao: "2023-11-20",
    dataEmissaoFormatada: "20/11/2023",
    sistemaOrigem: "SIAFI",
    naturezaDespesa: "449051",
    fonte: "0100",
    programaTrabalho: null,
    planoInterno: null,
    acaoOrcamentaria: "10E4",
    descricao: "Construção de Unidade Básica de Saúde",
  },
  {
    nrEmpenho: "2024NE001091",
    anoEmpenho: 2024,
    ugEmitente: "175004",
    valorEmpenho: 100000,
    valorEmpenhoFormatado: "R$ 100.000,00",
    dataEmissao: "2024-03-15",
    dataEmissaoFormatada: "15/03/2024",
    sistemaOrigem: "SIAFI",
    naturezaDespesa: "449051",
    fonte: "0100",
    programaTrabalho: null,
    planoInterno: null,
    acaoOrcamentaria: "10E4",
    descricao: "Aditivo e complementação de recursos",
  },
];

describe("ObrasEmpenhosFederais Component", () => {
  it("renderiza a lista de empenhos federais e o resumo consolidado", () => {
    render(
      <ObrasEmpenhosFederais
        empenhos={mockEmpenhos}
        valorTotalFormatado="R$ 250.000,00"
      />,
    );

    expect(
      screen.getByText("Empenhos Federais (Transferegov.br / SIAFI)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 empenhos federais")).toBeInTheDocument();
    expect(screen.getByText("Total: R$ 250.000,00")).toBeInTheDocument();

    expect(screen.getByText("2023NE003130")).toBeInTheDocument();
    expect(screen.getByText("R$ 150.000,00")).toBeInTheDocument();
    expect(screen.getByText("Ano 2023")).toBeInTheDocument();
    expect(
      screen.getByText("Construção de Unidade Básica de Saúde"),
    ).toBeInTheDocument();

    expect(screen.getByText("2024NE001091")).toBeInTheDocument();
    expect(screen.getByText("R$ 100.000,00")).toBeInTheDocument();
    expect(screen.getByText("Ano 2024")).toBeInTheDocument();
  });

  it("renderiza empty state amigável quando a lista de empenhos for vazia ou undefined", () => {
    const { rerender } = render(<ObrasEmpenhosFederais empenhos={[]} />);

    expect(
      screen.getByTestId("obras-empenhos-federais-empty-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum empenho federal vinculado no ObrasGov.br"),
    ).toBeInTheDocument();

    rerender(<ObrasEmpenhosFederais empenhos={undefined} />);
    expect(
      screen.getByTestId("obras-empenhos-federais-empty-state"),
    ).toBeInTheDocument();
  });
});
