import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("começa no claro quando o html não tem .dark", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Claro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Escuro" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reflete .dark já presente no html", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Escuro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("escolher Escuro aplica .dark e persiste; Claro remove e grava light", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Escuro" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("mt-tema")).toBe("dark");
    expect(screen.getByRole("button", { name: "Escuro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Claro" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("mt-tema")).toBe("light");
    expect(screen.getByRole("button", { name: "Claro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("troca a classe mesmo quando localStorage lança erro", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("indisponivel");
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Escuro" }));
    expect(document.documentElement).toHaveClass("dark");
  });

  it("usa botões nativos focáveis por teclado", () => {
    render(<ThemeToggle />);
    const botao = screen.getByRole("button", { name: "Escuro" });
    botao.focus();
    expect(botao).toHaveFocus();
    expect(botao.tagName).toBe("BUTTON");
  });
});
