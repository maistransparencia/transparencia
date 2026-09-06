import { render, screen } from "@testing-library/react";
import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaldoCaixaEntidadesSection } from "./saldo-caixa-entidades-section";

describe("SaldoCaixaEntidadesSection Component", () => {
  const samplePosicao: SiconfiPosicaoFinanceiraDTO = {
    portalSlug: "porciuncula",
    ano: 2024,
    mesMaisRecente: 12,
    dataHomologacao: "2024-12-31",
    totalCaixaGeral: 18500000.5,
    totalRecursosLivres: 4200000.25,
    totalRecursosVinculados: 14300000.25,
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
      },
      {
        poderOrgao: "Executivo",
        entidadeNome: "Fundo Municipal de Saúde",
        cnpj: "11.222.333/0001-44",
        empresaId: "2",
        grupoDestinacao: "recursos_vinculados_saude",
        saldoCaixaBancos: 5000000,
        saldoRecursosLivres: 500000,
        saldoRecursosVinculados: 4500000,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
      },
      {
        poderOrgao: "Executivo",
        entidadeNome: "Fundo Municipal de Assistência Social",
        cnpj: "22.333.444/0001-55",
        empresaId: "3",
        grupoDestinacao: "recursos_vinculados_assistencia",
        saldoCaixaBancos: 1500000,
        saldoRecursosLivres: 200000,
        saldoRecursosVinculados: 1300000,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
      },
      {
        poderOrgao: "Executivo",
        entidadeNome: "CAPREM",
        cnpj: "33.444.555/0001-66",
        empresaId: "4",
        grupoDestinacao: "recursos_previdenciarios",
        saldoCaixaBancos: 1500000,
        saldoRecursosLivres: 400000,
        saldoRecursosVinculados: 1100000,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
      },
      {
        poderOrgao: "Legislativo",
        entidadeNome: "Câmara Municipal",
        cnpj: "44.555.666/0001-77",
        empresaId: "5",
        grupoDestinacao: "duodecimo",
        saldoCaixaBancos: 500000.5,
        saldoRecursosLivres: 100000.25,
        saldoRecursosVinculados: 400000.25,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
      },
    ],
  };

  it("renderiza título, subtítulo e badge oficial do SICONFI/STN", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade financeira em caixa e bancos/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /contas bancárias ativas e aplicações de liquidez imediata declaradas mensalmente ao tesouro nacional/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/stn \/ siconfi \(matriz de saldos contábeis - msc\)/i),
    ).toBeInTheDocument();
  });

  it("exibe a competência contábil homologada mais recente", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
      />,
    );

    expect(
      screen.getByText(/posição oficial em dezembro\/2024/i),
    ).toBeInTheDocument();
  });

  it("exibe o callout didático prevenindo equívocos de desinformação", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
      />,
    );

    expect(
      screen.getByText(/saldo em caixa não é dinheiro "sobrando"/i),
    ).toBeInTheDocument();
  });

  it("renderiza cards individuais para todas as entidades autônomas", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
      />,
    );

    expect(screen.getByText("Prefeitura Municipal")).toBeInTheDocument();
    expect(screen.getByText("Fundo Municipal de Saúde")).toBeInTheDocument();
    expect(
      screen.getByText("Fundo Municipal de Assistência Social"),
    ).toBeInTheDocument();
    expect(screen.getByText("CAPREM")).toBeInTheDocument();
    expect(screen.getByText("Câmara Municipal")).toBeInTheDocument();
  });

  it("exibe fallback amigável quando não houver dados homologados", () => {
    render(<SaldoCaixaEntidadesSection posicaoFinanceira={null} ano={2025} />);

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o exercício/i,
      ),
    ).toBeInTheDocument();
  });
});
