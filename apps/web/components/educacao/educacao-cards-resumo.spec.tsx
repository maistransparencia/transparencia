import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  AlunosRedeView,
  AprendizadoEtapa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoCardsResumo } from "./educacao-cards-resumo";

const valorPorAluno: ValorPorAlunoView = {
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

const alunosRede: AlunosRedeView = {
  total: 1971,
  educacaoInfantil: 668,
  ensinoFundamental: 1303,
  anoCenso: 2023,
};

const aprendizado: AprendizadoEtapa = {
  etapaEnsino: "anosIniciais",
  titulo: "Anos Iniciais (1º ao 5º ano)",
  notaIdeb: 6.2,
  anoApuracao: 2023,
  metaIdeb: 6,
  atingiuMeta: true,
  notaAnterior: 5.8,
  anoAnterior: 2021,
  variacaoPontos: 0.4,
  classificacao: null,
};

const renderizar = (
  props: Partial<{
    valorPorAluno: ValorPorAlunoView;
    alunosRede: AlunosRedeView | null;
    aprendizado: AprendizadoEtapa;
  }> = {},
) =>
  render(
    <EducacaoCardsResumo
      valorPorAluno={valorPorAluno}
      alunosRede={alunosRede}
      aprendizado={aprendizado}
      {...props}
    />,
  );

describe("EducacaoCardsResumo", () => {
  it("mostra três cards panel-top lado a lado e nenhum link de âncora", () => {
    const { container } = renderizar();
    expect(container.querySelectorAll(".panel-top")).toHaveLength(3);
    expect(screen.queryByText("Ver o detalhe")).toBeNull();
    expect(container.querySelector("a[href^='#']")).toBeNull();
  });

  it("valor por aluno: variação com palavra e a nota da inflação", () => {
    renderizar();
    expect(
      screen.getByText("Quanto a Prefeitura investe por aluno?"),
    ).toBeTruthy();
    expect(screen.getByText(/subiu R\$ 1\.000/)).toBeTruthy();
    expect(screen.getByText(/sem correção pela inflação/)).toBeTruthy();
  });

  it("valor por aluno: ano parcial não compara e sem valor mostra a causa", () => {
    const { rerender } = renderizar({
      valorPorAluno: { ...valorPorAluno, parcial: true, periodo: 4 },
    });
    expect(
      screen.getByText(/não se compara com anos já fechados/),
    ).toBeTruthy();
    rerender(
      <EducacaoCardsResumo
        valorPorAluno={{
          ...valorPorAluno,
          valor: null,
          semValorCausa: "nao_informado_ao_fnde",
          serie: [],
        }}
        alunosRede={alunosRede}
        aprendizado={aprendizado}
      />,
    );
    expect(
      screen.getByText(/a Prefeitura não informou o valor de 2024/),
    ).toBeTruthy();
  });

  it("Ver detalhes do valor por aluno abre a série com lei e fonte no rodapé", () => {
    renderizar();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalhes: valor por aluno" }),
    );
    const modal = screen.getByRole("dialog");
    expect(
      within(modal).getByText("Investimento por aluno ano a ano"),
    ).toBeTruthy();
    expect(
      within(modal).getAllByText(/sem correção pela inflação/).length,
    ).toBe(1);
    expect(within(modal).getByText(/SIOPE \(FNDE\)/)).toBeTruthy();
  });

  it("alunos na rede: divisão, exclusões e Censo com o ano real", () => {
    renderizar();
    expect(screen.getByText("Alunos na rede municipal")).toBeTruthy();
    expect(screen.getByText("1.971")).toBeTruthy();
    expect(screen.getByText(/668 na educação infantil/)).toBeTruthy();
    expect(screen.getByText(/1\.303 no ensino fundamental/)).toBeTruthy();
    expect(
      screen.getByText(/não inclui ensino médio, EJA nem educação especial/),
    ).toBeTruthy();
    expect(screen.getByText(/Censo Escolar 2023, INEP/)).toBeTruthy();
  });

  it("sem matrícula o card de alunos não aparece", () => {
    const { container } = renderizar({ alunosRede: null });
    expect(screen.queryByText("Alunos na rede municipal")).toBeNull();
    expect(container.querySelectorAll(".panel-top")).toHaveLength(2);
  });

  it("IDEB: diz a faixa, a nota, a variação contra o ciclo anterior e a barra com a meta", () => {
    renderizar();
    expect(screen.getByText("As crianças estão aprendendo?")).toBeTruthy();
    expect(
      screen.getByText(/IDEB · Anos Iniciais \(1º ao 5º ano\)/),
    ).toBeTruthy();
    expect(screen.getByText(/apurada em 2023/)).toBeTruthy();
    expect(screen.getByText(/subiu 0,4 pontos em relação a 2021/)).toBeTruthy();
    const barra = screen.getByRole("meter", { name: /IDEB/ });
    expect(barra.getAttribute("aria-valuenow")).toBe("6.2");
    expect(barra.getAttribute("aria-valuemax")).toBe("10");
    expect(screen.getByText("meta 6,0")).toBeTruthy();
  });

  it("IDEB: variação sobe em ok-text, cai em danger-text e some quando não mudou", () => {
    const { container, rerender } = renderizar();
    expect(container.querySelector(".text-ok-text")).not.toBeNull();
    rerender(
      <EducacaoCardsResumo
        valorPorAluno={valorPorAluno}
        alunosRede={alunosRede}
        aprendizado={{
          ...aprendizado,
          variacaoPontos: -0.3,
          notaAnterior: 6.5,
        }}
      />,
    );
    expect(container.querySelector(".text-danger-text")).not.toBeNull();
    expect(screen.getByText(/caiu 0,3 pontos em relação a 2021/)).toBeTruthy();
    rerender(
      <EducacaoCardsResumo
        valorPorAluno={valorPorAluno}
        alunosRede={alunosRede}
        aprendizado={{ ...aprendizado, variacaoPontos: 0, notaAnterior: 6.2 }}
      />,
    );
    expect(container.querySelector(".text-ok-text")).toBeNull();
    expect(container.querySelector(".text-danger-text")).toBeNull();
    expect(screen.queryByText(/em relação a 2021/)).toBeNull();
  });

  it("IDEB: sem nota mostra traço e sem meta não desenha a barra", () => {
    const { rerender } = renderizar({
      aprendizado: { ...aprendizado, metaIdeb: null, atingiuMeta: null },
    });
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.getByText(/sem meta definida pelo MEC/)).toBeTruthy();
    rerender(
      <EducacaoCardsResumo
        valorPorAluno={valorPorAluno}
        alunosRede={alunosRede}
        aprendizado={{
          ...aprendizado,
          notaIdeb: null,
          anoApuracao: null,
          variacaoPontos: null,
        }}
      />,
    );
    expect(screen.getByText(/sem nota do IDEB apurada/)).toBeTruthy();
  });
});
