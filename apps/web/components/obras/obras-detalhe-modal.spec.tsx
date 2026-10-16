import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ObraItemViewModel } from "@/app/[portalSlug]/obras/view-model";
import { ObrasDetalheModal } from "./obras-detalhe-modal";

const mockObraExecucao: ObraItemViewModel = {
  idProjeto: "OBR-001",
  portalSlug: "porciuncula_prefeitura",
  nomeObra: "Construção de UBS Central",
  situacao: "em_execucao",
  situacaoLabel: "Em Execução",
  situacaoColorHex: "#2563eb",
  situacaoBadgeClasses: "bg-blue-50 text-blue-700 border-blue-200",
  orgaoResponsavel: "Secretaria de Obras",
  valorInvestimentoPrevisto: 1200000,
  valorInvestimentoFormatado: "R$ 1.200.000,00",
  percentualExecucaoFisica: 55,
  percentualExecucaoFormatado: "55,00%",
  dataUltimaMedicao: "2024-03-10",
  dataUltimaMedicaoFormatada: "10/03/2024",
  latitude: -20.96,
  longitude: -42.04,
  hasCoordinates: true,
  isUrbana: true,
  motivoParalisacao: null,
  mesesParalisada: null,
  dataInicioPrevista: "2024-01-01",
  dataInicioPrevistaFormatada: "01/01/2024",
  dataFimPrevista: "2024-12-31",
  dataFimPrevistaFormatada: "31/12/2024",
};

const mockObraParalisada: ObraItemViewModel = {
  ...mockObraExecucao,
  idProjeto: "OBR-002",
  nomeObra: "Reforma de Creche",
  situacao: "paralisada",
  situacaoLabel: "Paralisada",
  situacaoColorHex: "#dc2626",
  situacaoBadgeClasses: "bg-rose-50 text-rose-700 border-rose-200",
  motivoParalisacao: "Rescisão unilateral de contrato por abandono da empresa",
};

