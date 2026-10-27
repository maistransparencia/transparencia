import { fireEvent, render, screen } from "@testing-library/react";
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

afterEach(() => {
  vi.restoreAllMocks();
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
});
