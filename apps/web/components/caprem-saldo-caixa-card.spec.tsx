import { render, screen } from "@testing-library/react";
import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { CapremSaldoCaixaCard } from "./caprem-saldo-caixa-card";

const samplePosicao: SiconfiPosicaoFinanceiraDTO = {
  portalSlug: "porciuncula_prefeitura",
  ano: 2024,
  mesMaisRecente: 12,
  dataHomologacao: "2024-12-31",
  totalCaixaGeral: 15000000,
  totalRecursosLivres: 5000000,
  totalRecursosVinculados: 10000000,
  totalCaixaPrevidencia: 8500000,
  totalRecursosPrevidencia: 8500000,
  hasSaldoDescoberto: false,
  entidades: [],
  previdencia: [
    {
      poderOrgao: "10132",
      entidadeNome: "CAPREM",
      cnpj: "33.444.555/0001-66",
      empresaId: "4",
      grupoDestinacao: "previdencia",
      saldoCaixaBancos: 8500000,
      saldoRecursosLivres: 0,
      saldoRecursosVinculados: 8500000,
      saldoCaixaAnoAnterior: 7500000,
      variacaoAnualPct: 13.3,
      saldoDescobertoFlag: false,
      mesReferencia: 12,
      dataReferencia: "2024-12-31",
    },
  ],
};

describe("CapremSaldoCaixaCard", () => {
  it("renderiza cabeçalho, selo de segregação constitucional e valores do RPPS", () => {
    render(
      <CapremSaldoCaixaCard
        posicaoFinanceira={samplePosicao}
        ano={2024}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e aplicações do rpps/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/segregado do caixa geral do município/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Total em Caixa e Aplicações")).toBeInTheDocument();
    expect(
      screen.getByText(/Recursos Vinculados \(RPPS\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 8.5mi")).toBeInTheDocument();
    expect(screen.getByText("+13.3% vs. 2023")).toBeInTheDocument();
    expect(screen.getByText("SICONFI")).toBeInTheDocument();
    expect(screen.getByText(/posição:\s*dezembro\/2024/i)).toBeInTheDocument();
  });

  it("renderiza variação percentual anual negativa corretamente", () => {
    const posicaoQueda: SiconfiPosicaoFinanceiraDTO = {
      ...samplePosicao,
      previdencia: [
        {
          ...samplePosicao.previdencia[0],
          variacaoAnualPct: -8.5,
        },
      ],
    };

    render(
      <CapremSaldoCaixaCard posicaoFinanceira={posicaoQueda} ano={2024} />,
    );
    expect(screen.getAllByText("-8.5% vs. 2023").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("renderiza alerta de saldo a descoberto quando saldoDescobertoFlag for verdadeiro", () => {
    const posicaoComDescoberto: SiconfiPosicaoFinanceiraDTO = {
      ...samplePosicao,
      previdencia: [
        {
          ...samplePosicao.previdencia[0],
          saldoDescobertoFlag: true,
        },
      ],
    };

    render(
      <CapremSaldoCaixaCard
        posicaoFinanceira={posicaoComDescoberto}
        ano={2024}
      />,
    );

    expect(
      screen.getByText(/Aviso de Insuficiência Financeira no RPPS/i),
    ).toBeInTheDocument();
  });

  it("renderiza fallback pedagógico quando posicaoFinanceira for nula ou não tiver previdência", () => {
    render(<CapremSaldoCaixaCard posicaoFinanceira={null} ano={2024} />);

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o fundo previdenciário no exercício 2024/i,
      ),
    ).toBeInTheDocument();
  });
});
