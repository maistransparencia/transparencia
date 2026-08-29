import { render, screen } from "@testing-library/react";
import type { OpacidadeContabilMetricsDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { TermometroOpacidadeFiscal } from "./termometro-opacidade-fiscal";

describe("TermometroOpacidadeFiscal Component", () => {
  const sampleData: OpacidadeContabilMetricsDTO = {
    portalSlug: "porciuncula_prefeitura",
    ano: 2026,
    exercicioAtual: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2026,
      totalEmpenhos: 500,
      empenhosResidual99: 280,
      empenhosDesvioSensivel99: 120,
      taxaEmpenhosOpacidadePct: 56.0,
      totalPago: 10000000,
      pagoResidual99: 5640000,
      pagoDesvioSensivel99: 3200000,
      taxaValorOpacidadePct: 56.4,
      taxaDesvioSensivelPct: 56.74,
      classificacaoRisco: "critico",
    },
    historico: [
      {
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        totalEmpenhos: 400,
        empenhosResidual99: 100,
        empenhosDesvioSensivel99: 30,
        taxaEmpenhosOpacidadePct: 25.0,
        totalPago: 8000000,
        pagoResidual99: 2000000,
        pagoDesvioSensivel99: 600000,
        taxaValorOpacidadePct: 25.0,
        taxaDesvioSensivelPct: 30.0,
        classificacaoRisco: "atencao",
      },
      {
        portalSlug: "porciuncula_prefeitura",
        ano: 2026,
        totalEmpenhos: 500,
        empenhosResidual99: 280,
        empenhosDesvioSensivel99: 120,
        taxaEmpenhosOpacidadePct: 56.0,
        totalPago: 10000000,
        pagoResidual99: 5640000,
        pagoDesvioSensivel99: 3200000,
        taxaValorOpacidadePct: 56.4,
        taxaDesvioSensivelPct: 56.74,
        classificacaoRisco: "critico",
      },
    ],
    topCredores: [
      {
        credorCodigo: "11.111.111/0001-11",
        credorNome: "CODESP CONSORCIO DE SAUDE",
        totalEmpenhos: 45,
        totalPago: 31920000,
        pagoDesvioSensivel: 31920000,
        categoriaPredominante: "locacao_maquinas_veiculos",
        amostraObjeto: "RATEIO DE DESPESAS DE SAUDE",
        ranking: 1,
      },
      {
        credorCodigo: "22.222.222/0001-22",
        credorNome: "COOPERATIVA DE CATADORES",
        totalEmpenhos: 20,
        totalPago: 14180000,
        pagoDesvioSensivel: 0,
        categoriaPredominante: "sem_classificacao_especifica",
        amostraObjeto: "SERVICOS DE LIMPEZA E CACAMBAS",
        ranking: 2,
      },
    ],
    limiares: {
      limiteAtencaoPct: 15.0,
      limiteCriticoPct: 30.0,
    },
    basesLegais: [
      {
        chave: "base_legal_especificacao_orcamentaria",
        descricao: "Princípio da Especificação Orçamentária",
        baseLegal: "Lei 4.320/1964 Arts. 5º e 15",
        urlBaseLegal: "http://www.planalto.gov.br/ccivil_03/leis/l4320.htm",
      },
    ],
  };

  it("renderiza o termômetro de opacidade com badge de concentração elevada e percentuais", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText("Monitoramento de Gastos Genéricos (Subitens .99)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Concentração Elevada em .99")).toBeInTheDocument();
    expect(screen.getByText("56.40%")).toBeInTheDocument();
    expect(
      screen.getByText("Referência: Lei 4.320/1964 Arts. 5º e 15"),
    ).toBeInTheDocument();
  });

  it("renderiza a tabela de top credores em .99 com categorias sugeridas pelo objeto", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText(
        "Maiores Fornecedores em Subitens Genéricos (.99) (Top 2)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("CODESP CONSORCIO DE SAUDE")).toBeInTheDocument();
    expect(screen.getByText("COOPERATIVA DE CATADORES")).toBeInTheDocument();
    expect(
      screen.getByText("Locação de Máquinas & Frotas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Classificação Sugerida pelo Objeto"),
    ).toBeInTheDocument();
  });

  it("retorna null se os dados forem nulos", () => {
    const { container } = render(<TermometroOpacidadeFiscal data={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
