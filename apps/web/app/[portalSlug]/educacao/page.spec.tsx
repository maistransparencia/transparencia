import { fireEvent, render, screen } from "@testing-library/react";
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
    } as any,
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
        despesaLiquidadaEducacao: 25000000,
        totalMatriculasRedeMunicipal: 2300,
        custoAnualPorAluno: 10869.56,
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
        despesaLiquidadaEducacao: 29000000,
        totalMatriculasRedeMunicipal: 2280,
        custoAnualPorAluno: 12719.3,
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
        despesaLiquidadaEducacao: 34291936.64,
        totalMatriculasRedeMunicipal: 2290,
        custoAnualPorAluno: 14553.0,
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
        despesaLiquidadaEducacao: 34291936.64,
        totalMatriculasRedeMunicipal: 2290,
        custoAnualPorAluno: 14553.0,
      },
    ],
    resumo: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      notaIdeb: 5.9,
      crescimentoPontosIdeb: 1.4,
      despesaLiquidadaEducacao: 34291936.64,
      totalMatriculasRedeMunicipal: 2290,
      custoAnualPorAluno: 14553.0,
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
    ],
    context: {
      selectedYear: 2025,
      isCurrentYear: false,
      selectedEtapa: "anosIniciais",
    },
    searchParams: {},
    ...overrides,
  };
}

describe("EducacaoPage (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza os 4 blocos de alto impacto cívico desenhados por Sally", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    // Bloco 1: Hero & Troféu Cívico
    expect(
      screen.getByText(/Educação Básica & Rigor Fiscal em Porciúncula/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("trofeu-civico-card")).toBeInTheDocument();
    expect(
      screen.getByText(/Maior crescimento do Estado do Rio de Janeiro/i),
    ).toBeInTheDocument();
    expect(screen.getByText("5,9")).toBeInTheDocument();
    expect(screen.getByText("+1,4 ponto")).toBeInTheDocument();
    expect(screen.getByText(/46º lugar estadual/i)).toBeInTheDocument();

    // Bloco 2: Linha do tempo e série histórica
    expect(
      screen.getByText(/Série Histórica do IDEB e Avaliações Oficiais/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Anos Iniciais (1º ao 5º ano)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Anos Finais (6º ao 9º ano)")).toBeInTheDocument();
    expect(screen.getByText(/SAEB — Língua Portuguesa/i)).toBeInTheDocument();
    expect(screen.getByText(/SAEB — Matemática/i)).toBeInTheDocument();

    // Bloco 3: Painel de Responsabilidade Fiscal (MDE e FUNDEB)
    expect(screen.getByTestId("termometro-mde")).toBeInTheDocument();
    expect(screen.getByTestId("termometro-fundeb")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Art\. 212 da CF\/88/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Art\. 212-A da CF\/88/i).length,
    ).toBeGreaterThanOrEqual(1);

    // Valida hyperlinks oficiais com target="_blank" e rel="noopener noreferrer" (Regra 20)
    const mdeLink = screen.getByLabelText(
      /Texto oficial do Art. 212 da CF\/88 no Planalto/i,
    );
    expect(mdeLink).toHaveAttribute("target", "_blank");
    expect(mdeLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(mdeLink).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212",
    );

    const fundebLink = screen.getByLabelText(
      /Texto oficial do Art. 212-A da CF\/88 no Planalto/i,
    );
    expect(fundebLink).toHaveAttribute("target", "_blank");
    expect(fundebLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(fundebLink).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212a",
    );

    // Bloco 4: Contratos e compras da educação
    expect(
      screen.getByText("Contratos e Compras da Educação"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("contrato-row-0443/25")).toBeInTheDocument();
    expect(
      screen.getByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ver detalhes").length).toBeGreaterThanOrEqual(
      1,
    );
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

    // O modal deve estar aberto exibindo o título padronizado e detalhes
    expect(screen.getByText("Detalhes do Contrato")).toBeInTheDocument();
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

    const verDetalhesBtn = screen.getAllByText("Ver detalhes")[0];
    fireEvent.click(verDetalhesBtn);

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
      name: "Anos Iniciais (1º ao 5º ano)",
    });
    const btnFinais = screen.getByRole("button", {
      name: "Anos Finais (6º ao 9º ano)",
    });

    expect(btnIniciais).toHaveAttribute("aria-pressed", "true");
    expect(btnFinais).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btnFinais);

    expect(btnFinais).toHaveAttribute("aria-pressed", "true");
    expect(btnIniciais).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btnIniciais);
    expect(btnIniciais).toHaveAttribute("aria-pressed", "true");
  });

  it("filtra contratos por categoria ao clicar nas abas", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    // Ambos os contratos aparecem inicialmente
    expect(
      screen.getByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeInTheDocument();
    expect(screen.getByText("VIACAO ESCOLAR LTDA")).toBeInTheDocument();

    // Clica no filtro Transporte (PNATE)
    const tabTransporte = screen.getByRole("tab", {
      name: /transporte \(pnate\)/i,
    });
    fireEvent.click(tabTransporte);

    expect(screen.getByText("VIACAO ESCOLAR LTDA")).toBeInTheDocument();
    expect(
      screen.queryByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).not.toBeInTheDocument();

    // Clica no filtro Merenda (PNAE)
    const tabMerenda = screen.getByRole("tab", { name: /merenda \(pnae\)/i });
    fireEvent.click(tabMerenda);

    expect(
      screen.getByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeInTheDocument();
    expect(screen.queryByText("VIACAO ESCOLAR LTDA")).not.toBeInTheDocument();

    // Volta para Todas
    const tabTodas = screen.getByRole("tab", { name: /todas/i });
    fireEvent.click(tabTodas);

    expect(
      screen.getByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeInTheDocument();
    expect(screen.getByText("VIACAO ESCOLAR LTDA")).toBeInTheDocument();
  });

  it("filtra contratos por busca textual com suporte a normalização de acentos", async () => {
    loadEducacaoDataMock.mockResolvedValue(makeRawEducacaoData());

    const PageComponent = await EducacaoPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(PageComponent);

    const searchInput = screen.getByPlaceholderText(
      "Buscar fornecedor, número...",
    );

    // Busca insensível a acentuação: "viação" deve encontrar "VIACAO ESCOLAR LTDA"
    fireEvent.change(searchInput, { target: { value: "viação" } });

    expect(screen.getByText("VIACAO ESCOLAR LTDA")).toBeInTheDocument();
    expect(
      screen.queryByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).not.toBeInTheDocument();

    // Limpa a busca via botão de limpar
    const clearBtn = screen.getByLabelText("Limpar busca");
    fireEvent.click(clearBtn);

    expect(
      screen.getByText("DISTRIBUIDORA ALIMENTAR LTDA"),
    ).toBeInTheDocument();
    expect(screen.getByText("VIACAO ESCOLAR LTDA")).toBeInTheDocument();
  });
});
