import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaDireitoRemedios } from "./farmacia-direito-remedios";

describe("FarmaciaDireitoRemedios", () => {
  it("responde as duas perguntas do cidadão sem afirmar que pode ou não retirar em outra cidade", () => {
    render(<FarmaciaDireitoRemedios />);
    expect(
      screen.getByText("Quem pode retirar remédio na Farmácia SUS?"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Quem é atendido pelo SUS e tem receita/),
    ).toBeTruthy();
    expect(
      screen.getByText("Posso retirar remédio em outra cidade?"),
    ).toBeTruthy();
    expect(screen.getByText(/Depende do remédio e das regras/)).toBeTruthy();
  });

  it("linka as normas citadas para o texto oficial do Planalto", () => {
    render(<FarmaciaDireitoRemedios />);
    const lei = screen.getByRole("link", { name: /Lei 8\.080\/1990/ });
    const decreto = screen.getByRole("link", { name: /Decreto 7\.508\/2011/ });
    expect(lei.getAttribute("href")).toBe(
      "https://www.planalto.gov.br/ccivil_03/leis/l8080.htm",
    );
    expect(decreto.getAttribute("href")).toContain("planalto.gov.br");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
