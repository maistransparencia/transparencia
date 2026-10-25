import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FarmaciaSusSentinelaBanner } from "./farmacia-sus-sentinela-banner";

const props = {
  leiUrl: "https://www.planalto.gov.br/lei14654",
  leiOrganicaUrl: "https://www.planalto.gov.br/lei8080",
  diasDesdePosicaoMaisRecente: 20,
  requerimento: "texto do requerimento",
  textoWhatsApp: "alerta",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FarmaciaSusSentinelaBanner", () => {
  it("exibe links seguros da lei e os dois botoes de acao", () => {
    render(<FarmaciaSusSentinelaBanner {...props} />);
    const link = screen.getByRole("link", { name: /Lei nº 14\.654\/2023/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("button", {
        name: /Copiar Requerimento de Fiscalização/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Compartilhar no WhatsApp/ }),
    ).toBeInTheDocument();
  });

  it("copia o requerimento", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<FarmaciaSusSentinelaBanner {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Copiar Requerimento/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("copiado"),
    );
    expect(writeText).toHaveBeenCalledWith("texto do requerimento");
  });

  it("mostra erro sem quebrar quando a area de transferencia falha", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("negado"));
    Object.assign(navigator, { clipboard: { writeText } });
    render(<FarmaciaSusSentinelaBanner {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Copiar Requerimento/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível copiar",
      ),
    );
  });

  it("compartilha no WhatsApp a URL sem query string", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    window.history.pushState({}, "", "/portal_x/farmacia?q=dip&unidade=u1");
    render(<FarmaciaSusSentinelaBanner {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Compartilhar no WhatsApp/ }),
    );
    const mensagem = `alerta ${window.location.origin}/portal_x/farmacia`;
    expect(open).toHaveBeenCalledWith(
      `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer",
    );
  });
});
