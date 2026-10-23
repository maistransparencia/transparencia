import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { FarmaciaResumoCard } from "./farmacia-resumo-card";

const detailUrl = "/portal_x/saude/farmacia";

describe("FarmaciaResumoCard", () => {
  it("conforme: selo com link para a fonte e subtitulo de busca", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    const fonte = screen.getByRole("link", { name: /BNAFAR\/Hórus/ });
    expect(fonte).toHaveAttribute("href", FONTES_OFICIAIS.bnafar.url);
    expect(fonte).toHaveAttribute("target", "_blank");
    expect(fonte).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByText(/Busque o remédio que você precisa/),
    ).toBeInTheDocument();
  });

  it("conforme: titulo antes do selo na leitura e frase em largura total no mobile", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    const titulo = screen.getByRole("heading", { name: "Farmácia SUS" });
    const selo = screen.getByRole("link", { name: /BNAFAR\/Hórus/ });
    expect(
      titulo.compareDocumentPosition(selo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(/Busque o remédio que você precisa/)).toHaveClass(
      "col-span-2",
      "sm:col-span-1",
    );
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

  it("conforme: frase curta sem link embutido e botao completo no mobile", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    expect(
      screen.queryByRole("link", { name: "Busque no estoque" }),
    ).toBeNull();
    expect(screen.getByText("Buscar no estoque")).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Busca de medicamentos" }),
    ).toHaveAttribute("action", detailUrl);
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