describe("ObrasDetalheModal Component", () => {
  it("renderiza os detalhes da obra no modal quando aberto", () => {
    const handleClose = vi.fn();
    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={handleClose}
        obra={mockObraExecucao}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(screen.getByText("Construção de UBS Central")).toBeInTheDocument();
    expect(screen.getByText("Secretaria de Obras")).toBeInTheDocument();
    expect(screen.getByText("Em Execução")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200.000,00")).toBeInTheDocument();
    expect(screen.getByText("55.00%")).toBeInTheDocument();
  });

  it("exibe alerta destacado de obra paralisada com justificativa oficial e base legal", () => {
    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraParalisada}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(screen.getByTestId("modal-alerta-paralisada")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Rescisão unilateral de contrato por abandono da empresa/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Art\. 115, § 6º da Lei nº 14\.133\/2021/i,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art115p6",
    );
  });

  it("chama onClose ao clicar no botão fechar", () => {
    const handleClose = vi.fn();
    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={handleClose}
        obra={mockObraExecucao}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const closeButtons = screen.getAllByRole("button", { name: /Fechar/i });
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it("não renderiza quando isOpen é false", () => {
    render(
      <ObrasDetalheModal
        isOpen={false}
        onClose={vi.fn()}
        obra={mockObraExecucao}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.queryByText("Construção de UBS Central"),
    ).not.toBeInTheDocument();
  });

  it("exibe mensagem neutra quando a obra não possui contratos municipais correlacionados", () => {
    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraExecucao}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByText("Nenhum contrato municipal diretamente correlacionado"),
    ).toBeInTheDocument();
  });

  it("exibe seção de contratos vinculados com fornecedor mascarado e deep links quando houver contratos", () => {
    const mockObraComContratos: ObraItemViewModel = {
      ...mockObraExecucao,
      idProjeto: "OBR-003",
      contratos: [
        {
          contratoId: "ctr-88",
          contratoNumero: "088/2024",
          fornecedorNome: "CONSTRUTORA CENTRAL",
          fornecedorCpfCnpj: "12345678000190",
          fornecedorCpfCnpjMascarado: "12.***.***/0001-90",
          valorContrato: 900000,
          valorContratoFormatado: "R$ 900.000,00",
          modalidade: "concorrencia_eletronica",
          modalidadeLabel: "Concorrência Eletrônica",
          licitacaoNumero: "LIC-050/2024",
          status: "vigente",
          statusLabel: "Vigente",
          statusBadgeClasses:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
          dataInicio: "2024-01-01",
          dataInicioFormatada: "01/01/2024",
          vencimentoAtual: "2025-01-01",
          vencimentoAtualFormatado: "01/01/2025",
          linkContrato: "/porciuncula_prefeitura/contratos?numero=088%2F2024",
          linkLicitacao:
            "/porciuncula_prefeitura/licitacoes?numero=LIC-050%2F2024",
        },
      ],
    };

    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraComContratos}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByText("Contratos e Licitações Vinculados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Contrato nº 088/2024")).toBeInTheDocument();
    expect(screen.getByText("CONSTRUTORA CENTRAL")).toBeInTheDocument();
    expect(
      screen.getByText("Documento: 12.***.***/0001-90"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 900.000,00")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver detalhes do contrato/i }),
    ).toHaveAttribute(
      "href",
      "/porciuncula_prefeitura/contratos?numero=088%2F2024",
    );
  });

  it("renderiza campos enriquecidos do ObrasGov (função social, intervenção, executor e repassador)", () => {
    const mockObraEnriquecida: ObraItemViewModel = {
      ...mockObraExecucao,
      naturezaIntervencao: "AMPLIACAO",
      especieIntervencao: "OBRA",
      descricaoIntervencao:
        "AMPLIAÇÃO DE UNIDADE DE ATENÇÃO ESPECIALIZADA EM SAÚDE",
      funcaoSocial:
        "Toda a população municipal de 17.288 habitantes atendida com centro cirúrgico.",
      executorNome: "FUNDO MUNICIPAL DE SAUDE - FMS",
      executorCnpj: "12097798000110",
      executorCnpjMascarado: "12.***.***/0001-10",
      repassadorNome: "MINISTÉRIO DA SAÚDE",
      repassadorCnpj: "00394544012787",
      repassadorCnpjMascarado: "00.***.***/0127-87",
    };

    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraEnriquecida}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(screen.getByText("AMPLIACAO")).toBeInTheDocument();
    expect(screen.getByText("OBRA")).toBeInTheDocument();
    expect(screen.getByText("Objeto da Intervenção")).toBeInTheDocument();
    expect(
      screen.getByText(
        "AMPLIAÇÃO DE UNIDADE DE ATENÇÃO ESPECIALIZADA EM SAÚDE",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Função Social e Impacto Comunitário"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Toda a população municipal de 17.288 habitantes atendida/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Órgão / Ente Executor")).toBeInTheDocument();
    expect(
      screen.getByText("FUNDO MUNICIPAL DE SAUDE - FMS"),
    ).toBeInTheDocument();
    expect(screen.getByText("CNPJ: 12.***.***/0001-10")).toBeInTheDocument();
    expect(screen.getByText("Repassador de Recursos")).toBeInTheDocument();
    expect(screen.getByText("MINISTÉRIO DA SAÚDE")).toBeInTheDocument();
    expect(screen.getByText("CNPJ: 00.***.***/0127-87")).toBeInTheDocument();
  });

  it("chama onClose ao clicar em link de contrato vinculado", () => {
    const handleClose = vi.fn();
    const mockObraComContrato: ObraItemViewModel = {
      ...mockObraExecucao,
      contratos: [
        {
          contratoId: "CTR-123",
          contratoNumero: "045/2024",
          ano: 2024,
          fornecedorNome: "CONSTRUTORA EXEMPLO LTDA",
          fornecedorCpfCnpj: "12345678000199",
          fornecedorCpfCnpjMascarado: "12.***.***/0001-99",
          dataInicio: "2024-01-10",
          dataInicioFormatada: "10/01/2024",
          vencimentoAtual: "2025-01-10",
          vencimentoAtualFormatado: "10/01/2025",
          valorContrato: 500000,
          valorContratoFormatado: "R$ 500.000,00",
          modalidade: "concorrencia_eletronica",
          modalidadeLabel: "Concorrência Eletrônica",
          status: "vigente",
          statusLabel: "Vigente",
          statusBadgeClasses:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
          licitacaoNumero: null,
          licitacaoAno: null,
          linkContrato: "/porciuncula_prefeitura/contratos?numero=045%2F2024",
          linkLicitacao: null,
        },
      ],
    };

    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={handleClose}
        obra={mockObraComContrato}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const contractLink = screen.getByRole("link", {
      name: /Ver detalhes do contrato nº 045\/2024/i,
    });
    fireEvent.click(contractLink);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renderiza a seção de empenhos federais quando a obra possui repasses federais vinculados", () => {
    const mockObraComEmpenhos: ObraItemViewModel = {
      ...mockObraExecucao,
      valorTotalEmpenhadoFederal: 250000,
      valorTotalEmpenhadoFederalFormatado: "R$ 250.000,00",
      quantidadeEmpenhosFederais: 1,
      empenhosFederais: [
        {
          nrEmpenho: "2023NE003130",
          anoEmpenho: 2023,
          ugEmitente: "175004",
          valorEmpenho: 250000,
          valorEmpenhoFormatado: "R$ 250.000,00",
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
      ],
    };

    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraComEmpenhos}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByText("Empenhos Federais (Transferegov.br / SIAFI)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2023NE003130")).toBeInTheDocument();
    expect(screen.getByText("Total: R$ 250.000,00")).toBeInTheDocument();
    expect(screen.getByText("Ano 2023")).toBeInTheDocument();
    expect(screen.getByText("SIAFI")).toBeInTheDocument();
    expect(
      screen.getByText("Construção de Unidade Básica de Saúde"),
    ).toBeInTheDocument();
  });

  it("renderiza estado vazio de empenhos federais quando a obra não possui repasses vinculados", () => {
    render(
      <ObrasDetalheModal
        isOpen={true}
        onClose={vi.fn()}
        obra={mockObraExecucao}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByTestId("obras-empenhos-federais-empty-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum empenho federal vinculado no ObrasGov.br"),
    ).toBeInTheDocument();
  });
});
