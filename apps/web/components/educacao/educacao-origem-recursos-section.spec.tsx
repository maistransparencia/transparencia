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
    anoParcial: null,
    mesReferencia: null,
    totalArrecadado: fontes.reduce((acc, f) => acc + f.totalArrecadado, 0),
    fontes,
  };
}

describe("EducacaoOrigemRecursosSection", () => {
  it("mostra título, descrição dinâmica e um indicador por fonte com valor compacto e percentual", () => {
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={makeOrigem([FUNDEB, PNAE])}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "O que entrou" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Em 2025, entraram R\$ 18,8 mi no Fundo Municipal de Educação\. 61 de cada R\$ 100 vêm da fonte "FUNDEB"\..*Não inclui o dinheiro que a própria Prefeitura repassa ao Fundo\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("composicao-recursos-bar").getAttribute("aria-label"),
    ).toMatch(/FUNDEB 61%/);
    const botao = screen.getByTestId("fonte-card-fundeb");
    expect(botao).toHaveAccessibleName("Ver detalhes: FUNDEB");
    expect(screen.getByText("R$ 18,5 mi")).toBeInTheDocument();
    expect(screen.getByText(/61% do que entrou/)).toBeInTheDocument();
  });

  it("mostra fontes sem valor no ano como traço, sem gatilho de detalhes", () => {
    render(
      <EducacaoOrigemRecursosSection origemRecursos={makeOrigem([FUNDEB])} />,
    );
    expect(screen.queryByTestId("fonte-card-pnate")).toBeNull();
    expect(
      screen.getAllByText("sem receita no exercício").length,
    ).toBeGreaterThan(0);
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
  });

  it("mostra o ano a ano com barras quadradas e a composição em tabela", () => {
    render(
      <EducacaoOrigemRecursosSection origemRecursos={makeOrigem([FUNDEB])} />,
    );
    fireEvent.click(screen.getByTestId("fonte-card-fundeb"));
    const dialog = screen.getByRole("dialog");
    const anoAno = within(dialog).getByRole("region", { name: "Ano a ano" });
    expect(anoAno.innerHTML).not.toMatch(/rounded/);
    const tabela = within(dialog).getByRole("table");
    expect(
      within(tabela).getByRole("columnheader", { name: "Natureza da receita" }),
    ).toBeInTheDocument();
    expect(
      within(tabela).getByText("Transferências de recursos do FUNDEB"),
    ).toBeInTheDocument();
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

  it("cita as duas leis na base legal dos royalties", () => {
    const royalties: EducacaoOrigemRecursoDTO = {
      grupoFonte: "royalties",
      totalArrecadado: 200_000,
      percentualTotal: 2,
      historicoAnual: [{ ano: 2025, totalArrecadado: 200_000 }],
      composicao: [],
    };
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={makeOrigem([FUNDEB, royalties])}
      />,
    );
    fireEvent.click(screen.getByTestId("fonte-card-royalties"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("link", { name: /Lei nº 12.858\/2013/ }),
    ).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12858.htm",
    );
    expect(
      within(dialog).getByRole("link", { name: /Lei nº 7.990\/1989/ }),
    ).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l7990.htm",
    );
  });

  it("marca o ano em andamento como parcial na descrição, nos indicadores e no modal", () => {
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={{
          ...makeOrigem([FUNDEB]),
          anoParcial: 2025,
          mesReferencia: 7,
        }}
      />,
    );
    expect(
      screen.getByText(/Ano em andamento: valores acumulados até julho\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/61% do que entrou · parcial/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("fonte-card-fundeb"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/em 2025 \(parcial\)/)).toBeInTheDocument();
    expect(within(dialog).getByText("parcial")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "2025: valores acumulados até julho; o ano ainda não terminou.",
      ),
    ).toBeInTheDocument();
  });

  it("barra empilhada: três maiores com cor própria e as demais somadas num segmento cinza, sem cor repetida", () => {
    const fonte = (
      grupoFonte: EducacaoOrigemRecursoDTO["grupoFonte"],
      totalArrecadado: number,
      percentualTotal: number,
    ): EducacaoOrigemRecursoDTO => ({
      ...PNAE,
      grupoFonte,
      totalArrecadado,
      percentualTotal,
    });
    render(
      <EducacaoOrigemRecursosSection
        origemRecursos={makeOrigem([
          fonte("fundeb", 900, 86),
          fonte("salario_educacao", 80, 8),
          fonte("pnae", 50, 3),
          fonte("pnate", 20, 2),
          fonte("royalties", 10, 1),
        ])}
      />,
    );
    const barra = screen.getByTestId("composicao-recursos-bar");
    expect(barra).toHaveAttribute("role", "img");
    expect(barra.className).toContain("bg-track");
    expect(barra.outerHTML).not.toMatch(/rounded/);
    const segmentos = Array.from(barra.children).map((c) => c.className);
    expect(segmentos).toHaveLength(4);
    const cores = segmentos.map((c) => c.match(/bg-[\w-]+/)?.[0]);
    expect(new Set(cores).size).toBe(4);
    expect(cores[3]).toBe("bg-mute3");
    expect(barra.getAttribute("aria-label")).toMatch(/Demais fontes 3%/);
    expect(screen.getByText(/Demais fontes · 3%/)).toBeTruthy();
  });
});
