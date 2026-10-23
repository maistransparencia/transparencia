import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FarmaciaResumoCard } from "./farmacia-resumo-card";

const detailUrl = "/portal_x/saude/farmacia";

describe("FarmaciaResumoCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "clipboard");
  });

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

  it("apagao: contexto com link seguro da lei, Ver detalhes e botoes de acao", () => {
    render(
      <FarmaciaResumoCard
        status="apagao"
        detailUrl={detailUrl}
        requerimento="texto"
        textoWhatsApp="alerta"
      />,
    );
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute(
      "href",
      detailUrl,
    );
    expect(screen.getByText("Sem informação de estoque")).toBeInTheDocument();
    const lei = screen.getByRole("link", { name: /Lei 14\.654\/2023/ });
    expect(lei).toHaveAttribute("target", "_blank");
    expect(lei).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Copiar Requerimento/ }),
    ).toHaveClass("min-h-11");
    expect(
      screen.getByRole("button", { name: /Compartilhar no WhatsApp/ }),
    ).toHaveClass("min-h-11");
    expect(document.body.textContent?.toLowerCase()).not.toContain("apagão");
  });

  it("apagao: compartilha o link da rota da Farmacia no WhatsApp", () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    render(
      <FarmaciaResumoCard
        status="apagao"
        detailUrl={detailUrl}
        requerimento="texto"
        textoWhatsApp="alerta"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Compartilhar no WhatsApp/ }),
    );
    const alvo = decodeURIComponent(String(abrir.mock.calls[0]?.[0]));
    expect(alvo).toContain(`alerta ${window.location.origin}${detailUrl}`);
    abrir.mockRestore();
  });

  it("apagao: copia o requerimento", async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: escrever } });
    render(
      <FarmaciaResumoCard
        status="apagao"
        detailUrl={detailUrl}
        requerimento="texto"
        textoWhatsApp="alerta"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Copiar Requerimento/ }),
    );
    await waitFor(() => expect(escrever).toHaveBeenCalledWith("texto"));
    expect(
      await screen.findByText("Requerimento copiado."),
    ).toBeInTheDocument();
  });

  it("indisponivel: nao renderiza nada, mesmo com textos", () => {
    const { container } = render(
      <FarmaciaResumoCard
        status="indisponivel"
        detailUrl={detailUrl}
        requerimento="texto"
        textoWhatsApp="alerta"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("conforme: sem botoes de acao civica", () => {
    render(
      <FarmaciaResumoCard
        status="conforme"
        detailUrl={detailUrl}
        requerimento="texto"
        textoWhatsApp="alerta"
      />,
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
