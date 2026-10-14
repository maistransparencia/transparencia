import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTextoReivindicacao,
  ObrasCivicDisclaimer,
} from "./obras-civic-disclaimer";

describe("ObrasCivicDisclaimer Component", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
    vi.clearAllMocks();
  });

  it("renderiza o disclaimer com título e orientações sobre ObrasGov.br", () => {
    render(
      <ObrasCivicDisclaimer municipioNome="Porciúncula" municipioUf="RJ" />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Notou obras sem contrato ou licitação vinculados?",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Controle Social & Transparência Pública"),
    ).toBeInTheDocument();

    const linkObrasGov = screen.getAllByRole("link", { name: /ObrasGov\.br/i });
    expect(linkObrasGov.length).toBeGreaterThan(0);
    expect(linkObrasGov[0]).toHaveAttribute(
      "href",
      "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html",
    );
  });

  it("exibe links para as legislações oficiais da LAI e Nova Lei de Licitações (Regra 20)", () => {
    render(<ObrasCivicDisclaimer municipioNome="Porciúncula" />);

    const linkLai = screen.getByRole("link", {
      name: /Lei nº 12\.527\/2011 \(LAI\)/i,
    });
    expect(linkLai).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm",
    );
    expect(linkLai).toHaveAttribute("target", "_blank");

    const linkNllc = screen.getByRole("link", {
      name: /Lei nº 14\.133\/2021/i,
    });
    expect(linkNllc).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
    );
    expect(linkNllc).toHaveAttribute("target", "_blank");
  });

  it("monta o texto com o município e estado corretos", () => {
    const texto = buildTextoReivindicacao("Porciúncula", "RJ");
    expect(texto).toContain("Porciúncula/RJ");
    expect(texto).toContain("ObrasGov.br");
    expect(texto).toContain("Prezado(a) Vereador(a) / Gabinete Parlamentar");
  });

  it("copia a mensagem para a área de transferência ao clicar no botão de cópia", async () => {
    render(
      <ObrasCivicDisclaimer municipioNome="Porciúncula" municipioUf="RJ" />,
    );

    const botaoCopiar = screen.getByRole("button", {
      name: /Copiar mensagem para cobrar vereador ou autoridade/i,
    });
    expect(botaoCopiar).toBeInTheDocument();

    fireEvent.click(botaoCopiar);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Porciúncula/RJ"),
    );

    expect(await screen.findByText("Mensagem copiada!")).toBeInTheDocument();
    expect(
      screen.getByText(/Texto formal copiado com sucesso!/i),
    ).toBeInTheDocument();
  });
});
