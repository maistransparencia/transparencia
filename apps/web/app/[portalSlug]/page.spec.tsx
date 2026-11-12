import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadVisaoGeralData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadVisaoGeralData>>;

const { loadVisaoGeralDataMock } = vi.hoisted(() => ({
  loadVisaoGeralDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadVisaoGeralData: loadVisaoGeralDataMock,
}));

const { default: VisaoGeralPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      currentYear: 2024,
      selectedYear: 2024,
      isCurrentYear: true,
      entidadesIds: undefined,
    },
    portalConfig: {
      displayName: "Porciúncula",
      dataExtracao: "2024-12-31",
      dataExtracaoDate: new Date("2024-12-31"),
    },
    posicao: {
      totalArrecadado: 100000,
      despesasPagas: 80000,
      restosPagosNoAno: 5000,
      totalSaidas: 85000,
      saldoEstimado: 15000,
      saldoAposRestos: 10000,
      restosPendentes: [],
      restosPendentesTotal: 5000,
      restosPendentesAnteriores: 0,
      totalCredoresAdmAtual: 10,
    },
    execSummary: {
      totalEmpenhado: 90000,
      totalLiquidado: 85000,
      totalPago: 80000,
      totalDotacao: 100000,
      saldoOrcamentario: 10000,
    },
    gaps: [],
    fonte: undefined,
    folha: { percentualFolha: 45 },
    pctChefiasEfetivas: 80,
    lrfLimiteMaximo: 54,
    contratosServicos: {
      totalContratosVigentes: 5,
      totalContratosComPendencia: 1,
      totalEmpenhado: 50000,
    },
    posicaoFinanceira: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      mesMaisRecente: 12,
      dataHomologacao: "2024-12-31",
      totalCaixaGeral: 12000000,
      totalRecursosLivres: 4000000,
      totalRecursosVinculados: 8000000,
      totalCaixaPrevidencia: 0,
      totalRecursosPrevidencia: 0,
      entidades: [
        {
          poderOrgao: "Executivo",
          entidadeNome: "Prefeitura Municipal",
          cnpj: "29.138.342/0001-30",
          empresaId: "1",
          grupoDestinacao: "recursos_ordinarios",
          saldoCaixaBancos: 8000000,
          saldoRecursosLivres: 3000000,
          saldoRecursosVinculados: 5000000,
          mesReferencia: 12,
          dataReferencia: "2024-12-31",
        },
      ],
      previdencia: [],
    },
    radarAlertas: [],
    resumoFarmacia: { status: "conforme" },
    minimoSaude: null,
    minimoEducacao: null,
    situacaoHome: {
      saude: { estado: "indisponivel", emAtencao: false, motivo: null },
      obras: { estado: "normal", emAtencao: false, motivo: null },
      educacao: { estado: "indisponivel", emAtencao: false, motivo: null },
    },
    resumoObras: {
      totalObras: 5,
      emExecucao: 2,
      paralisadas: 1,
      concluidas: 2,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 15000000,
      valorEmExecucao: 8000000,
      valorParalisadas: 2000000,
      valorConcluidas: 5000000,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: 65,
      obrasSemMedicaoCount: 0,
    },
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

function blocoDecimoTerceiro(): HTMLElement {
  const bloco = screen
    .getByRole("heading", { name: "Dinheiro que entra na cidade" })
    .closest("section");
  if (!bloco) throw new Error("bloco do 13º não encontrado");
  return bloco;
}

