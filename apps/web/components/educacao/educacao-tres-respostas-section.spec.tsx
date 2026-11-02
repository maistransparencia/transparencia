import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  AprendizadoEtapa,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoTresRespostasSection } from "./educacao-tres-respostas-section";

const minimosLegais: MinimosLegaisView = {
  ano: 2024,
  parcial: false,
  periodo: 6,
  semDadoSiope: false,
  mde: {
    limite: 25,
    percentualAplicado: 27,
    resultado: "cumpriu",
    baseLegal: null,
    urlBaseLegal: null,
  },
  fundebProfissionais: {
    limite: 70,
    percentualAplicado: 80,
    resultado: "cumpriu",
    baseLegal: null,
    urlBaseLegal: null,
  },
};

const valorPorAluno: ValorPorAlunoView = {
  ano: 2024,
  valor: 11000,
  parcial: false,
  periodo: 6,
  semValorCausa: null,
  anoAnterior: 2023,
  variacaoValor: 1000,
  variacaoPercentual: 10,
  serie: [],
};

const aprendizado: AprendizadoEtapa = {
  etapaEnsino: "anosIniciais",
  titulo: "Anos iniciais",
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
    minimosLegais: MinimosLegaisView;
    valorPorAluno: ValorPorAlunoView;
    aprendizado: AprendizadoEtapa;
  }> = {},
) =>
  render(
    <EducacaoTresRespostasSection
      minimosLegais={minimosLegais}
      valorPorAluno={valorPorAluno}
      aprendizado={aprendizado}
      {...props}
    />,
  );

describe("EducacaoTresRespostasSection", () => {
  it("mostra veredito, variação, meta e links para os detalhes", () => {
    renderizar();
    expect(screen.getByText(/cumpriu o mínimo/)).toBeTruthy();
    expect(screen.getByText(/subiu/)).toBeTruthy();
    expect(screen.getByText(/meta do MEC: 6,0/)).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: "Ver o detalhe" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["#minimo-exigido", "#valor-por-aluno", "#aprendizado"]);
  });

  it("não dá veredito no ano em andamento", () => {
    renderizar({ minimosLegais: { ...minimosLegais, parcial: true } });
    expect(
      screen.getByText(/o resultado só fica claro quando o ano fechar/),
    ).toBeTruthy();
    expect(screen.queryByText(/cumpriu o mínimo/)).toBeNull();
  });

  it("mostra traço e a causa quando faltam os dados", () => {
    renderizar({
      minimosLegais: {
        ...minimosLegais,
        semDadoSiope: true,
        mde: { ...minimosLegais.mde, percentualAplicado: null },
      },
      valorPorAluno: {
        ...valorPorAluno,
        valor: null,
        semValorCausa: "nao_informado_ao_fnde",
      },
      aprendizado: { ...aprendizado, notaIdeb: null },
    });
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText(/sem dado publicado para 2024/)).toBeTruthy();
    expect(
      screen.getByText(/não informou o valor de 2024 ao governo federal/),
    ).toBeTruthy();
    expect(screen.getByText(/sem nota do IDEB apurada/)).toBeTruthy();
  });
});
