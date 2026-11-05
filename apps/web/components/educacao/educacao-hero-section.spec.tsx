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
  notaIdeb: 6.2,
  anoApuracao: 2023,
  metaIdeb: 6,
  mediaEstadual: 5.2,
  mediaEstadualLabel: "Média da rede pública (UF)",
  atingiuMeta: true,
  notaAnterior: 5.8,
  anoAnterior: 2021,
  variacaoPontos: 0.4,
  classificacao: null,
};

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
    aprendizado={aprendizadoBase}
    {...props}
  />
);
const renderizar = (props: Props = {}) => render(elemento(props));

const destaqueMinimo = () => screen.getByTestId("destaque-minimo");
const destaqueIdeb = () => screen.getByTestId("destaque-ideb");

describe("EducacaoHeroSection: mínimo constitucional", () => {
  it("destaca a pergunta e o percentual grande; o cumpriu fica só na barra", () => {
    renderizar();
    const bloco = destaqueMinimo();
    expect(
      within(bloco).getByText(
        "A Prefeitura aplica o mínimo exigido em educação?",
      ),
    ).toBeTruthy();
    expect(bloco.querySelector(".stat-value-lg")?.textContent).toBe("27,50%");
    expect(within(bloco).getByText(/A lei exige pelo menos 25%/)).toBeTruthy();
    expect(within(bloco).queryByText(/Cumpriu o mínimo/)).toBeNull();
    expect(
      within(bloco).getByRole("meter").getAttribute("aria-valuetext"),
    ).toMatch(/cumpriu o mínimo/);
  });

  it("não usa panel em volta nem faixa cinza nos destaques", () => {
    renderizar();
    const area = screen.getByTestId("educacao-resumo-destaque");
    expect(
      within(destaqueMinimo()).queryByText("Fundeb", { exact: false }),
    ).toBeNull();
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
    const aviso = within(bloco).getByText(/Ano em andamento/);
    const barra = within(bloco).getByRole("meter");
    expect(
      barra.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
      within(bloco).getByText(/sem dado publicado para 2024/),
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
      screen.getAllByText(/a Prefeitura não informou o percentual de 2024/)
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("EducacaoHeroSection: IDEB dos anos iniciais", () => {
  it("destaca a pergunta, a nota grande, a faixa, a variação e a barra com a meta", () => {
    renderizar();
    const bloco = destaqueIdeb();
    expect(
      within(bloco).getByText("As crianças estão aprendendo?"),
    ).toBeTruthy();
    expect(bloco.querySelector(".stat-value-lg")?.textContent).toContain("6,2");
    expect(
      within(bloco).getByText(/IDEB · Anos Iniciais \(1º ao 5º ano\)/),
    ).toBeTruthy();
    expect(
      within(bloco).getByText(
        /subiu 0,4 pontos em relação ao ciclo anterior \(2021\)/,
      ),
    ).toBeTruthy();
    const barra = within(bloco).getByRole("meter");
    expect(barra.getAttribute("aria-valuemax")).toBe("10");
    expect(
      within(bloco).getByText(/Média da rede pública \(UF\): 5,2/),
    ).toBeTruthy();
    expect(barra.getAttribute("aria-valuetext")).toMatch(
      /Média da rede pública \(UF\) 5,2/,
    );
    expect(within(bloco).getByTestId("threshold-meter-marker").style.left).toBe(
      "52%",
    );
  });

  it("variação sobe em ok-text, cai em danger-text e some quando não mudou", () => {
    const { container, rerender } = renderizar();
    expect(destaqueIdeb().querySelector(".text-ok-text")).not.toBeNull();
    rerender(
      elemento({
        aprendizado: {
          ...aprendizadoBase,
          variacaoPontos: -0.3,
          notaAnterior: 6.5,
        },
      }),
    );
    expect(destaqueIdeb().querySelector(".text-danger-text")).not.toBeNull();
    expect(
      screen.getByText(/caiu 0,3 pontos em relação ao ciclo anterior \(2021\)/),
    ).toBeTruthy();
    rerender(
      elemento({
        aprendizado: {
          ...aprendizadoBase,
          variacaoPontos: 0,
          notaAnterior: 6.2,
        },
      }),
    );
    expect(destaqueIdeb().querySelector(".text-ok-text")).toBeNull();
    expect(destaqueIdeb().querySelector(".text-danger-text")).toBeNull();
    expect(container.textContent).not.toMatch(/em relação ao ciclo anterior/);
  });

  it("sem meta a barra do IDEB aparece sem marcador e sem nota mostra traço e a causa", () => {
    const { rerender } = renderizar({
      aprendizado: { ...aprendizadoBase, mediaEstadual: null, metaIdeb: null },
    });
    expect(within(destaqueIdeb()).getByRole("meter")).toBeTruthy();
    expect(
      within(destaqueIdeb()).getByText(/sem meta definida pelo MEC/),
    ).toBeTruthy();
    expect(
      within(destaqueIdeb()).queryByTestId("threshold-meter-marker"),
    ).toBeNull();
    rerender(
      elemento({
        aprendizado: {
          ...aprendizadoBase,
          notaIdeb: null,
          anoApuracao: null,
          variacaoPontos: null,
        },
      }),
    );
    expect(
      within(destaqueIdeb()).getByText(/sem nota do IDEB apurada/),
    ).toBeTruthy();
  });
});

describe("EducacaoHeroSection: indicadores de apoio", () => {
  it("põe o Fundeb dos profissionais num bloco com a pergunta, tom pela posição e barra com o mínimo", () => {
    const { rerender } = renderizar();
    const indicador = screen.getByTestId("indicador-fundeb");
    expect(
      within(indicador).getByText(
        "Quanto do Fundeb vai para os profissionais da educação?",
      ),
    ).toBeTruthy();
    expect(
      within(indicador).getByText(
        /Parte do Fundeb paga aos profissionais da educação\./,
      ),
    ).toBeTruthy();
    expect(within(indicador).getByText("65,00%").className).toContain(
      "text-warn-text",
    );
    expect(
      within(indicador).getByText(
        /A lei exige pelo menos 70% dos recursos do Fundeb/,
      ),
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
    expect(
      within(screen.getByTestId("indicador-fundeb")).getByText("80,00%")
        .className,
    ).toContain("text-ok-text");
  });

  it("valor por aluno: variação com palavra, nota da inflação e Ver detalhes em linha própria", () => {
    renderizar();
    const indicador = screen.getByTestId("indicador-valor-por-aluno");
    expect(within(indicador).getByText(/subiu R\$ 1\.000/)).toBeTruthy();
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
    expect(
      screen.getByText(/parcial: sem comparação com anos fechados/),
    ).toBeTruthy();
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
      screen.getByText(/a Prefeitura não informou o valor de 2024/),
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
    expect(
      within(indicador).getByText(/668 na educação infantil/),
    ).toBeTruthy();
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
    expect(within(modal).getByText(/matriculados em maio/)).toBeTruthy();
    expect(within(modal).getByText(/creche e pré-escola/)).toBeTruthy();
    expect(
      within(modal).getByText(/não inclui ensino médio, EJA nem educação/i),
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
    expect(within(gasto).getByText(/não para o que ela recebe/)).toBeTruthy();
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
