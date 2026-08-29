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
    elementosResidual99: [
      {
        elementoCodigo: "39",
        elementoDescricao: "Outros Serviços de Terceiros - Pessoa Jurídica",
        categoriaMacro: "Serviços de Terceiros",
        totalEmpenhos: 200,
        totalPago: 4000000,
        percentualDoResidual99: 70.92,
        ranking: 1,
      },
      {
        elementoCodigo: "36",
        elementoDescricao: "Outros Serviços de Terceiros - Pessoa Física",
        categoriaMacro: "Serviços de Terceiros",
        totalEmpenhos: 50,
        totalPago: 1000000,
        percentualDoResidual99: 17.73,
        ranking: 2,
      },
      {
        elementoCodigo: "30",
        elementoDescricao: "Material de Consumo",
        categoriaMacro: "Material",
        totalEmpenhos: 30,
        totalPago: 640000,
        percentualDoResidual99: 11.35,
        ranking: 3,
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
    expect(screen.getByText("Uso Elevado de .99")).toBeInTheDocument();
    expect(screen.getByText("56.40%")).toBeInTheDocument();
    expect(
      screen.getByText("Referência: Lei 4.320/1964 Arts. 5º e 15"),
    ).toBeInTheDocument();
  });

  it("renderiza a quebra por elemento pai de despesas .99", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText("Concentração por Elemento Pai (Subitens .99)"),
    ).toBeInTheDocument();
    expect(screen.getByText("39.99")).toBeInTheDocument();
    expect(
      screen.getByText("Outros Serviços de Terceiros - Pessoa Jurídica"),
    ).toBeInTheDocument();
    expect(screen.getByText("70.92%")).toBeInTheDocument();
    expect(screen.getByText("36.99")).toBeInTheDocument();
    expect(screen.getByText("30.99")).toBeInTheDocument();
  });

  it("renderiza a evolução histórica de anos anteriores fechados", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText(
        "Evolução Histórica de Opacidade (Exercícios Anteriores Fechados)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2025 – 2025")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("25.00%")).toBeInTheDocument();
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

  it("renderiza corretamente as novas categorias sugeridas na gaveta de credores", () => {
    const dataComNovasCategorias: OpacidadeContabilMetricsDTO = {
      ...sampleData,
      topCredores: [
        {
          credorCodigo: "11.111.111/0001-11",
          credorNome: "CODESP CONSORCIO DE SAUDE",
          totalEmpenhos: 10,
          totalPago: 50000,
          pagoDesvioSensivel: 50000,
          categoriaPredominante: "consorcios_publicos",
          amostraObjeto: "RATEIO DE DESPESAS DE SAUDE",
          ranking: 1,
        },
        {
          credorCodigo: "22.222.222/0001-22",
          credorNome: "COOPERATIVA LIMPEZA",
          totalEmpenhos: 5,
          totalPago: 20000,
          pagoDesvioSensivel: 20000,
          categoriaPredominante: "limpeza_residuos",
          amostraObjeto: "COLETA DE LIXO E CACAMBAS",
          ranking: 2,
        },
      ],
    };

    render(<TermometroOpacidadeFiscal data={dataComNovasCategorias} />);

    expect(screen.getByText("Consórcios de Saúde")).toBeInTheDocument();
    expect(screen.getByText("Limpeza Urbana & Resíduos")).toBeInTheDocument();
  });

  it("retorna null se os dados forem nulos", () => {
    const { container } = render(<TermometroOpacidadeFiscal data={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
