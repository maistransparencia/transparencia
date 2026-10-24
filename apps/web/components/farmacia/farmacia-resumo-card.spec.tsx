import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { FarmaciaResumoCard } from "./farmacia-resumo-card";

const detailUrl = "/portal_x/saude/farmacia";

describe("FarmaciaResumoCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("conforme: selo com link para a fonte e subtitulo de busca", () => {
    render(<FarmaciaResumoCard status="conforme" detailUrl={detailUrl} />);
    const fonte = screen.getByRole("link", { name: /BNAFAR\/Hórus/ });
    expect(fonte).toHaveAttribute("href", urlLegislacao("lei14654"));
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

  const exemplos = [
    {
      codigoPrincipioAtivo: "dipirona",
      nomePrincipioAtivo: "Dipirona",
      href: `${detailUrl}?q=Dipirona`,
    },
    {
      codigoPrincipioAtivo: "acido_acetilsalicilico",
      nomePrincipioAtivo: "Ácido acetilsalicílico",
      href: `${detailUrl}?q=%C3%81cido+acetilsalicílico`,
    },
  ];

  it("conforme: mostra pilulas de exemplo com link para a busca", () => {
    render(
      <FarmaciaResumoCard
        status="conforme"
        detailUrl={detailUrl}
        exemplos={exemplos}
      />,
    );
    expect(screen.getByText("Exemplos:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dipirona" })).toHaveAttribute(
      "href",
      `${detailUrl}?q=Dipirona`,
    );
    expect(
      screen.getByRole("link", { name: "Ácido acetilsalicílico" }),
    ).toBeInTheDocument();
  });

  it("conforme sem exemplos: nao mostra o rotulo", () => {
    render(
      <FarmaciaResumoCard
        status="conforme"
        detailUrl={detailUrl}
        exemplos={[]}
      />,
    );
    expect(screen.queryByText("Exemplos:")).not.toBeInTheDocument();
  });

  it("apagao: nao mostra pilulas de exemplo", () => {
    render(
      <FarmaciaResumoCard
        status="apagao"
        detailUrl={detailUrl}
        exemplos={exemplos}
      />,
    );
    expect(screen.queryByText("Exemplos:")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dipirona" })).toBeNull();
  });
});
