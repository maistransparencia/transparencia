import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VerDetalhesLink } from "./ver-detalhes-link";

describe("VerDetalhesLink", () => {
  it("é um link pequeno e sublinhado que abre diálogo, com o rótulo padrão", () => {
    const aoAbrir = vi.fn();
    render(<VerDetalhesLink onClick={aoAbrir} />);
    const botao = screen.getByRole("button", { name: "Ver detalhes" });
    expect(botao.className).toContain("text-sm");
    expect(botao.className).toContain("underline");
    expect(botao.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(botao);
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it("aceita context para leitor de tela sem mudar o texto visível", () => {
    render(<VerDetalhesLink onClick={() => {}} context="Salário-educação" />);
    expect(
      screen.getByRole("button", { name: "Ver detalhes: Salário-educação" }),
    ).toBeTruthy();
    expect(screen.getByText("Ver detalhes")).toBeTruthy();
  });

  it("garante o alvo de toque por área, não por altura visual, e não usa mono nem paleta fixa", () => {
    render(<VerDetalhesLink onClick={() => {}} />);
    const classes = screen.getByRole("button").className;
    expect(classes).toContain("after:-inset-y-3");
    expect(classes).not.toMatch(/min-h-|font-mono|slate-|gray-/);
  });
});