describe("VisaoGeralPage", () => {
  it("happy-path: abertura, situação da cidade, dinheiro público e mais detalhes, sem radar nem pipeline", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw());

    const element = await VisaoGeralPage(props);
    render(element);

    expect(screen.queryByText(/Radar Cívico Municipal/)).toBeNull();
    expect(
      screen.queryByText("Do orçamento autorizado ao pagamento"),
    ).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e bancos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/total em caixa municipal/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /ver detalhamento por entidade em execução orçamentária/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Em destaque" })).toBeNull();
    expect(screen.queryByText(/Sentinela cívica/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Como está a cidade hoje" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Obras" })).toBeInTheDocument();
  });

  it("segue a ordem: abertura, situação, dinheiro público, mais detalhes", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw());
    render(await VisaoGeralPage(props));

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Porciúncula");
    expect(screen.queryByText("Situação da cidade")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Dados de 2024, atualizados em/),
    ).toBeInTheDocument();

    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titulos).toEqual([
      "Como está a cidade hoje",
      "Quanto dinheiro entrou",
      "Mais detalhes",
    ]);
    expect(screen.queryByText(/Ano/i, { selector: "select" })).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.getByText(/saldo disponível nas contas da prefeitura/i),
    ).toBeInTheDocument();
    ["Despesas", "Licitações e Contratos", "Pessoal"].forEach((nome) => {
      expect(
        screen.getByRole("link", { name: new RegExp(nome) }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { level: 5 })).toBeNull();
  });

  it("13º dentro da janela: bloco entre situação e dinheiro público, com o valor pago acumulado, sem barra nem percentual", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        decimoTerceiro: {
          empenhado: 1_000_000,
          empenhadoBruto: 1_000_000,
          liquidado: 600_000,
          pago: 400_000,
          percentual_pago: 0.4,
          pctPago: 0.4,
        },
      }),
    );
    render(await VisaoGeralPage(props));

    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titulos).toEqual([
      "Como está a cidade hoje",
      "Dinheiro que entra na cidade",
      "Quanto dinheiro entrou",
      "Mais detalhes",
    ]);
    expect(
      screen.getByText("Quanto do 13º a Prefeitura já pagou este ano?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?400/)).toBeInTheDocument();
    expect(within(blocoDecimoTerceiro()).queryByRole("progressbar")).toBeNull();
    expect(
      screen.getByText(/Ainda não temos a data de cada pagamento/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/atrasad|não pagou/i)).toBeNull();
  });

  it("13º com pago zerado: diz que não há informação, sem 'atrasado'", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        decimoTerceiro: {
          empenhado: 1_000_000,
          empenhadoBruto: 1_000_000,
          liquidado: 0,
          pago: 0,
          percentual_pago: 0,
          pctPago: 0,
        },
      }),
    );
    render(await VisaoGeralPage(props));

    expect(
      screen.getByText("Ainda sem informação de pagamento"),
    ).toBeInTheDocument();
    expect(within(blocoDecimoTerceiro()).queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/atrasad|não pagou/i)).toBeNull();
  });

  it("fora da janela ou sem dado do 13º: o bloco não existe", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw({ decimoTerceiro: null }));
    render(await VisaoGeralPage(props));

    expect(
      screen.queryByRole("heading", { name: "Dinheiro que entra na cidade" }),
    ).toBeNull();
    expect(
      screen.queryByText("Quanto do 13º a Prefeitura já pagou este ano?"),
    ).toBeNull();
  });

  it("município sem nome mostra Municípios Integrados", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ portalConfig: { dataExtracao: "2024-12-31" } }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.getByRole("heading", { level: 1, name: "Municípios Integrados" }),
    ).toBeInTheDocument();
  });

  it("renderiza fallback amigável quando posicaoFinanceira for nula", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ posicaoFinanceira: null }),
    );

    const element = await VisaoGeralPage(props);
    render(element);

    expect(
      screen.getByText(
        /aguardando homologação da remessa msc pelo tesouro nacional para o exercício/i,
      ),
    ).toBeInTheDocument();
  });

  it("obras nulo: o card de obras nao renderiza", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(makeRaw({ resumoObras: null }));
    render(await VisaoGeralPage(props));
    expect(screen.queryByRole("article", { name: "Obras" })).toBeNull();
  });

  it("renderiza o card de educacao com Ideb e link para a rota de educacao", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
          atingiuMeta: false,
          posicaoRanking: 46,
          totalMunicipios: 92,
          variacaoPosicoes: -2,
          despesaLiquidadaEducacao: 33300000,
          anosIniciais: { notaIdeb: 5.9 },
          anosFinais: { notaIdeb: 5.3 },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    const card = screen.getByRole("article", { name: "Educação" });
    expect(card).toHaveTextContent("Ideb 5,9");
    expect(
      within(card).getByRole("link", { name: /Ver detalhes/ }),
    ).toHaveAttribute("href", expect.stringContaining("/educacao"));
  });

  it("apagao da farmacia mostra Sem informação de estoque, sem etiqueta e com Ver detalhes", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ resumoFarmacia: { status: "apagao" } }),
    );
    render(await VisaoGeralPage(props));
    const card = screen.getByRole("article", { name: "Saúde" });
    expect(card).toHaveTextContent("Sem informação de estoque");
    expect(card).toHaveTextContent(/não quer dizer que falta remédio/);
    expect(within(card).queryByText("Merece atenção")).toBeNull();
    expect(
      screen.queryByPlaceholderText("Qual remédio você procura?"),
    ).toBeNull();
    expect(
      within(card).getByRole("link", { name: /Ver detalhes/ }),
    ).toHaveAttribute("href", expect.stringContaining("/saude"));
  });

  it("conforme da farmacia mostra o campo de busca", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ resumoFarmacia: { status: "conforme" } }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.getByPlaceholderText("Qual remédio você procura?"),
    ).toBeInTheDocument();
  });

  it("conforme da farmacia mostra os exemplos de busca das sentinelas", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoFarmacia: { status: "conforme" },
        sentinelasFarmacia: {
          totalUnidadesAtivas: 3,
          sentinelas: [
            {
              codigoPrincipioAtivo: "dipirona",
              nomePrincipioAtivo: "Dipirona",
              grupoTerapeutico: "dor_febre",
              ordemExibicao: 1,
              destaqueCardInicial: true,
              unidadesComRegistro: 2,
              unidadesSomenteCombinacao: 0,
            },
          ],
        },
      }),
    );
    render(await VisaoGeralPage(props));
    const pilula = screen.getByRole("link", { name: "Dipirona" });
    expect(pilula.getAttribute("href")).toContain("/farmacia?q=Dipirona");
  });

  it("obra paralisada mostra Merece atenção sempre com o motivo escrito", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        situacaoHome: {
          saude: { estado: "indisponivel", emAtencao: false, motivo: null },
          obras: {
            estado: "normal",
            emAtencao: true,
            motivo: "obra_paralisada",
          },
          educacao: { estado: "indisponivel", emAtencao: false, motivo: null },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    const card = screen.getByRole("article", { name: "Obras" });
    expect(card).toHaveTextContent("Merece atenção");
    expect(card).toHaveTextContent("1 obra está parada.");
  });

  it("ordena Saúde, Obras e Educação antes do radar e do pipeline", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoFarmacia: { status: "apagao" },
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: 5.9,
          crescimentoPontosIdeb: 1.4,
          atingiuMeta: true,
          posicaoRanking: 3,
          totalMunicipios: 92,
          variacaoPosicoes: 1,
          despesaLiquidadaEducacao: 1000000,
          anosIniciais: { notaIdeb: 5.9 },
          anosFinais: { notaIdeb: 5.3 },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    const saude = screen.getByRole("article", { name: "Saúde" });
    const obras = screen.getByRole("article", { name: "Obras" });
    const educacao = screen.getByRole("article", { name: "Educação" });
    const dinheiro = screen.getByRole("heading", {
      name: "Quanto dinheiro entrou",
    });
    const precede = (anterior: Element, posterior: Element) =>
      Boolean(
        anterior.compareDocumentPosition(posterior) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    expect(precede(saude, obras)).toBe(true);
    expect(precede(obras, educacao)).toBe(true);
    expect(precede(educacao, dinheiro)).toBe(true);
  });

  it("sem nenhum dado a seção Como está a cidade hoje não existe", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoObras: null,
        resumoEducacao: null,
        resumoFarmacia: { status: "indisponivel" },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(
      screen.queryByRole("heading", { name: "Como está a cidade hoje" }),
    ).toBeNull();
  });

  it("farmacia indisponivel com obras presente mostra só o card de obras", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoFarmacia: { status: "indisponivel" },
        resumoEducacao: null,
      }),
    );
    render(await VisaoGeralPage(props));
    expect(screen.getByRole("article", { name: "Obras" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Saúde" })).toBeNull();
  });

  it("educacao com nota indisponivel oculta o card", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        resumoObras: null,
        resumoFarmacia: { status: "indisponivel" },
        resumoEducacao: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2023,
          notaIdeb: null,
          crescimentoPontosIdeb: null,
          atingiuMeta: null,
          posicaoRanking: null,
          totalMunicipios: null,
          variacaoPosicoes: null,
          despesaLiquidadaEducacao: null,
          anosIniciais: { notaIdeb: null },
          anosFinais: { notaIdeb: null },
        },
      }),
    );
    render(await VisaoGeralPage(props));
    expect(screen.queryByRole("article", { name: "Educação" })).toBeNull();
  });

  it("cada seção abre com SectionHeader (filete de 2px) e espaçamento responsivo", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({ resumoFarmacia: { status: "apagao" } }),
    );
    const { container } = render(await VisaoGeralPage(props));
    const titulos = ["Quanto dinheiro entrou", "Mais detalhes"];
    titulos.forEach((titulo) => {
      const cabecalho = screen
        .getByRole("heading", { name: titulo })
        .closest("header");
      expect(cabecalho).toHaveClass("border-t-2", "border-ink");
    });
    const raiz = container.firstElementChild;
    expect(raiz).toHaveClass("space-y-12", "md:space-y-16", "bg-page");
  });

  it("a situação da cidade não repete a abertura: título só para leitor de tela", async () => {
    render(await VisaoGeralPage(props));
    const titulo = screen.getByRole("heading", {
      name: "Como está a cidade hoje",
    });
    expect(titulo).toHaveClass("sr-only");
    expect(titulo.closest("header")).toBeNull();
  });

  it("ano encerrado não fala em hoje", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        context: {
          currentYear: 2026,
          selectedYear: 2025,
          isCurrentYear: false,
          entidadesIds: undefined,
        },
      }),
    );
    const { container } = render(await VisaoGeralPage(props));
    expect(
      screen.getByText(/Como a cidade ficou em 2025 e para onde foi/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Como a cidade ficou em 2025" }),
    ).toBeInTheDocument();
    expect(container.querySelector("header")?.textContent).not.toMatch(/hoje/);
  });

  it("não usa caixas com sombra nem hex nos arquivos migrados", () => {
    const arquivos = [
      "app/[portalSlug]/page.tsx",
      "components/abertura-home.tsx",
      "components/dinheiro-publico-section.tsx",
      "components/mais-detalhes-section.tsx",
      "components/situacao-cidade-section.tsx",
      "lib/situacao-cidade.ts",
      "components/radar-civico-feed.tsx",
      "components/pipeline-execucao.tsx",
      "components/saldo-caixa-resumo-card.tsx",
      "components/cards-secundarios-visao-geral.tsx",
      "components/obras-resumo-card.tsx",
      "components/educacao-resumo-card.tsx",
      "components/farmacia/farmacia-resumo-card.tsx",
    ];
    arquivos.forEach((arquivo) => {
      const conteudo = readFileSync(resolve(process.cwd(), arquivo), "utf8");
      expect(conteudo, arquivo).not.toMatch(
        /rounded-2xl|rounded-\[14px\]|shadow-sm|bg-white|#[0-9a-fA-F]{6}\b/,
      );
    });
  });

  it("é agnóstico de tenant: outra UF e série de 2017 a 2027", async () => {
    loadVisaoGeralDataMock.mockResolvedValue(
      makeRaw({
        portalSlug: "outra_cidade_prefeitura",
        context: {
          currentYear: 2027,
          selectedYear: 2027,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
        portalConfig: {
          displayName: "Outra Cidade",
          uf: "MG",
          dataExtracao: "2027-12-31",
          dataExtracaoDate: new Date("2027-12-31"),
        },
      }),
    );
    const { container } = render(
      await VisaoGeralPage({
        params: Promise.resolve({ portalSlug: "outra_cidade_prefeitura" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText(/Dados de 2027/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Porci[uú]ncula|Natividade/);
  });
});
