import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FarmaciaIndiceAz,
  type FarmaciaIndiceViewModel,
} from "./farmacia-indice-az";

const LETRAS_DE_TESTE = ["A", "B", "C"];

function indice(
  parcial: Partial<FarmaciaIndiceViewModel> = {},
): FarmaciaIndiceViewModel {
  return {
    chips: [
      {
        codigo: "todas",
        rotulo: "A–Z",
        href: "/p/farmacia#indice",
        ativo: true,
      },
      ...LETRAS_DE_TESTE.map((letra) => ({
        codigo: letra,
        rotulo: letra,
        href: letra === "C" ? null : `/p/farmacia?letra=${letra}#indice`,
        ativo: false,
      })),
    ],
    modo: "resumo",
    letraSelecionada: null,
    rotuloLetraSelecionada: null,
    totalUnidades: 7,
    grupos: [
      {
        letra: "A",
        rotuloLetra: "A",
        rotuloTotal: "24 remédios",
        hrefTodos: "/p/farmacia?letra=A#indice",
        rotuloTodos: "Ver todos com A",
        medicamentos: [
          {
            nomeMedicamento: "Amoxicilina",
            unidadesComEstoque: 3,
            semLoteValido: null,
            href: "/p/farmacia?q=Amoxicilina#resultados",
          },
        ],
      },
    ],
    rotuloTotalLetra: "24 remédios",
    rotuloProgresso: "Mostrando 1 de 3 letras",
    hrefMais: "/p/farmacia?letras=7#indice",
    rotuloMais: "Ver mais 2 letras",
    hrefResumo: "/p/farmacia#indice",
    ...parcial,
  };
}

describe("FarmaciaIndiceAz", () => {
  it("remedio so com lote vencido nao e link e oferece o pedido de esclarecimento", () => {
    const base = indice();
    const grupo = base.grupos[0];
    const medicamento = grupo?.medicamentos[0];
    if (!grupo || !medicamento) throw new Error("fixture sem medicamento");
    render(
      <FarmaciaIndiceAz
        idSecao="indice"
        indice={{
          ...base,
          grupos: [
            {
              ...grupo,
              medicamentos: [
                {
                  ...medicamento,
                  nomeMedicamento: "Captopril",
                  href: null,
                  semLoteValido: {
                    rotulo: "Sem lote dentro da validade na lista",
                    caminhoCompartilhamento:
                      "/p/farmacia?q=Captopril#resultados",
                    pedido: { texto: "Pedido", textoWhatsApp: "Zap" },
                  },
                },
                medicamento,
              ],
            },
          ],
        }}
      />,
    );
    expect(
      screen.getAllByText("Sem lote dentro da validade na lista"),
    ).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Captopril/ })).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Pedir esclarecimento sobre Captopril",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Amoxicilina/ }),
    ).toBeInTheDocument();
  });

  it("marca A–Z, desabilita letra sem itens e linka as demais", () => {
    render(<FarmaciaIndiceAz indice={indice()} idSecao="indice" />);
    const nav = screen.getByRole("navigation", { name: "Índice alfabético" });
    expect(within(nav).getByText("A–Z")).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(nav).getByRole("link", { name: "B" })).toHaveAttribute(
      "href",
      "/p/farmacia?letra=B#indice",
    );
    expect(within(nav).queryByRole("link", { name: "C" })).toBeNull();
    expect(within(nav).getByText("C")).toHaveAttribute("aria-disabled", "true");
  });

  it("mostra o grupo da letra com link para ver todos e disponibilidade por unidade", () => {
    render(<FarmaciaIndiceAz indice={indice()} idSecao="indice" />);
    expect(
      screen.getByRole("link", { name: "Ver todos com A" }),
    ).toHaveAttribute("href", "/p/farmacia?letra=A#indice");
    expect(screen.getByText("24 remédios")).toBeInTheDocument();
    expect(screen.getByText("3 de 7 unidades")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Amoxicilina/ })).toHaveAttribute(
      "href",
      "/p/farmacia?q=Amoxicilina#resultados",
    );
  });

  it("oferece 'Ver mais' com o progresso e some quando nao ha mais letras", () => {
    const { rerender } = render(
      <FarmaciaIndiceAz indice={indice()} idSecao="indice" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mostrando 1 de 3 letras",
    );
    expect(
      screen.getByRole("link", { name: "Ver mais 2 letras" }),
    ).toHaveAttribute("href", "/p/farmacia?letras=7#indice");
    rerender(
      <FarmaciaIndiceAz indice={indice({ hrefMais: null })} idSecao="indice" />,
    );
    expect(screen.queryByRole("link", { name: /Ver mais/ })).toBeNull();
  });

  it("letra selecionada lista os itens e permite voltar para A–Z", () => {
    render(
      <FarmaciaIndiceAz
        indice={indice({
          modo: "letra",
          letraSelecionada: "A",
          rotuloLetraSelecionada: "A",
          rotuloProgresso: "Mostrando 1 de 24",
          rotuloMais: "Ver mais 23 remédios",
          hrefMais: "/p/farmacia?letra=A&itens=50#indice",
        })}
        idSecao="indice"
      />,
    );
    expect(screen.getByText("Remédios com A")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para A–Z" }),
    ).toHaveAttribute("href", "/p/farmacia#indice");
    expect(
      screen.getByRole("link", { name: "Ver mais 23 remédios" }),
    ).toBeInTheDocument();
  });

  it("letra sem remédios mostra aviso com Limpar filtros", () => {
    render(
      <FarmaciaIndiceAz
        indice={indice({
          modo: "letra",
          letraSelecionada: "W",
          rotuloLetraSelecionada: "W",
          grupos: [],
        })}
        idSecao="indice"
      />,
    );
    expect(
      screen.getByText("Nenhum remédio começa com W."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Limpar filtros" }),
    ).toHaveAttribute("href", "/p/farmacia#indice");
  });

  it("com busca por texto mostra so os chips", () => {
    render(
      <FarmaciaIndiceAz
        indice={indice({ modo: "busca", grupos: [] })}
        idSecao="indice"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Índice alfabético" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
