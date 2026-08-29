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
        ano: 2024,
        totalEmpenhos: 300,
        empenhosResidual99: 60,
        empenhosDesvioSensivel99: 15,
        taxaEmpenhosOpacidadePct: 20.0,
        totalPago: 6000000,
        pagoResidual99: 1200000,
        pagoDesvioSensivel99: 300000,
        taxaValorOpacidadePct: 20.0,
        taxaDesvioSensivelPct: 25.0,
        classificacaoRisco: "atencao",
      },
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
        tipoResidual: "evitavel",
        totalEmpenhos: 200,
        totalPago: 4000000,
        percentualDoResidual99: 70.92,
        ranking: 1,
      },
      {
        elementoCodigo: "36",
        elementoDescricao: "Outros Serviços de Terceiros - Pessoa Física",
        categoriaMacro: "Serviços de Terceiros",
        tipoResidual: "evitavel",
        totalEmpenhos: 50,
        totalPago: 1000000,
        percentualDoResidual99: 17.73,
        ranking: 2,
      },
      {
        elementoCodigo: "91",
        elementoDescricao: "Sentenças Judiciais",
        categoriaMacro: "Sentenças",
        tipoResidual: "estrutural",
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

  it("renderiza a quebra por elemento pai de despesas .99 com callout investigativo e badges", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText("Concentração por Elemento Pai (Subitens .99)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Top 3 de 3 naturezas")).toBeInTheDocument();
    expect(screen.getByText("Achado de Concentração:")).toBeInTheDocument();
    expect(screen.getByText("39.99")).toBeInTheDocument();
    expect(
      screen.getByText("Outros Serviços de Terceiros - Pessoa Jurídica"),
    ).toBeInTheDocument();
    expect(screen.getByText("70.92%")).toBeInTheDocument();
    expect(screen.getByText("36.99")).toBeInTheDocument();
    expect(screen.getAllByText("91.99").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sentenças Judiciais")).toBeInTheDocument();
    expect(screen.getByText("Estrutural")).toBeInTheDocument();
    expect(screen.getAllByText("Evitável")).toHaveLength(2);
    expect(screen.getByText(/Nota Metodológica:/)).toBeInTheDocument();
  });

  it("renderiza a evolução histórica de anos anteriores fechados", () => {
    render(<TermometroOpacidadeFiscal data={sampleData} />);

    expect(
      screen.getByText(
        "Evolução Histórica de Opacidade (Exercícios Anteriores Fechados)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2024 – 2025")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getAllByText("25.00%").length).toBeGreaterThan(0);
  });

  it("renderiza ano único no badge quando há apenas um exercício anterior", () => {
    const singleYearData = {
      ...sampleData,
      historico: [sampleData.historico[1], sampleData.historico[2]], // 2025 e 2026
    };
    render(<TermometroOpacidadeFiscal data={singleYearData} />);
    const summary = screen.getByText(
      "Evolução Histórica de Opacidade (Exercícios Anteriores Fechados)",
    );
    expect(summary).toBeInTheDocument();
    expect(screen.getAllByText("2025").length).toBeGreaterThan(0);
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
