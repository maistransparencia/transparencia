import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaResumoCard } from "./farmacia-resumo-card";

const detailUrl = "/portal_x/saude/farmacia";

describe("FarmaciaResumoCard", () => {
  it("conforme: badge Em conformidade", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    expect(screen.getByText("Em conformidade")).toBeInTheDocument();
  });

  it("conforme: campo de busca que leva a rota com q", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    expect(
      screen.getByRole("form", { name: "Busca de medicamentos" }),
    ).toHaveAttribute("action", detailUrl);
    expect(
      screen.getByPlaceholderText("Qual remédio você procura?"),
    ).toHaveAttribute("name", "q");
  });

  it("conforme: 'Busque no estoque' leva a pagina de estoque", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    expect(
      screen.getByRole("link", { name: "Busque no estoque" }),
    ).toHaveAttribute("href", detailUrl);
  });

  it("apagao: faixa com Ver detalhes e sem botoes de acao civica", () => {
    render(<FarmaciaResumoCard status="apagao" detailUrl={detailUrl} />);
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute(
      "href",
      detailUrl,
    );
    expect(screen.getByText("Sem informação de estoque")).toBeInTheDocument();
    expect(screen.getByText(/Lei 14\.654\/2023/)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByLabelText("Qual remédio você procura?")).toBeNull();
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
