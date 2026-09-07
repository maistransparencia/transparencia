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
    totalCaixaGeral: 17000000.5,
    totalRecursosLivres: 3800000.25,
    totalRecursosVinculados: 13200000.25,
    totalCaixaPrevidencia: 1500000,
    totalRecursosPrevidencia: 1100000,
    hasSaldoDescoberto: false,
    variacaoAnualPct: 15.2,
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
        variacaoAnualPct: 10.5,
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
        saldoDescobertoFlag: false,
        variacaoAnualPct: -5.0,
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
        saldoDescobertoFlag: false,
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
        saldoDescobertoFlag: false,
      },
    ],
    previdencia: [
      {
        poderOrgao: "10132",
        entidadeNome: "CAPREM",
        cnpj: "33.444.555/0001-66",
        empresaId: "4",
        grupoDestinacao: "recursos_previdenciarios",
        saldoCaixaBancos: 1500000,
        saldoRecursosLivres: 400000,
        saldoRecursosVinculados: 1100000,
        mesReferencia: 12,
        dataReferencia: "2024-12-31",
        saldoDescobertoFlag: false,
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

    expect(screen.getByText(/fonte: stn \/ siconfi/i)).toBeInTheDocument();
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
    expect(screen.getByText("Câmara Municipal")).toBeInTheDocument();
    expect(screen.queryByText("CAPREM")).not.toBeInTheDocument();
  });

  it("exibe fallback amigável quando não houver dados homologados", () => {
    render(<SaldoCaixaEntidadesSection posicaoFinanceira={null} ano={2025} />);

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o exercício/i,
      ),
    ).toBeInTheDocument();
  });

  it("remove códigos brutos, badges e CNPJs dos cards individuais", () => {
    const posicaoComCodigoBruto: SiconfiPosicaoFinanceiraDTO = {
      ...samplePosicao,
      entidades: [
        {
          poderOrgao: "10131",
          entidadeNome: "Prefeitura Municipal",
          cnpj: "29.138.342/0001-30",
          empresaId: "1",
          grupoDestinacao: "livre",
          saldoCaixaBancos: 10000000,
          saldoRecursosLivres: 3000000,
          saldoRecursosVinculados: 7000000,
          saldoDescobertoFlag: false,
          mesReferencia: 12,
          dataReferencia: "2024-12-31",
        },
        {
          poderOrgao: "10131",
          entidadeNome: "Fundo Municipal de Saúde",
          cnpj: "11.222.333/0001-44",
          empresaId: "2",
          grupoDestinacao: "saude",
          saldoCaixaBancos: 5000000,
          saldoRecursosLivres: 500000,
          saldoRecursosVinculados: 4500000,
          saldoDescobertoFlag: false,
          mesReferencia: 12,
          dataReferencia: "2024-12-31",
        },
      ],
    };

    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={posicaoComCodigoBruto}
        ano={2024}
        portalSlug="porciuncula"
      />,
    );

    expect(screen.getByText("Prefeitura Municipal")).toBeInTheDocument();
    expect(screen.getByText("Fundo Municipal de Saúde")).toBeInTheDocument();
    expect(screen.queryByText("Administração Direta")).not.toBeInTheDocument();
    expect(screen.queryByText("Fundo Municipal")).not.toBeInTheDocument();
    expect(screen.queryByText("10131")).not.toBeInTheDocument();
    expect(screen.queryByText(/29\.138\.342/)).not.toBeInTheDocument();
  });

  it("renderiza o botão ShowYourWorkButton quando portalSlug é fornecido", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
        portalSlug="porciuncula"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /opções de auditoria/i,
      }),
    ).toBeInTheDocument();
  });

  it("exibe callout explicativo quando hasEntityFilter for true e oculta os cards detalhados", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
        hasEntityFilter={true}
      />,
    );

    expect(
      screen.getByText(
        /disponibilidade contábil exibida na visão consolidada municipal/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /desmarque os filtros de órgãos específicos e selecione/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Prefeitura Municipal")).not.toBeInTheDocument();
  });

  it("renderiza callout técnico de saldo a descoberto e badges quando hasSaldoDescoberto for true", () => {
    const posicaoComSaldoDescoberto: SiconfiPosicaoFinanceiraDTO = {
      ...samplePosicao,
      hasSaldoDescoberto: true,
      entidades: [
        {
          poderOrgao: "10131",
          entidadeNome: "Fundo Municipal de Educação",
          cnpj: "32.169.444/0001-41",
          empresaId: "6",
          grupoDestinacao: "educacao",
          saldoCaixaBancos: -1794864.11,
          saldoRecursosLivres: 0,
          saldoRecursosVinculados: -1794864.11,
          mesReferencia: 12,
          dataReferencia: "2024-12-31",
          saldoDescobertoFlag: true,
          variacaoAnualPct: -45.2,
        },
      ],
    };

    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={posicaoComSaldoDescoberto}
        ano={2024}
      />,
    );

    expect(
      screen.getByText(/atenção técnica: ocorrência de saldo a descoberto/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Saldo a Descoberto")).toBeInTheDocument();
    expect(
      screen.getByText(/insuficiência financeira na competência/i),
    ).toBeInTheDocument();
  });

  it("exibe indicativo de variação anual em relação ao ano anterior", () => {
    render(
      <SaldoCaixaEntidadesSection
        posicaoFinanceira={samplePosicao}
        ano={2024}
      />,
    );

    expect(screen.getByText("+15.2% vs. 2023")).toBeInTheDocument();
    expect(screen.getByText("+10.5% vs. 2023")).toBeInTheDocument();
    expect(screen.getByText("-5% vs. 2023")).toBeInTheDocument();
  });
});
