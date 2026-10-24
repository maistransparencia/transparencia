import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaSeloTransparencia } from "./farmacia-selo-transparencia";

describe("FarmaciaSeloTransparencia", () => {
  it("exibe a data de atualizacao quando informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao="2026-01-10" />);
    expect(screen.getByText(/Estoque oficial/)).toHaveTextContent("10/01/2026");
  });

  it("omite a data quando nao informada", () => {
    render(<FarmaciaSeloTransparencia dataAtualizacao={null} />);
    expect(screen.getByText(/Estoque oficial/)).not.toHaveTextContent("·");
  });
});
