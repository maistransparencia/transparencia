import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AprendizadoEtapa,
  EducacaoViewModel,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoAprendizadoSection } from "./educacao-aprendizado-section";

vi.mock("./educacao-historico-section", () => ({
  EducacaoHistoricoSection: () => <div data-testid="historico" />,
}));

const etapa = (parcial: Partial<AprendizadoEtapa>): AprendizadoEtapa => ({
  etapaEnsino: "anosIniciais",
  titulo: "Anos Iniciais (1º ao 5º ano)",
  notaIdeb: 6.1,
  anoApuracao: 2023,
  metaIdeb: 6,
  mediaEstadual: 5.2,
  mediaEstadualLabel: "Média da rede pública (UF)",
  atingiuMeta: true,
  notaAnterior: 5.7,
  anoAnterior: 2021,
  variacaoPontos: 0.4,
  classificacao: {
    posicao: 18,
    total: 92,
    variacaoPosicoes: 0,
    redesComparadas: 92,
    totalCicloAnterior: 92,
  },
  ...parcial,
});

const renderizar = (
  iniciais: Partial<AprendizadoEtapa> = {},
  finais: Partial<AprendizadoEtapa> = {},
) =>
  render(
    <EducacaoAprendizadoSection
      aprendizado={{
        anosIniciais: etapa(iniciais),
        anosFinais: etapa({
          etapaEnsino: "anosFinais",
          titulo: "Anos Finais (6º ao 9º ano)",
          notaIdeb: 4.9,
          metaIdeb: 5.5,
          atingiuMeta: false,
          ...finais,
        }),
      }}
      historico={{} as EducacaoViewModel["historico"]}
      initialEtapa="anosIniciais"
    />,
  );

describe("EducacaoAprendizadoSection", () => {
  it("mostra a barra com a meta em cada etapa e o seletor/gráfico seguem na seção", () => {
    renderizar();
    const barras = screen.getAllByRole("meter");
    expect(barras).toHaveLength(2);
    expect(barras[0].getAttribute("aria-valuetext")).toMatch(/meta do MEC 6,0/);
    expect(screen.getByTestId("historico")).toBeTruthy();
  });

  it("mantém nota (com ciclo anterior), classificação e meta, nessa ordem", () => {
    renderizar();
    const secao = screen.getByRole("region", {
      name: "Aprendizado dos alunos",
    });
    const rotulos = Array.from(secao.querySelectorAll("dt")).map(
      (dt) => dt.textContent,
    );
    expect(rotulos.slice(0, 3)).toEqual([
      "Nota do IDEB",
      "Classificação entre as redes municipais do estado",
      "Meta do MEC para 2023",
    ]);
    expect(secao.textContent).toMatch(/ciclo anterior 5,7 em 2021/);
  });

  it("não usa fonte mono nos valores", () => {
    const { container } = renderizar();
    expect(container.innerHTML).not.toMatch(/font-mono|numeric/);
  });

  it("meta atingida e abaixo da meta aparecem em texto, com ícone", () => {
    renderizar();
    const secao = screen.getByRole("region", {
      name: "Aprendizado dos alunos",
    });
    expect(within(secao).getByText("meta atingida").className).toContain(
      "text-ok-text",
    );
    expect(within(secao).getByText("abaixo da meta").className).toContain(
      "text-danger-text",
    );
  });

  it("sem meta definida não mostra situação nem barra", () => {
    renderizar(
      { metaIdeb: null, atingiuMeta: null },
      { metaIdeb: null, atingiuMeta: null },
    );
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.queryByText("meta atingida")).toBeNull();
    expect(screen.queryByText("abaixo da meta")).toBeNull();
  });

  it("variação de posição: sem indicador quando não mudou, vermelho quando caiu", () => {
    const { container, rerender } = renderizar();
    const dentroDeClassificacao = () =>
      Array.from(container.querySelectorAll("dt")).find((dt) =>
        dt.textContent?.startsWith("Classificação"),
      )?.nextElementSibling as HTMLElement;
    expect(dentroDeClassificacao().querySelector(".text-ok-text")).toBeNull();
    expect(
      dentroDeClassificacao().querySelector(".text-danger-text"),
    ).toBeNull();
    rerender(
      <EducacaoAprendizadoSection
        aprendizado={{
          anosIniciais: etapa({
            classificacao: {
              posicao: 41,
              total: 92,
              variacaoPosicoes: -3,
              redesComparadas: 92,
              totalCicloAnterior: 92,
            },
          }),
          anosFinais: etapa({}),
        }}
        historico={{} as EducacaoViewModel["historico"]}
        initialEtapa="anosIniciais"
      />,
    );
    expect(
      dentroDeClassificacao().querySelector(".text-danger-text")?.textContent,
    ).toBe("3");
  });
});
