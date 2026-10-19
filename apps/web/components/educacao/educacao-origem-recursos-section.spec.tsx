import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  EducacaoOrigemRecursoDTO,
  EducacaoOrigemRecursosDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { EducacaoOrigemRecursosSection } from "./educacao-origem-recursos-section";

const FUNDEB: EducacaoOrigemRecursoDTO = {
  grupoFonte: "fundeb",
  totalArrecadado: 18_500_000,
  percentualTotal: 61.4,
  historicoAnual: [
    { ano: 2024, totalArrecadado: 15_000_000 },
    { ano: 2025, totalArrecadado: 18_500_000 },
  ],
  composicao: [
    {
      codigoNatureza: "1751.50",
      descricaoNatureza: "Transferências de recursos do FUNDEB",
      totalArrecadado: 18_500_000,
    },
  ],
};

const PNAE: EducacaoOrigemRecursoDTO = {
  grupoFonte: "pnae",
  totalArrecadado: 300_000,
  percentualTotal: 1,
  historicoAnual: [{ ano: 2025, totalArrecadado: 300_000 }],
  composicao: [],
};

function makeOrigem(
  fontes: EducacaoOrigemRecursoDTO[],
): EducacaoOrigemRecursosDTO {
  return {
    portalSlug: "portal_teste",
    ano: 2025,
    nomeOrgao: "Fundo Municipal de Educação",
    anoMin: 2024,
    anoMax: 2025,
    totalArrecadado: fontes.reduce((acc, f) => acc + f.totalArrecadado, 0),
    fontes,
  };
}

describe("EducacaoOrigemRecursosSection", () => {
  it("mostra título, subtítulo dinâmico, barra e cards com valor compacto e percentual", () => {
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={makeOrigem([FUNDEB, PNAE])}
      />,
    );
    expect(screen.getByText("De onde vem o dinheiro")).toBeInTheDocument();
    expect(
      screen.getByText("Receitas do Fundo Municipal de Educação em 2025"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Não inclui o aporte da Prefeitura ao fundo."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("composicao-recursos-bar")).toHaveAttribute(
      "role",
      "img",
    );
    const card = screen.getByTestId("fonte-card-fundeb");
    expect(card).toHaveAccessibleName("FUNDEB, R$ 18,5 mi, 61% do total");
    expect(within(card).getByText("Ver detalhes ›")).toBeInTheDocument();
  });

  it("esmaece e desabilita fontes sem valor no ano", () => {
    render(
      <EducacaoOrigemRecursosSection origemRecursos={makeOrigem([FUNDEB])} />,
    );
    const vazio = screen.getByTestId("fonte-card-pnate");
    expect(vazio).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(vazio);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre o modal com ano a ano, composição e base legal ao tocar no card", () => {
    render(
      <EducacaoOrigemRecursosSection origemRecursos={makeOrigem([FUNDEB])} />,
    );
    fireEvent.click(screen.getByTestId("fonte-card-fundeb"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Ano a ano (2024–2025)"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Transferências de recursos do FUNDEB"),
    ).toBeInTheDocument();
    const lei = within(dialog).getByRole("link", {
      name: /Lei nº 14.113\/2020/,
    });
    expect(lei).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14113.htm",
    );
    expect(lei).toHaveAttribute("target", "_blank");
    expect(
      within(dialog).getByRole("link", { name: "painel fiscal acima" }),
    ).toHaveAttribute("href", "#painel-fiscal-educacao");
  });

  it("destaca o ano selecionado no histórico e na composição do modal", () => {
    render(
      <EducacaoOrigemRecursosSection origemRecursos={makeOrigem([FUNDEB])} />,
    );
    fireEvent.click(screen.getByTestId("fonte-card-fundeb"));
    const dialog = screen.getByRole("dialog");
    const anoAno = within(dialog).getByRole("region", { name: "Ano a ano" });
    const itens = within(anoAno).getAllByRole("listitem");
    expect(itens[0]).not.toHaveAttribute("aria-current");
    expect(itens[1]).toHaveAttribute("aria-current", "true");
    expect(itens[1]).toHaveTextContent("2025");
    expect(
      within(dialog).getByText("De que são compostos em 2025"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/^R\$.* em 2025$/)).toBeInTheDocument();
  });

  it("mostra frase neutra quando não há receitas no exercício", () => {
    render(<EducacaoOrigemRecursosSection origemRecursos={makeOrigem([])} />);
    expect(
      screen.getByText(
        "Nenhuma receita registrada para a Educação no exercício.",
      ),
    ).toBeInTheDocument();
  });

  it("mostra a fonte Não detalhada com frase explicativa, sem composição nem base legal", () => {
    const naoDetalhado: EducacaoOrigemRecursoDTO = {
      grupoFonte: "nao_detalhado",
      totalArrecadado: 500_000,
      percentualTotal: 5,
      historicoAnual: [{ ano: 2025, totalArrecadado: 500_000 }],
      composicao: [],
    };
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={makeOrigem([FUNDEB, naoDetalhado])}
      />,
    );
    fireEvent.click(screen.getByTestId("fonte-card-nao_detalhado"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "Parte da receita foi informada pelo portal sem indicar a origem.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Ano a ano (2025)")).toBeInTheDocument();
    expect(within(dialog).queryByText("De que são compostos")).toBeNull();
    expect(within(dialog).queryByText(/Base legal/)).toBeNull();
  });
});
