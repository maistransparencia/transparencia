import { fireEvent, render, screen } from "@testing-library/react";
import type { ServidorDivergenciaCadastralDTO } from "@transparencia/db";
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
        ano={2026}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /Quadro e Folha por Regime Jurídico/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Consolidado Municipal").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/700 profissionais/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.0mi/i)).toBeInTheDocument();
  });

  it("renderiza nota de auditoria cívica data-driven quando totalDivergencias > 0", () => {
    render(
      <PessoalRegimeSection
        data={mockData}
        ano={2026}
        portalSlug="porciuncula_prefeitura"
        totalDivergencias={187}
      />,
    );

    expect(
      screen.getByText(/Harmonização de Vínculos Cadastrais/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/187 profissionais cadastrados/i),
    ).toBeInTheDocument();

    const linkLei = screen.getByRole("link", {
      name: /Art\. 37 da Constituição Federal/i,
    });
    expect(linkLei).toBeInTheDocument();
    expect(linkLei).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37",
    );
    expect(linkLei).toHaveAttribute("target", "_blank");
    expect(linkLei).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renderiza no singular quando totalDivergencias é 1", () => {
    render(
      <PessoalRegimeSection
        data={mockData}
        ano={2022}
        portalSlug="porciuncula_prefeitura"
        totalDivergencias={1}
      />,
    );

    expect(
      screen.getByText(/Harmonização de Vínculos Cadastrais/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 profissional cadastrado/i)).toBeInTheDocument();
  });

  it("não exibe a nota de auditoria cívica quando totalDivergencias é 0 ou ausente", () => {
    const { rerender } = render(
      <PessoalRegimeSection
        data={mockData}
        ano={2025}
        portalSlug="porciuncula_prefeitura"
        totalDivergencias={0}
      />,
    );

    expect(
      screen.queryByText(
        /Auditoria Cívica: Harmonização de Vínculos Cadastrais/i,
      ),
    ).not.toBeInTheDocument();

    rerender(
      <PessoalRegimeSection
        data={mockData}
        ano={2025}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.queryByText(
        /Auditoria Cívica: Harmonização de Vínculos Cadastrais/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("renderiza cards individuais para cada categoria com métricas", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    expect(
      screen.getByRole("heading", { name: "Concursados (Efetivos)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cargos em Comissão" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contratos Temporários" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText(/71[.,]43%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/14[.,]29%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/14[.,]28%/).length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/62[.,]50%.*da despesa/)).toBeInTheDocument();
    expect(screen.getByText(/25[.,]00%.*da despesa/)).toBeInTheDocument();
    expect(screen.getByText(/12[.,]50%.*da despesa/)).toBeInTheDocument();
  });

  it("renderiza barra de progresso proporcional com tooltips em cada segmento", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips).toHaveLength(3);
    expect(screen.getByText("500 servidores")).toBeInTheDocument();
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
      screen.getAllByRole("button", {
        name: /opções de auditoria/i,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("não renderiza ShowYourWorkButton quando portalSlug não é fornecido", () => {
    render(<PessoalRegimeSection data={mockData} ano={2025} />);

    expect(
      screen.queryByRole("button", {
        name: /opções de auditoria/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renderiza badges de variação YoY ao lado de profissionais e volume em folha", () => {
    const dataComVariacao: PessoalRegimeItem[] = [
      {
        categoriaRegime: "efetivo_concurso",
        categoriaRegimeRotulo: "Concursados (Efetivos)",
        totalProfissionais: 520,
        totalProventos: 2_600_000,
        proventoMedio: 5_000,
        percentualProfissionais: 100,
        percentualFolha: 100,
        variacaoProfissionais: 4.0,
        variacaoFolha: 8.5,
      },
    ];

    render(<PessoalRegimeSection data={dataComVariacao} ano={2025} />);

    expect(screen.getByText("+4% vs 2024")).toBeInTheDocument();
    expect(screen.getByText("+8.5% vs 2024")).toBeInTheDocument();
  });

  it("renderiza botão de auditoria e abre modal com tabela de servidores divergentes", () => {
    const mockServidoresDivergentes: ServidorDivergenciaCadastralDTO[] = [
      {
        matricula: "12345",
        cargo: "Assessor Técnico",
        orgaoNome: "Gabinete do Prefeito",
        categoriaRegime: "comissionado",
        categoriaFuncional: "Comissionado",
        vinculo: "Estatutário",
        formaProvimento: "Nomeação em Comissão",
        proventos: 4500,
      },
    ];

    render(
      <PessoalRegimeSection
        data={mockData}
        ano={2026}
        portalSlug="porciuncula_prefeitura"
        totalDivergencias={1}
        servidoresDivergentes={mockServidoresDivergentes}
      />,
    );

    const btn = screen.getByRole("button", {
      name: /ver lista de profissionais auditados/i,
    });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Profissionais com Divergência Cadastral Auditada — 2026",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("12345").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Assessor Técnico").length,
    ).toBeGreaterThanOrEqual(1);
  });
});
