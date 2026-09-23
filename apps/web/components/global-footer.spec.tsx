import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobalFooter } from "./global-footer";

describe("GlobalFooter", () => {
  it("renderiza link 'Termos de Uso' apontando para /termos", () => {
    render(<GlobalFooter />);
    const link = screen.getByRole("link", { name: /termos de uso/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/termos");
  });

  it("renderiza link 'Política de Privacidade' apontando para /privacidade", () => {
    render(<GlobalFooter />);
    const link = screen.getByRole("link", { name: /política de privacidade/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/privacidade");
  });

  it("os links institucionais não têm target=_blank (são internos)", () => {
    render(<GlobalFooter />);
    const termosLink = screen.getByRole("link", { name: /termos de uso/i });
    const privacidadeLink = screen.getByRole("link", {
      name: /política de privacidade/i,
    });
    expect(termosLink).not.toHaveAttribute("target", "_blank");
    expect(privacidadeLink).not.toHaveAttribute("target", "_blank");
  });
});
