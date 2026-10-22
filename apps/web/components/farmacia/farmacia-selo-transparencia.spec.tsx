import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaSeloTransparencia } from "./farmacia-selo-transparencia";

describe("FarmaciaSeloTransparencia", () => {
  it("exibe a data de atualizacao quando informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao="2026-01-10" />);
    expect(screen.getByText(/Estoque Transparente/)).toHaveTextContent(
      /Atualizado em/,
    );
  });

  it("omite a data quando nao informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao={null} />);
    const selo = screen.getByText(/Estoque Transparente/);
    expect(selo).not.toHaveTextContent(/Atualizado em/);
  });
});
