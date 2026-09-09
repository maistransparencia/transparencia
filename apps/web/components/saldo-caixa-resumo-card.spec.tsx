import { render, screen } from "@testing-library/react";
import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaldoCaixaResumoCard } from "./saldo-caixa-resumo-card";

describe("SaldoCaixaResumoCard Component", () => {
  const samplePosicao: SiconfiPosicaoFinanceiraDTO = {
    portalSlug: "porciuncula",
    ano: 2024,
    mesMaisRecente: 12,
    dataHomologacao: "2024-12-31",
    totalCaixaGeral: 18500000.5,
    totalRecursosLivres: 4200000.25,
    totalRecursosVinculados: 14300000.25,
    totalCaixaPrevidencia: 0,
    totalRecursosPrevidencia: 0,
    hasSaldoDescoberto: false,
    variacaoAnualPercentual: 15.2,
    entidades: [
      {
        poderOrgao: "Executivo",
        entidadeNome: "Prefeitura Municipal",
        cnpj: "29.138.342/0001-30",
        empresaId: "1",
        grupoDestinacao: "recursos_ordinarios_e_vinculados",
        saldoCaixaBancos: 10000000,
        saldoRecursosLivres: 3000000,
        saldoRecursosVinculados: 7000000,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
        saldoDescobertoFlag: false,
      },
    ],
    previdencia: [],
  };

  it("renderiza título, posição oficial e selo STN / SICONFI", () => {
    render(
      <SaldoCaixaResumoCard
        posicaoFinanceira={samplePosicao}
        ano={2024}
        detailUrl="/porciuncula/orcamento#disponibilidade-caixa"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e bancos/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("SICONFI")).toBeInTheDocument();
    expect(screen.getByText(/posição:\s*dezembro\/2024/i)).toBeInTheDocument();
  });

  it("exibe o total consolidado e a proporção de recursos livres e vinculados com variação anual", () => {
    render(
      <SaldoCaixaResumoCard
        posicaoFinanceira={samplePosicao}
        ano={2024}
        detailUrl="/porciuncula/orcamento#disponibilidade-caixa"
      />,
    );

    expect(screen.getByText(/total em caixa municipal/i)).toBeInTheDocument();
    expect(screen.getByText(/livres \(ordinários\):/i)).toBeInTheDocument();
    expect(screen.getByText(/vinculados:/i)).toBeInTheDocument();
    expect(screen.getByText("+15.2% vs. 2023")).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "23");
  });

  it("renderiza link para a página de execução orçamentária", () => {
    render(
      <SaldoCaixaResumoCard
        posicaoFinanceira={samplePosicao}
        ano={2024}
        detailUrl="/porciuncula/orcamento#disponibilidade-caixa"
      />,
    );

    const link = screen.getByRole("link", {
      name: /ver detalhamento por entidade em execução orçamentária/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "/porciuncula/orcamento#disponibilidade-caixa",
    );
  });

  it("exibe callout explicativo quando hasEntityFilter for true", () => {
    render(
      <SaldoCaixaResumoCard
        posicaoFinanceira={samplePosicao}
        ano={2024}
        detailUrl="/porciuncula/orcamento#disponibilidade-caixa"
        hasEntityFilter={true}
      />,
    );

    expect(
      screen.getByText(
        /disponibilidade contábil exibida na visão consolidada municipal/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/total em caixa municipal/i),
    ).not.toBeInTheDocument();
  });

  it("renderiza fallback amigável quando não houver dados homologados", () => {
    render(
      <SaldoCaixaResumoCard
        posicaoFinanceira={null}
        ano={2025}
        detailUrl="/porciuncula/orcamento#disponibilidade-caixa"
      />,
    );

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o exercício/i,
      ),
    ).toBeInTheDocument();
  });
});
