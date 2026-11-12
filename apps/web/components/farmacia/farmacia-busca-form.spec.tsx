import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { FarmaciaBuscaForm } from "./farmacia-busca-form";

vi.mock("next/form", () => ({
  default: (props: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form data-next-form="true" {...props} />
  ),
}));

describe("FarmaciaBuscaForm", () => {
  it("formulario GET com campo q obrigatorio e minimo de 2 caracteres", () => {
    render(<FarmaciaBuscaForm action="/portal_x/farmacia" />);
    const form = screen.getByRole("form", { name: "Busca de remédios" });
    expect(form).toHaveAttribute("action", "/portal_x/farmacia");
    expect(form).toHaveAttribute("data-next-form", "true");
    const campo = screen.getByPlaceholderText("Qual remédio você procura?");
    expect(campo).toHaveAttribute("name", "q");
    expect(campo).toBeRequired();
    expect(campo).toHaveAttribute("minlength", "2");
  });

  it("preenche o valor padrao e expoe o botao de busca", () => {
    render(<FarmaciaBuscaForm action="/x" defaultValue="dipirona" />);
    expect(screen.getByDisplayValue("dipirona")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("mostra o link Limpar busca apenas quando limparHref e informado", () => {
    const { rerender } = render(<FarmaciaBuscaForm action="/x" />);
    expect(screen.queryByRole("link", { name: "Limpar busca" })).toBeNull();
    rerender(
      <FarmaciaBuscaForm
        action="/x"
        defaultValue="dipirona"
        limparHref="/portal_x/farmacia"
      />,
    );
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/portal_x/farmacia",
    );
  });
});
