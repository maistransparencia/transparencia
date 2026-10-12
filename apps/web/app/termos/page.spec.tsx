import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermosPage from "./page";

describe("TermosPage (/termos)", () => {
  it("renderiza a página de Termos de Uso com a fonte ObrasGov.br", () => {
    render(<TermosPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /termos de uso/i }),
    ).toBeInTheDocument();

    // Deve incluir o portal ObrasGov.br como fonte oficial de dados
    expect(screen.getByText(/obrasgov\.br/i)).toBeInTheDocument();
  });
});
