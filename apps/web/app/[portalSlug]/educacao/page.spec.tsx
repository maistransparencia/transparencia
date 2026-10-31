import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { loadEducacaoData } from "./loader";

type RawEducacaoData = Awaited<ReturnType<typeof loadEducacaoData>>;

const { loadEducacaoDataMock } = vi.hoisted(() => ({
  loadEducacaoDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadEducacaoData: loadEducacaoDataMock,
}));

// Mock do ResponsiveContainer do Recharts para renderizar com largura e altura fixas em testes JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

const { default: EducacaoPage } = await import("./page");

function makeRawEducacaoData(
  overrides: Partial<RawEducacaoData> = {},
): RawEducacaoData {
  return {
    portalSlug: "porciuncula_prefeitura",
    portalConfig: {
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura Municipal de Porciúncula",
      cidadeClean: "Porciúncula",
      municipioNome: "Porciúncula",
      uf: "RJ",
      dataExtracao: "2026-03-31",
    } as never,
    allMetrics: [
      {
        educacaoMetricaId: "1",
        portalSlug: "porciuncula_prefeitura",
        codIbge: 3304102,
        ano: 2021,
        rede: "municipal",
        etapaEnsino: "anosIniciais",
        notaIdeb: 5.2,
        metaIdeb: 6.4,
        atingiuMeta: false,
        saebMatematica: 210.79,
        saebLinguaPortuguesa: 198.28,
        indicadorFluxoAprovacao: 0.925,
        crescimentoPontosIdeb: null,
        variacaoSaebMatematica: null,
        variacaoSaebPortugues: null,
      },
      {
        educacaoMetricaId: "2",
        portalSlug: "porciuncula_prefeitura",
        ano: 2023,
        codIbge: 3304102,
        rede: "municipal",
        etapaEnsino: "anosIniciais",
        notaIdeb: 4.5,
        metaIdeb: null,
        atingiuMeta: null,
        saebMatematica: 202.1,
        saebLinguaPortuguesa: 194.5,
        indicadorFluxoAprovacao: 0.942,
        crescimentoPontosIdeb: -0.7,
        variacaoSaebMatematica: -8.69,
        variacaoSaebPortugues: -3.78,
      },
      {
        educacaoMetricaId: "3",
        portalSlug: "porciuncula_prefeitura",
        codIbge: 3304102,
        ano: 2025,
        rede: "municipal",
        etapaEnsino: "anosIniciais",
        notaIdeb: 5.9,
        metaIdeb: null,
        atingiuMeta: null,
        saebMatematica: 218.39,
        saebLinguaPortuguesa: 210.91,
        indicadorFluxoAprovacao: 0.985,
        crescimentoPontosIdeb: 1.4,
        variacaoSaebMatematica: 16.29,
        variacaoSaebPortugues: 16.41,
      },
      {
        educacaoMetricaId: "4",
        portalSlug: "porciuncula_prefeitura",
        codIbge: 3304102,
        ano: 2025,
        rede: "municipal",
        etapaEnsino: "anosFinais",
        notaIdeb: 5.3,
        metaIdeb: null,
        atingiuMeta: null,
        saebMatematica: 250.0,
        saebLinguaPortuguesa: 255.0,
        indicadorFluxoAprovacao: 0.96,
        crescimentoPontosIdeb: 0.4,
        variacaoSaebMatematica: 5.0,
        variacaoSaebPortugues: 6.0,
      },
    ],
    resumo: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      notaIdeb: 5.9,
      crescimentoPontosIdeb: 1.4,
      despesaLiquidadaEducacao: 34291936.64,
      posicaoRanking: 46,
      totalMunicipios: 92,
      variacaoPosicoes: 32,
      mdePercentual: 26.8,
      fundebPercentual: 78.4,
      metaIdeb: null,
      atingiuMeta: null,
      saebMatematica: 218.39,
      saebLinguaPortuguesa: 210.91,
      indicadorFluxoAprovacao: 0.985,
      anosIniciais: null,
      anosFinais: null,
    },
    contratos: [
      {
        contratoId: "ctr_pnae_1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        empresaId: "1",
        contratoNumero: "0443/25",
        licitacaoNumero: "012/2025",
        modalidade: "pregao_eletronico",
        fornecedorNome: "DISTRIBUIDORA ALIMENTAR LTDA",
        fornecedorCpfCnpj: "12.345.678/0001-90",
        objeto: "Fornecimento de merenda escolar PNAE para escolas municipais",
        categoria: "merenda_pnae",
        valorContrato: 450000,
        valorAditado: 0,
        totalEmpenhado: 450000,
        totalLiquidado: 200000,
        totalPago: 180000,
        saldoAPagar: 270000,
        fontePrincipal: "PNAE - FNDE",
        fontesRecursos: "PNAE - FNDE; Recursos Próprios",
        orgaoNome: "Secretaria Municipal de Educação",
        principalFuncao: "Educação",
        principalPrograma: "Alimentação Escolar",
        principalAcao: "Merenda Escolar",
        dataInicio: "2025-02-01",
        vencimentoAtual: "2025-12-31",
      },
      {
        contratoId: "ctr_pnate_2",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        empresaId: "2",
        contratoNumero: "0550/25",
        licitacaoNumero: "015/2025",
        modalidade: "pregao_eletronico",
        fornecedorNome: "VIACAO ESCOLAR LTDA",
        fornecedorCpfCnpj: "98.765.432/0001-10",
        objeto: "Serviço de transporte escolar rural PNATE",
        categoria: "transporte_pnate",
        valorContrato: 320000,
        valorAditado: 0,
        totalEmpenhado: 320000,
        totalLiquidado: 150000,
        totalPago: 140000,
        saldoAPagar: 180000,
        fontePrincipal: "PNATE",
        fontesRecursos: "Recurso Federal PNATE",
        orgaoNome: "Secretaria Municipal de Educação",
        principalFuncao: "Educação",
        principalPrograma: "Transporte do Estudante",
        principalAcao: "Transporte Escolar",
        dataInicio: "2025-02-15",
        vencimentoAtual: "2025-12-31",
      },
      {
        contratoId: "ctr_locacao_3",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        empresaId: "1",
        contratoNumero: "0034/26",
        licitacaoNumero: "005/2025",
        modalidade: "dispensa",
        fornecedorNome: "IMOBILIARIA CENTRAL LTDA",
        fornecedorCpfCnpj: "11.222.333/0001-44",
        objeto:
          "Locação de imóvel para funcionamento de classe anexa de creche",
        categoria: "locacao_imoveis",
        valorContrato: 24000,
        valorAditado: 0,
        totalEmpenhado: 24000,
        totalLiquidado: 12000,
        totalPago: 12000,
        saldoAPagar: 12000,
        fontePrincipal: "Recursos Próprios",
        fontesRecursos: "Recursos Próprios - Educação",
        orgaoNome: "Secretaria Municipal de Educação",
        principalFuncao: "Educação",
        principalPrograma: "Infraestrutura Escolar",
        principalAcao: "Locação Predial",
        dataInicio: "2025-01-01",
        vencimentoAtual: "2025-12-31",
      },
      {
        contratoId: "ctr_outros_4",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        empresaId: "1",
        contratoNumero: "0453/25",
        licitacaoNumero: "020/2025",
        modalidade: "inexigibilidade",
        fornecedorNome: "ASSESSORIA EDUCACIONAL LTDA",
        fornecedorCpfCnpj: "55.666.777/0001-88",
        objeto: "Assessoria técnica e alimentação do sistema PDDE Interativo",
        categoria: "outros",
        valorContrato: 36000,
        valorAditado: 0,
        totalEmpenhado: 36000,
        totalLiquidado: 36000,
        totalPago: 36000,
        saldoAPagar: 0,
        fontePrincipal: "Recursos Próprios",
        fontesRecursos: "Recursos Próprios",
        orgaoNome: "Secretaria Municipal de Educação",
        principalFuncao: "Educação",
        principalPrograma: "Gestão Educacional",
        principalAcao: "Suporte Técnico",
        dataInicio: "2025-01-01",
        vencimentoAtual: "2025-12-31",
      },
    ],
    context: {
      selectedYear: 2025,
      isCurrentYear: false,
      selectedEtapa: "anosIniciais",
    },
    emendas: {
      totalAutorizado: 0,
      totalEmpenhado: 0,
      totalRecebidoFundo: 0,
      totalReceitaPossivel: 0,
      taxaEmpenho: 0,
      maiorEmenda: 0,
      lista: [],
    },
    mediasEstaduais: {
      anosIniciais: {},
      anosFinais: {},
    },
    origemRecursos: null,
    execucaoAnual: [
      {
        ano: 2024,
        empenhado: 30_000_000,
        liquidado: 29_000_000,
        pago: 28_000_000,
        pagoSemPessoal: 28_000_000,
      },
      {
        ano: 2025,
        empenhado: 36_000_000,
        liquidado: 34_291_936.64,
        pago: 32_000_000,
        pagoSemPessoal: 32_000_000,
      },
    ],
    topFornecedores: [
      {
        fornecedorNome: "FORNECEDORA GERAL DA EDUCACAO LTDA",
        fornecedorCpfCnpj: "98.765.432/0001-10",
        totalPago: 800_000,
        totalEmpenhado: 900_000,
        percentualPago: 100,
      },
    ],
    rankingAnosIniciais: {
      posicaoRanking: 46,
      totalMunicipios: 92,
      variacaoPosicoes: 43,
    },
    rankingAnosFinais: null,
    searchParams: {},
    ...overrides,
  };
}

