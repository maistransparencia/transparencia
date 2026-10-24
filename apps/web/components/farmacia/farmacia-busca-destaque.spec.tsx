import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaBuscaDestaque } from "./farmacia-busca-destaque";

const exemplos = [
  { nomePrincipioAtivo: "Losartana", href: "/p/saude/farmacia?q=Losartana" },
];

describe("FarmaciaBuscaDestaque", () => {
  it("formulario GET com campo q e chips de mais procurados", () => {
    render(
      <FarmaciaBuscaDestaque action="/p/saude/farmacia" exemplos={exemplos} />,
    );
    const form = screen.getByRole("form", { name: "Busca de medicamentos" });
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q");
    expect(screen.getByRole("link", { name: "Losartana" })).toHaveAttribute(
      "href",
      "/p/saude/farmacia?q=Losartana",
    );
  });

  it("limpar busca e um link para a rota sem ?q= quando ha termo", () => {
    render(<FarmaciaBuscaDestaque action="/p/saude/farmacia" exemplos={[]} />);
    expect(screen.queryByRole("link", { name: "Limpar busca" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dip" },
    });
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/p/saude/farmacia",
    );
  });

  it("limpar busca aparece com defaultValue", () => {
    render(
      <FarmaciaBuscaDestaque
        action="/p/saude/farmacia"
        defaultValue="dip"
        exemplos={[]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Limpar busca" }),
    ).toBeInTheDocument();
  });

  it("sem exemplos nao mostra o rotulo de mais procurados", () => {
    render(<FarmaciaBuscaDestaque action="/p/saude/farmacia" exemplos={[]} />);
    expect(screen.queryByText("Mais procurados:")).toBeNull();
  });

  it("acompanha o termo quando o defaultValue muda (via key do pai)", () => {
    const { rerender } = render(
      <FarmaciaBuscaDestaque
        key="a"
        action="/p/saude/farmacia"
        defaultValue="a"
        exemplos={[]}
      />,
    );
    rerender(
      <FarmaciaBuscaDestaque
        key="b"
        action="/p/saude/farmacia"
        defaultValue="b"
        exemplos={[]}
      />,
    );
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("b");
  });
});

describe("FarmaciaBuscaDestaque ancora de resultados", () => {
  it("envia o formulario para a secao de resultados", () => {
    render(<FarmaciaBuscaDestaque action="/p/saude/farmacia" exemplos={[]} />);
    expect(
      screen.getByRole("form", { name: "Busca de medicamentos" }),
    ).toHaveAttribute("action", "/p/saude/farmacia#resultados");
  });
});
