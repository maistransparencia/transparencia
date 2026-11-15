import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { FarmaciaBuscaDestaque } from "./farmacia-busca-destaque";

vi.mock("next/form", () => ({
  default: (props: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form data-next-form="true" {...props} />
  ),
}));

const exemplos = [
  { nomePrincipioAtivo: "Losartana", href: "/p/farmacia?q=Losartana" },
];

describe("FarmaciaBuscaDestaque", () => {
  it("formulario GET com campo q e chips de remédios comuns", () => {
    render(<FarmaciaBuscaDestaque action="/p/farmacia" exemplos={exemplos} />);
    const form = screen.getByRole("form", { name: "Busca de remédios" });
    expect(form).toHaveAttribute("data-next-form", "true");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q");
    expect(screen.getByRole("link", { name: "Losartana" })).toHaveAttribute(
      "href",
      "/p/farmacia?q=Losartana",
    );
  });

  it("limpar busca e um link para a rota sem ?q= quando ha termo", () => {
    render(<FarmaciaBuscaDestaque action="/p/farmacia" exemplos={[]} />);
    expect(screen.queryByRole("link", { name: "Limpar busca" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dip" },
    });
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/p/farmacia",
    );
  });

  it("limpar busca aparece com defaultValue", () => {
    render(
      <FarmaciaBuscaDestaque
        action="/p/farmacia"
        defaultValue="dip"
        exemplos={[]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Limpar busca" }),
    ).toBeInTheDocument();
  });

  it("sem exemplos nao mostra o rotulo de remédios comuns", () => {
    render(<FarmaciaBuscaDestaque action="/p/farmacia" exemplos={[]} />);
    expect(screen.queryByText("Remédios comuns:")).toBeNull();
  });

  it("acompanha o termo quando o defaultValue muda (via key do pai)", () => {
    const { rerender } = render(
      <FarmaciaBuscaDestaque
        key="a"
        action="/p/farmacia"
        defaultValue="a"
        exemplos={[]}
      />,
    );
    rerender(
      <FarmaciaBuscaDestaque
        key="b"
        action="/p/farmacia"
        defaultValue="b"
        exemplos={[]}
      />,
    );
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("b");
  });
});

describe("FarmaciaBuscaDestaque ancora de resultados", () => {
  it("envia o formulario para a secao de resultados", () => {
    render(<FarmaciaBuscaDestaque action="/p/farmacia" exemplos={[]} />);
    expect(
      screen.getByRole("form", { name: "Busca de remédios" }),
    ).toHaveAttribute("action", "/p/farmacia#resultados");
  });
});
