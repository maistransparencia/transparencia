import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ObraContratoViewModel } from "@/app/[portalSlug]/obras/view-model";
import { ObrasContratosVinculados } from "./obras-contratos-vinculados";

const mockContratos: ObraContratoViewModel[] = [
  {
    contratoId: "ctr-1",
    contratoNumero: "001/2024",
    fornecedorNome: "CONSTRUTORA ALIANCA LTDA",
    fornecedorCpfCnpj: "12345678000190",
    fornecedorCpfCnpjMascarado: "12.***.***/0001-90",
    valorContrato: 1500000,
    valorContratoFormatado: "R$ 1.500.000,00",
    modalidade: "concorrencia_eletronica",
    modalidadeLabel: "Concorrência Eletrônica",
    licitacaoNumero: "LIC-010/2024",
    status: "vigente",
    statusLabel: "Vigente",
    statusBadgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dataInicio: "2024-01-15",
    dataInicioFormatada: "15/01/2024",
    vencimentoAtual: "2025-01-15",
    vencimentoAtualFormatado: "15/01/2025",
    linkContrato: "/porciuncula_prefeitura/contratos?numero=001%2F2024",
    linkLicitacao: "/porciuncula_prefeitura/licitacoes?numero=LIC-010%2F2024",
  },
  {
    contratoId: "ctr-2",
    contratoNumero: "002/2023",
    fornecedorNome: "SERVICOS DE ENGENHARIA ME",
    fornecedorCpfCnpj: "98765432000111",
    fornecedorCpfCnpjMascarado: "98.***.***/0001-11",
    valorContrato: 280000,
    valorContratoFormatado: "R$ 280.000,00",
    modalidade: "dispensa",
    modalidadeLabel: "Dispensa de Licitação",
    licitacaoNumero: null,
    status: "encerrado",
    statusLabel: "Encerrado",
    statusBadgeClasses: "bg-slate-50 text-slate-700 border-slate-200",
    dataInicio: "2023-03-01",
    dataInicioFormatada: "01/03/2023",
    vencimentoAtual: "2023-12-31",
    vencimentoAtualFormatado: "31/12/2023",
    linkContrato: "/porciuncula_prefeitura/contratos?numero=002%2F2023",
    linkLicitacao: null,
  },
];

describe("ObrasContratosVinculados Component", () => {
  it("renderiza o empty state neutro quando não houver contratos correlacionados", () => {
    render(
      <ObrasContratosVinculados
        contratos={[]}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByTestId("obras-contratos-empty-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum contrato municipal diretamente correlacionado"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Esta obra pode ser proveniente de execução direta/),
    ).toBeInTheDocument();
  });

  it("renderiza a lista de contratos correlacionados com dados completos e badges de status", () => {
    render(
      <ObrasContratosVinculados
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(screen.getByTestId("obras-contratos-list")).toBeInTheDocument();
    expect(screen.getByText("Contrato nº 001/2024")).toBeInTheDocument();
    expect(screen.getByText("CONSTRUTORA ALIANCA LTDA")).toBeInTheDocument();
    expect(
      screen.getByText("Documento: 12.***.***/0001-90"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 1.500.000,00")).toBeInTheDocument();
    expect(screen.getByText("Concorrência Eletrônica")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();

    expect(screen.getByText("Contrato nº 002/2023")).toBeInTheDocument();
    expect(screen.getByText("SERVICOS DE ENGENHARIA ME")).toBeInTheDocument();
    expect(
      screen.getByText("Documento: 98.***.***/0001-11"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 280.000,00")).toBeInTheDocument();
    expect(screen.getByText("Dispensa de Licitação")).toBeInTheDocument();
    expect(screen.getByText("Encerrado")).toBeInTheDocument();
  });

  it("fornece links corretos para o contrato e licitação vinculada", () => {
    render(
      <ObrasContratosVinculados
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const contractLinks = screen.getAllByRole("link", {
      name: /Ver detalhes do contrato/i,
    });
    expect(contractLinks).toHaveLength(2);
    expect(contractLinks[0]).toHaveAttribute(
      "href",
      "/porciuncula_prefeitura/contratos?numero=001%2F2024",
    );
    expect(contractLinks[1]).toHaveAttribute(
      "href",
      "/porciuncula_prefeitura/contratos?numero=002%2F2023",
    );

    // Contrato 1 possui licitação vinculada com aria-label contextual
    const licitacaoLink = screen.getByRole("link", {
      name: /Ver licitação LIC-010\/2024 vinculada ao contrato nº 001\/2024/i,
    });
    expect(licitacaoLink).toHaveAttribute(
      "href",
      "/porciuncula_prefeitura/licitacoes?numero=LIC-010%2F2024",
    );

    // Datas de vigência devem ser exibidas
    expect(
      screen.getByText(/Vigência: 15\/01\/2024 até 15\/01\/2025/i),
    ).toBeInTheDocument();
  });
});