describe("EducacaoPage (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza as seções na ordem da pergunta do cidadão", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /A Prefeitura reservou R\$ 36,0 mi em educação em 2025 e pagou R\$ 32,0 mi\./,
    );

    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((titulo) => titulo.textContent);
    expect(titulos).toEqual([
      "Como mudou ao longo dos anos",
      "Como o Fundo contrata",
      "Quem recebe o dinheiro da educação",
      "Aprendizado dos alunos",
    ]);

    expect(screen.queryByTestId("trofeu-civico-card")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Painel de Responsabilidade Fiscal da Educação"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("contrato-row-0443/25")).toBeInTheDocument();
  });

  it("mostra a nota do IDEB, a meta e a classificação por etapa em Aprendizado dos alunos", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const secao = screen.getByRole("region", {
      name: "Aprendizado dos alunos",
    });
    expect(within(secao).getAllByText("Nota do IDEB")).toHaveLength(2);
    expect(within(secao).getByText("5,9")).toBeInTheDocument();
    expect(within(secao).getByText("46º")).toBeInTheDocument();
    expect(
      within(secao).getByText("entre 92 redes municipais"),
    ).toBeInTheDocument();
  });

  it("abre automaticamente o modal padronizado via deep link (?contratoNumero=0443/25)", async () => {
    loadEducacaoDataMock.mockResolvedValue(
      makeRawEducacaoData({
        searchParams: { contratoNumero: "0443/25" },
      }),
    );

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({ contratoNumero: "0443/25" }),
    });

    render(PageComponent);

    // O modal deve estar aberto exibindo o título canônico e detalhes
    expect(
      screen.getByRole("heading", { name: "Contrato nº 0443/25" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("contrato-detalhes-modal")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Fornecimento de merenda escolar PNAE para escolas municipais/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fechar")).toBeInTheDocument();
  });

  it("permite abrir e fechar o modal ao clicar em 'Ver detalhes' e 'Fechar'", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    expect(
      screen.queryByTestId("contrato-detalhes-modal"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Expandir detalhes da linha" })[0],
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);

    expect(screen.getByTestId("contrato-detalhes-modal")).toBeInTheDocument();

    const fecharBtn = screen.getByText("Fechar");
    fireEvent.click(fecharBtn);

    expect(
      screen.queryByTestId("contrato-detalhes-modal"),
    ).not.toBeInTheDocument();
  });

  it("garante neutralidade institucional sem citar nomes de prefeitos ou agentes políticos", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    const { container } = render(PageComponent);
    const htmlText = container.textContent?.toLowerCase() || "";

    expect(htmlText).not.toContain("prefeito");
  });

  it("permite alternar entre Anos Iniciais e Anos Finais no gráfico de histórico", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    const btnIniciais = screen.getByRole("button", {
      name: "Anos Iniciais",
    });
    const btnFinais = screen.getByRole("button", {
      name: "Anos Finais",
    });

    expect(btnIniciais).toHaveAttribute("aria-pressed", "true");
    expect(btnFinais).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btnFinais);

    expect(btnFinais).toHaveAttribute("aria-pressed", "true");
    expect(btnIniciais).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btnIniciais);
    expect(btnIniciais).toHaveAttribute("aria-pressed", "true");
  });

  it("abre Detalhes do IDEB com SAEB e aprovação em indicadores dentro de um panel", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const secao = screen.getByRole("region", {
      name: "Aprendizado dos alunos",
    });
    fireEvent.click(
      within(secao).getByRole("button", { name: "Ver detalhes" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Detalhes do IDEB")).toBeInTheDocument();
    expect(
      within(dialog).getByText("SAEB — Língua Portuguesa"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("SAEB — Matemática")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Taxa de aprovação escolar"),
    ).toBeInTheDocument();
    expect(dialog.querySelector(".panel dl")).not.toBeNull();
    expect(
      within(dialog).getByRole("heading", { name: "Como ler a meta do IDEB" }),
    ).toBeInTheDocument();
  });

  it("exibe cards por categoria e abre a lista da categoria no modal", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    fireEvent.click(screen.getByTestId("categoria-card-transporte_pnate"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getAllByText("VIACAO ESCOLAR LTDA").length,
    ).toBeGreaterThan(0);
    expect(
      within(dialog).queryByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeNull();
  });

  it("filtra contratos por busca textual na DenseTable", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    const searchInput = screen.getByPlaceholderText(
      "Buscar por fornecedor, CNPJ ou objeto...",
    );

    fireEvent.change(searchInput, { target: { value: "VIACAO" } });

    expect(
      screen.getAllByText("VIACAO ESCOLAR LTDA").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText("DISTRIBUIDORA ALIMENTAR LTDA").length).toBe(
      0,
    );

    // Limpa a busca
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(
      screen.getAllByText("DISTRIBUIDORA ALIMENTAR LTDA").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("VIACAO ESCOLAR LTDA").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("exibe a seção de emendas da Educação somente quando há emendas", async () => {
    const emendaItem = {
      id: "e1",
      numero: "1",
      objeto: "Reforma de escola",
      valorAutorizado: 300000,
      empenhado: 100000,
      autor: "AUTOR TESTE",
      tipoEmenda: "individual",
      esferaOrigem: "federal",
      atoNormativo: "",
      destinacao: "",
      valorRecebidoFundo: 0,
      recebimentoFundo: "nao_identificado",
      receitaCodigo: null,
      receitaDescricao: null,
      qtdEmpenhos: 0,
      empenhos: [],
    };
    loadEducacaoDataMock.mockResolvedValue(
      makeRawEducacaoData({
        emendas: {
          totalAutorizado: 300000,
          totalEmpenhado: 100000,
          totalRecebidoFundo: 0,
          totalReceitaPossivel: 0,
          taxaEmpenho: 1 / 3,
          maiorEmenda: 300000,
          lista: [emendaItem],
        },
      }),
    );
    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Emendas na educação" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Emendas parlamentares destinadas à Saúde"),
    ).not.toBeInTheDocument();
  });

  it("omite a seção de emendas quando não há emendas da Educação", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());
    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: "Emendas na educação" }),
    ).not.toBeInTheDocument();
  });
  it("exibe O que entrou antes de Como mudou ao longo dos anos", async () => {
    loadEducacaoDataMock.mockResolvedValue(
      makeRawEducacaoData({
        origemRecursos: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2025,
          nomeOrgao: "Fundo Municipal de Educação",
          anoMin: 2020,
          anoMax: 2025,
          anoParcial: null,
          mesReferencia: null,
          totalArrecadado: 1000,
          fontes: [
            {
              grupoFonte: "fundeb",
              totalArrecadado: 1000,
              percentualTotal: 100,
              historicoAnual: [{ ano: 2025, totalArrecadado: 1000 }],
              composicao: [
                {
                  codigoNatureza: "1751.50",
                  descricaoNatureza: "Transferências do FUNDEB",
                  totalArrecadado: 1000,
                },
              ],
            },
          ],
        },
      }),
    );
    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const origem = screen.getByRole("region", {
      name: "O que entrou no Fundo Municipal de Educação",
    });
    const evolucao = screen.getByRole("heading", {
      level: 2,
      name: "Como mudou ao longo dos anos",
    });
    expect(
      origem.compareDocumentPosition(evolucao) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(origem).getByRole("heading", { level: 2, name: "O que entrou" }),
    ).toBeInTheDocument();
  });

  it("omite o bloco de origem dos recursos quando o portal não tem fundo de Educação", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());
    render(
      await EducacaoPage({
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.queryByRole("region", {
        name: "De onde vem o dinheiro da Educação",
      }),
    ).not.toBeInTheDocument();
  });
});
