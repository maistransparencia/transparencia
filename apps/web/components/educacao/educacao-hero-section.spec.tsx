import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  AlunosRedeView,
  AprendizadoEtapa,
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoHeroSection } from "./educacao-hero-section";

const semMinimo = {
  limite: null,
  percentualAplicado: null,
  resultado: "sem_dado" as const,
  baseLegal: null,
  urlBaseLegal: null,
};

const minimosBase: MinimosLegaisView = {
  ano: 2024,
  parcial: false,
  periodo: 6,
  semDadoSiope: false,
  mde: {
    limite: 25,
    percentualAplicado: 27.5,
    resultado: "cumpriu",
    baseLegal: "CF/88 Art. 212 e Art. 212-A",
    urlBaseLegal: "https://www.planalto.gov.br/constituicao",
  },
  fundebProfissionais: {
    limite: 70,
    percentualAplicado: 65,
    resultado: "abaixo",
    baseLegal: "Lei 14.113/2020 Art. 26",
    urlBaseLegal: "https://www.planalto.gov.br/l14113",
  },
};

const execucao: EducacaoExecucaoAnoView = {
  ano: 2024,
  empenhado: 1_000_000,
  liquidado: 900_000,
  pago: 800_000,
  pagoSemPessoal: 500_000,
  temDados: true,
};

const valorPorAlunoBase: ValorPorAlunoView = {
  ano: 2024,
  valor: 11000,
  parcial: false,
  periodo: 6,
  semValorCausa: null,
  anoAnterior: 2023,
  variacaoValor: 1000,
  variacaoPercentual: 10,
  serie: [
    { ano: 2023, valor: 10000, parcial: false, periodo: 6 },
    { ano: 2024, valor: 11000, parcial: false, periodo: 6 },
  ],
};

const alunosBase: AlunosRedeView = {
  total: 1971,
  educacaoInfantil: 668,
  ensinoFundamental: 1303,
  anoCenso: 2023,
};

const aprendizadoBase: AprendizadoEtapa = {
  etapaEnsino: "anosIniciais",
  titulo: "Anos Iniciais (1º ao 5º ano)",
  pergunta: "Como vai o ensino do 1º ao 5º ano?",
  notaIdeb: 6.2,
  anoApuracao: 2023,
  mediaEstadual: 5.2,
  mediaEstadualLabel: "Média da rede pública (UF)",
  mediaNacional: 5.7,
  mediaNacionalLabel: "Média da rede pública do Brasil",
  variacaoMediaEstadual: 0.3,
  notaAnterior: 5.8,
  anoAnterior: 2021,
  variacaoPontos: 0.4,
  classificacao: null,
};

const aprendizadoFinaisBase: AprendizadoEtapa = {
  ...aprendizadoBase,
  etapaEnsino: "anosFinais",
  titulo: "Anos Finais (6º ao 9º ano)",
  pergunta: "Como vai o ensino do 6º ao 9º ano?",
  notaIdeb: 5.1,
  mediaEstadual: 4.8,
  notaAnterior: 5.1,
  variacaoPontos: 0,
};

const comIniciais = (iniciais: Partial<AprendizadoEtapa>) => ({
  anosIniciais: { ...aprendizadoBase, ...iniciais },
  anosFinais: aprendizadoFinaisBase,
});

type Props = Partial<Parameters<typeof EducacaoHeroSection>[0]>;

const elemento = (props: Props = {}) => (
  <EducacaoHeroSection
    ano={2024}
    isCurrentYear={false}
    partialPeriod=""
    minimosLegais={minimosBase}
    execucao={execucao}
    portalUrl="https://transparencia.exemplo.gov.br/"
    valorPorAluno={valorPorAlunoBase}
    alunosRede={alunosBase}
    aprendizado={comIniciais({})}
    {...props}
  />
);
const renderizar = (props: Props = {}) => render(elemento(props));

const destaqueMinimo = () => screen.getByTestId("destaque-minimo");
const destaqueIdeb = () => screen.getByTestId("destaque-ideb-anosIniciais");

describe("EducacaoHeroSection: escopo do exercício", () => {
  it("rotula o grupo dos mínimos com o exercício, sem ano no título", () => {
    renderizar();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Educação: quanto a Prefeitura investe e se as crianças aprendem",
    );
    expect(screen.getByText("Dados de 2024")).toBeInTheDocument();
  });

  it("ano em andamento traz o sufixo parcial no rótulo do exercício", () => {
    renderizar({ isCurrentYear: true, partialPeriod: "janeiro a junho" });
    expect(
      screen.getByText("Dados de 2024 (parcial, janeiro a junho)"),
    ).toBeInTheDocument();
  });
});

