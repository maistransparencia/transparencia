import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FarmaciaIndiceChips } from "./farmacia-indice-chips";

const chips = ["A", "B", "C"].map((letra) => ({
  codigo: letra,
  rotulo: letra,
  href: `/p/farmacia?letra=${letra}#indice`,
  ativo: false,
}));

function medidas(valores: {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}) {
  Object.entries(valores).forEach(([chave, valor]) => {
    vi.spyOn(
      HTMLElement.prototype,
      chave as "scrollWidth",
      "get",
    ).mockReturnValue(valor);
  });
}

const ALTURA_CABECALHO = 56;
const ALTURA_FAIXA = 40;

function medirAlturas() {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.hasAttribute("data-cabecalho-movel")
        ? ALTURA_CABECALHO
        : ALTURA_FAIXA;
    },
  );
}

function definirScrollY(valor: number) {
  Object.defineProperty(window, "scrollY", {
    value: valor,
    configurable: true,
  });
}

function renderizarComListaAbaixo() {
  return render(
    <>
      <FarmaciaIndiceChips chips={chips} />
      <div data-testid="lista" />
    </>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  definirScrollY(0);
});

describe("FarmaciaIndiceChips", () => {
  it("sem letras escondidas nao mostra setas", () => {
    medidas({ scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    render(<FarmaciaIndiceChips chips={chips} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("mostra a seta das proximas letras e rola ao clicar", () => {
    medidas({ scrollWidth: 900, clientWidth: 300, scrollLeft: 0 });
    const rolar = vi.fn();
    HTMLElement.prototype.scrollBy = rolar;
    render(<FarmaciaIndiceChips chips={chips} />);
    expect(
      screen.queryByRole("button", { name: "Ver letras anteriores" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver próximas letras" }),
    );
    expect(rolar).toHaveBeenCalledWith({ left: 210 });
  });

  it("mostra a seta das letras anteriores quando ja rolou", () => {
    medidas({ scrollWidth: 900, clientWidth: 300, scrollLeft: 600 });
    render(<FarmaciaIndiceChips chips={chips} />);
    expect(
      screen.getByRole("button", { name: "Ver letras anteriores" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver próximas letras" }),
    ).toBeNull();
  });

  describe("faixa fixa abaixo do cabecalho movel", () => {
    function adicionarCabecalho() {
      const cabecalho = document.createElement("div");
      cabecalho.setAttribute("data-cabecalho-movel", "");
      document.body.appendChild(cabecalho);
    }

    it("cola a faixa na altura do cabecalho e acompanha o observador", () => {
      medirAlturas();
      let aoRedimensionar: () => void = () => {};
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: () => void) {
            aoRedimensionar = callback;
          }
          observe() {}
          disconnect() {}
        },
      );
      adicionarCabecalho();
      const { container } = renderizarComListaAbaixo();
      const faixaFixa = container.firstElementChild as HTMLElement;
      expect(faixaFixa.style.top).toBe(`${ALTURA_CABECALHO}px`);

      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(
        72,
      );
      act(() => aoRedimensionar());
      expect(faixaFixa.style.top).toBe("72px");
    });

    it("sem cabecalho movel mantem a faixa no topo", () => {
      medirAlturas();
      const { container } = renderizarComListaAbaixo();
      expect((container.firstElementChild as HTMLElement).style.top).toBe(
        "0px",
      );
    });
  });

  describe("rolagem ao trocar de letra", () => {
    const LISTA_ACIMA_DA_JANELA = -300;
    const LISTA_ABAIXO_DA_JANELA = 500;

    function prepararRolagem(opcoes: {
      scrollY: number;
      topoLista: number;
      reduzirMovimento?: boolean;
    }) {
      medirAlturas();
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        top: opcoes.topoLista,
      } as DOMRect);
      definirScrollY(opcoes.scrollY);
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({ matches: opcoes.reduzirMovimento ?? false }),
      );
      const rolarPagina = vi.fn();
      window.scrollTo = rolarPagina as unknown as typeof window.scrollTo;
      return rolarPagina;
    }

    it("volta ao inicio da lista logo abaixo da faixa quando a pagina esta rolada", () => {
      const rolarPagina = prepararRolagem({
        scrollY: 2000,
        topoLista: LISTA_ACIMA_DA_JANELA,
      });
      renderizarComListaAbaixo();
      fireEvent.click(screen.getByRole("link", { name: "B" }));
      expect(rolarPagina).toHaveBeenCalledWith({
        top: LISTA_ACIMA_DA_JANELA + 2000 - ALTURA_FAIXA,
        behavior: "smooth",
      });
    });

    it("rola sem animacao quando o usuario reduz movimento", () => {
      const rolarPagina = prepararRolagem({
        scrollY: 2000,
        topoLista: LISTA_ACIMA_DA_JANELA,
        reduzirMovimento: true,
      });
      renderizarComListaAbaixo();
      fireEvent.click(screen.getByRole("link", { name: "B" }));
      expect(rolarPagina).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: "auto" }),
      );
    });

    it("nao rola quando a pagina ja esta acima do inicio da lista", () => {
      const rolarPagina = prepararRolagem({
        scrollY: 100,
        topoLista: LISTA_ABAIXO_DA_JANELA,
      });
      renderizarComListaAbaixo();
      fireEvent.click(screen.getByRole("link", { name: "B" }));
      expect(rolarPagina).not.toHaveBeenCalled();
    });
  });
});
