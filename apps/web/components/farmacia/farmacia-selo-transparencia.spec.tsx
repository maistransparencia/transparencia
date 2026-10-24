import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaSeloTransparencia } from "./farmacia-selo-transparencia";

describe("FarmaciaSeloTransparencia", () => {
  it("exibe a data de atualizacao quando informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao="2026-01-10" />);
    expect(screen.getByText(/Lista de estoque/)).toHaveTextContent(
      "Lista de estoque atualizada em 10/01/2026",
    );
  });

  it("omite a data quando nao informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao={null} />);
    expect(screen.getByText(/Lista de estoque/)).toHaveTextContent(
      "Lista de estoque do Ministério da Saúde",
    );
  });
});