describe("EducacaoHeroSection: mínimo constitucional", () => {
  it("destaca o título e o percentual grande, com o selo Cumprido ao lado", () => {
    renderizar();
    const bloco = destaqueMinimo();
    expect(
      within(bloco).getByText(
        /^A Prefeitura (aplica|aplicou) o mínimo em educação em \d{4}\?$/,
      ),
    ).toBeTruthy();
    expect(within(bloco).getByText("Aplicado: 27,50%")).toBeTruthy();
    expect(within(bloco).getByText("Exigido por lei: 25%")).toBeTruthy();
    expect(within(bloco).getByText("Cumprido")).toBeTruthy();
    expect(bloco.querySelector(".stat-value-lg")?.textContent).toBe("27,50%");
    expect(
      within(bloco).getByText(/A Constituição exige no mínimo 25%/),
    ).toBeTruthy();
    expect(within(bloco).queryByText(/Cumpriu o mínimo/)).toBeNull();
    expect(
      within(bloco).getByRole("meter").getAttribute("aria-valuetext"),
    ).toMatch(/cumpriu o mínimo/);
  });

  it("não usa panel em volta nem faixa cinza nos destaques", () => {
    renderizar();
    const area = screen.getByTestId("educacao-resumo-destaque");
    expect(
      area.querySelector("[data-testid='destaque-minimo'] .panel"),
    ).toBeNull();
    expect(area.innerHTML).not.toMatch(/bg-line|bg-page|rounded/);
  });

  it("mostra a barra com o marcador vindo do limite, nunca literal", () => {
    renderizar({
      minimosLegais: {
        ...minimosBase,
        mde: { ...minimosBase.mde, limite: 30 },
      },
    });
    const barra = within(destaqueMinimo()).getByRole("meter");
    expect(barra.getAttribute("aria-valuenow")).toBe("27.5");
    expect(barra.getAttribute("aria-valuetext")).toMatch(/mínimo de 30%/);
  });

  it("abaixo do mínimo fala em indício, nunca em irregularidade", () => {
    const { container } = renderizar({
      minimosLegais: {
        ...minimosBase,
        mde: {
          ...minimosBase.mde,
          resultado: "abaixo",
          percentualAplicado: 20,
        },
      },
    });
    expect(
      within(destaqueMinimo()).getByText(
        /indício a ser esclarecido pela Prefeitura/,
      ),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/irregular|fraude|descumpr/i);
  });

  it("ano em andamento fica parcial, sem veredito e sem ícone de relógio", () => {
    const { container } = renderizar({
      minimosLegais: {
        ...minimosBase,
        parcial: true,
        periodo: 3,
        mde: { ...minimosBase.mde, resultado: "parcial" },
        fundebProfissionais: {
          ...minimosBase.fundebProfissionais,
          resultado: "parcial",
        },
      },
    });
    const bloco = destaqueMinimo();
    expect(within(bloco).getByText(/até o 3º bimestre de 2024/)).toBeTruthy();
    expect(within(bloco).queryByText(/Ano em andamento/)).toBeNull();
    expect(within(bloco).queryByText(/Cumpriu o mínimo/)).toBeNull();
    expect(container.querySelector("svg.lucide-clock")).toBeNull();
  });

  it("sem dado do SIOPE mostra traço, a causa e nenhuma barra do mínimo", () => {
    renderizar({
      minimosLegais: {
        ...minimosBase,
        semDadoSiope: true,
        mde: semMinimo,
        fundebProfissionais: semMinimo,
      },
    });
    const bloco = destaqueMinimo();
    expect(bloco.querySelector(".stat-value-lg")?.textContent).toBe("—");
    expect(
      within(bloco).getByText(/Sem dado publicado para 2024/),
    ).toBeTruthy();
    expect(within(bloco).queryByRole("meter")).toBeNull();
  });

  it("percentual em branco no SIOPE diz que a Prefeitura não informou", () => {
    renderizar({
      minimosLegais: {
        ...minimosBase,
        mde: semMinimo,
        fundebProfissionais: semMinimo,
      },
    });
    expect(
      screen.getAllByText(/A Prefeitura não informou o percentual de 2024/)
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("EducacaoHeroSection: IDEB", () => {
  it("destaca a nota grande, a variação e a barra com as médias estadual e nacional", () => {
    renderizar();
    const bloco = destaqueIdeb();
    expect(bloco.querySelector(".stat-value-lg")?.textContent).toContain("6,2");
    expect(
      within(bloco).getByText("Como vai o ensino do 1º ao 5º ano?"),
    ).toBeTruthy();
    expect(
      within(bloco).getByText("Nota do IDEB 2023, de 0 a 10."),
    ).toBeTruthy();
    expect(
      within(bloco).getByText(
        /A nota subiu 0,4 pontos desde 2021; a média estadual subiu 0,3 pontos\./,
      ),
    ).toBeTruthy();
    const barra = within(bloco).getByRole("meter");
    expect(barra.getAttribute("aria-valuemax")).toBe("10");
    expect(
      within(bloco).getByText("Média da rede pública (UF): 5,2"),
    ).toBeTruthy();
    expect(
      within(bloco).getByText("Média da rede pública do Brasil: 5,7"),
    ).toBeTruthy();
    expect(within(bloco).queryByText(/Meta/)).toBeNull();
    expect(barra.getAttribute("aria-valuetext")).toMatch(
      /Média da rede pública \(UF\) 5,2; Média da rede pública do Brasil 5,7/,
    );
    expect(within(bloco).getByTestId("threshold-meter-marker").style.left).toBe(
      "52%",
    );
    expect(
      Number.parseFloat(
        within(bloco).getByTestId("threshold-meter-secondary-marker").style
          .left,
      ),
    ).toBeCloseTo(57);
  });

  it("variação sobe em ok-text, cai em danger-text e some quando não mudou", () => {
    const { container, rerender } = renderizar();
    expect(
      destaqueIdeb().querySelector(".stat-value-lg .text-ok-text"),
    ).not.toBeNull();
    rerender(
      elemento({
        aprendizado: comIniciais({ variacaoPontos: -0.3, notaAnterior: 6.5 }),
      }),
    );
    expect(
      destaqueIdeb().querySelector(".stat-value-lg .text-danger-text"),
    ).not.toBeNull();
    expect(screen.getByText(/A nota caiu 0,3 pontos desde 2021/)).toBeTruthy();
    rerender(
      elemento({
        aprendizado: comIniciais({ variacaoPontos: 0, notaAnterior: 6.2 }),
      }),
    );
    expect(
      destaqueIdeb().querySelector(".stat-value-lg .text-ok-text"),
    ).toBeNull();
    expect(
      destaqueIdeb().querySelector(".stat-value-lg .text-danger-text"),
    ).toBeNull();
    expect(container.textContent).not.toMatch(/desde 2021/);
  });

  it("sem médias a barra do IDEB aparece sem marcadores e sem nota mostra traço e a causa", () => {
    const { rerender } = renderizar({
      aprendizado: comIniciais({ mediaEstadual: null, mediaNacional: null }),
    });
    expect(within(destaqueIdeb()).getByRole("meter")).toBeTruthy();
    expect(within(destaqueIdeb()).queryByText(/Média da rede/)).toBeNull();
    expect(
      within(destaqueIdeb()).queryByTestId("threshold-meter-marker"),
    ).toBeNull();
    expect(
      within(destaqueIdeb()).queryByTestId("threshold-meter-secondary-marker"),
    ).toBeNull();
    rerender(
      elemento({
        aprendizado: comIniciais({
          notaIdeb: null,
          anoApuracao: null,
          variacaoPontos: null,
        }),
      }),
    );
    expect(within(destaqueIdeb()).getByText(/Sem nota apurada/)).toBeTruthy();
  });
});

describe("EducacaoHeroSection: indicadores de apoio", () => {
  it("põe o Fundeb ao lado do mínimo, com tom pela posição e barra com o mínimo legal", () => {
    const { rerender } = renderizar();
    const indicador = screen.getByTestId("indicador-fundeb");
    expect(
      within(indicador).getByText(
        /^Quanto do Fundeb (vai|foi) para o salário dos profissionais da educação em \d{4}\?$/,
      ),
    ).toBeTruthy();
    expect(within(indicador).getByText("Destinado: 65,00%")).toBeTruthy();
    expect(within(indicador).getByText("Mínimo legal: 70%")).toBeTruthy();
    expect(within(indicador).getByText("65,00%").className).toContain(
      "text-warn-text",
    );
    expect(
      within(indicador).getByText(/A lei exige no mínimo 70%/),
    ).toBeTruthy();
    expect(
      within(indicador).getByText(/indício a ser esclarecido/),
    ).toBeTruthy();
    expect(within(indicador).getByRole("meter")).toBeTruthy();
    rerender(
      elemento({
        minimosLegais: {
          ...minimosBase,
          fundebProfissionais: {
            ...minimosBase.fundebProfissionais,
            percentualAplicado: 80,
            resultado: "cumpriu",
          },
        },
      }),
    );
    const cumprido = screen.getByTestId("indicador-fundeb");
    expect(within(cumprido).getByText("80,00%").className).toContain(
      "text-brand-text",
    );
    expect(within(cumprido).getByText("Cumprido")).toBeTruthy();
  });

  it("anos finais sem nota mostram traço e a causa", () => {
    renderizar({
      aprendizado: {
        anosIniciais: aprendizadoBase,
        anosFinais: {
          ...aprendizadoFinaisBase,
          notaIdeb: null,
          anoApuracao: null,
        },
      },
    });
    const finais = screen.getByTestId("destaque-ideb-anosFinais");
    expect(finais.querySelector(".stat-value-lg")?.textContent).toBe("—");
    expect(within(finais).getByText("Sem nota apurada")).toBeTruthy();
  });

  it("Fundeb também diz o período no ano em andamento", () => {
    renderizar({
      minimosLegais: { ...minimosBase, parcial: true, periodo: 3 },
    });
    expect(
      within(screen.getByTestId("indicador-fundeb")).getByText(
        /até o 3º bimestre de 2024/,
      ),
    ).toBeTruthy();
  });

  it("a legenda dos alunos sempre soma 100%", () => {
    renderizar({
      alunosRede: {
        ...alunosBase,
        total: 1000,
        educacaoInfantil: 335,
        ensinoFundamental: 665,
      },
    });
    const indicador = screen.getByTestId("indicador-alunos-rede");
    expect(within(indicador).getByText(/335 Infantil \(34%\)/)).toBeTruthy();
    expect(within(indicador).getByText(/665 Fundamental \(66%\)/)).toBeTruthy();
  });

  it("IDEB dos anos finais aparece ao lado dos iniciais", () => {
    renderizar();
    const finais = screen.getByTestId("destaque-ideb-anosFinais");
    expect(
      within(finais).getByText("Como vai o ensino do 6º ao 9º ano?"),
    ).toBeTruthy();
    expect(finais.querySelector(".stat-value-lg")?.textContent).toBe("5,1");
  });

  it("valor por aluno: variação com palavra, nota da inflação e Ver detalhes em linha própria", () => {
    renderizar();
    const indicador = screen.getByTestId("indicador-valor-por-aluno");
    expect(within(indicador).getByText(/Subiu R\$ 1\.000/)).toBeTruthy();
    expect(within(indicador).getByText(/R\$ da época/)).toBeTruthy();
    const link = within(indicador).getByRole("button", {
      name: "Ver detalhes: valor por aluno",
    });
    expect(link.className).toContain("block");
  });

  it("valor por aluno: ano parcial não compara e sem valor mostra a causa", () => {
    const { rerender } = renderizar({
      valorPorAluno: { ...valorPorAlunoBase, parcial: true, periodo: 4 },
    });
    expect(screen.getByText(/Ano em andamento, sem comparação/)).toBeTruthy();
    rerender(
      elemento({
        valorPorAluno: {
          ...valorPorAlunoBase,
          valor: null,
          semValorCausa: "nao_informado_ao_fnde",
          serie: [],
        },
      }),
    );
    expect(
      screen.getByText(/Não informado ao governo federal em 2024/),
    ).toBeTruthy();
  });

  it("Ver detalhes do valor por aluno abre a série com a fonte no rodapé", () => {
    renderizar();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalhes: valor por aluno" }),
    );
    const modal = screen.getByRole("dialog");
    expect(
      within(modal).getByText("Investimento por aluno ano a ano"),
    ).toBeTruthy();
    expect(
      within(modal).getByText(/SIOPE, sistema do governo federal/),
    ).toBeTruthy();
  });

  it("alunos na rede: só a divisão; a exclusão de etapas, o Censo e o detalhe ficam no modal", () => {
    const { rerender } = renderizar();
    const indicador = screen.getByTestId("indicador-alunos-rede");
    expect(within(indicador).getByText("1.971")).toBeTruthy();
    expect(within(indicador).getByText(/668 Infantil \(34%\)/)).toBeTruthy();
    expect(within(indicador).queryByText(/Não inclui ensino médio/)).toBeNull();
    expect(within(indicador).queryByText(/Censo Escolar/)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ver detalhes: alunos na rede municipal",
      }),
    );
    const modal = screen.getByRole("dialog");
    expect(
      within(modal).getByText(/Censo Escolar 2023, INEP/, { selector: "span" }),
    ).toBeTruthy();
    expect(
      within(modal).getByText(/Matrículas de maio do ano do Censo/),
    ).toBeTruthy();
    expect(within(modal).getByText(/creche e pré-escola/)).toBeTruthy();
    expect(
      within(modal).getByText(
        /não inclui ensino médio, educação de jovens e adultos \(EJA\) nem educação/i,
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(modal).getByRole("button", { name: "Fechar modal" }),
    );
    rerender(elemento({ alunosRede: null }));
    expect(screen.queryByTestId("indicador-alunos-rede")).toBeNull();
  });
});

describe("EducacaoHeroSection: lei, fonte e gasto", () => {
  it("põe Lei e Fonte numa linha de legenda, com as leis em nova aba (Regra 20)", () => {
    renderizar();
    const lei = screen.getByRole("link", { name: /CF\/88 Art. 212/ });
    expect(lei.getAttribute("href")).toBe(
      "https://www.planalto.gov.br/constituicao",
    );
    expect(lei.getAttribute("target")).toBe("_blank");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen
        .getByRole("link", { name: /Lei 14.113\/2020 Art. 26/ })
        .getAttribute("href"),
    ).toBe("https://www.planalto.gov.br/l14113");
    expect(
      screen
        .getByRole("link", { name: /SIOPE, sistema do governo federal/ })
        .getAttribute("href"),
    ).toBe("https://www.fnde.gov.br/siope/");
    expect(
      screen
        .getByRole("link", { name: /execução orçamentária da Prefeitura/ })
        .getAttribute("href"),
    ).toBe("https://transparencia.exemplo.gov.br/");
    expect(screen.getAllByText("Leis:")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Lei 4.320\/1964/ })).toBeTruthy();
  });

  it("o gasto fica à vista, sem Ver detalhes, com reservado, liquidado e pago", () => {
    renderizar();
    const gasto = screen.getByTestId("gasto-educacao");
    expect(
      within(gasto).getByText(
        "Quanto do que a Prefeitura reservou para a educação já foi pago?",
      ),
    ).toBeTruthy();
    expect(within(gasto).getByText(/Reservado \(empenhado\)/)).toBeTruthy();
    expect(within(gasto).getByText(/Reservar não é pagar/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Ver detalhes: gasto em educação" }),
    ).toBeNull();
  });

  it("mostra o resumo das emendas no topo só com os números que o portal tem", () => {
    renderizar({
      emendasResumo: {
        quantidade: 3,
        totalAutorizado: 4_000_000,
        totalConfirmadaNaReceita: 2_000_000,
        totalEmpenhado: 1_000_000,
        percentualConfirmadaNaReceita: 50,
        percentualEmpenhado: 25,
      },
    });
    const resumo = screen.getByTestId("emendas-resumo-educacao");
    expect(
      within(resumo).getByText(
        "Quanto os deputados e senadores destinaram à educação?",
      ),
    ).toBeTruthy();
    expect(
      within(resumo)
        .getAllByRole("term")
        .map((termo) => termo.textContent),
    ).toEqual([
      "Autorizado em emendas",
      "Confirmada na receita",
      "Empenhado no cadastro",
    ]);
    expect(within(resumo).getByText(/50,00% do autorizado/)).toBeTruthy();
    expect(within(resumo).getByText(/25,00% do autorizado/)).toBeTruthy();
    expect(within(resumo).queryByText(/sem destino/i)).toBeNull();
    expect(
      within(resumo).getByRole("link", { name: "Ver emendas" }),
    ).toHaveAttribute("href", "#emendas-educacao");
  });

  it("sem emendas na educação não mostra o resumo", () => {
    renderizar({ emendasResumo: null });
    expect(screen.queryByTestId("emendas-resumo-educacao")).toBeNull();
  });
});
