import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaResumoCard } from "./farmacia-resumo-card";

const detailUrl = "/portal_x/saude/farmacia";

describe("FarmaciaResumoCard", () => {
  it("conforme: campo de busca que leva a rota com q", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    expect(
      screen.getByRole("form", { name: "Busca de medicamentos" }),
    ).toHaveAttribute("action", detailUrl);
    expect(
      screen.getByPlaceholderText("Qual remédio você procura?"),
    ).toHaveAttribute("name", "q");
  });

  it("apagao: faixa com Ver detalhes e sem botoes de acao civica", () => {
    render(<FarmaciaResumoCard status="apagao" detailUrl={detailUrl} />);
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute(
      "href",
      detailUrl,
    );
    expect(screen.queryByText(/Copiar Requerimento/)).toBeNull();
    expect(screen.queryByText(/WhatsApp/)).toBeNull();
  });

  it("indisponivel: nao renderiza nada", () => {
    const { container } = render(
      <FarmaciaResumoCard status="indisponivel" detailUrl={detailUrl} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
