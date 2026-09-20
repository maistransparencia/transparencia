import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TruncatedCellWithModal } from "../truncated-cell-with-modal";

describe("TruncatedCellWithModal", () => {
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
    vi.restoreAllMocks();
  });

  it("deve renderizar texto curto diretamente sem affordance de 'Ver mais'", () => {
    render(
      <TruncatedCellWithModal
        text="Texto curto de teste"
        characterThreshold={100}
      />,
    );

    expect(screen.getByText("Texto curto de teste")).toBeInTheDocument();
    expect(screen.queryByText(/ver mais/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deve renderizar botão 'Ver mais' quando o texto exceder o threshold e abrir modal ao clicar", () => {
    const textoLongo =
      "Contratação de empresa especializada para prestação de serviços continuados de manutenção predial preventiva e corretiva em todas as unidades escolares do município com fornecimento de peças e mão de obra qualificada.";

    render(
      <TruncatedCellWithModal
        text={textoLongo}
        characterThreshold={50}
        modalTitle="Objeto do Contrato"
        modalSubtitle="Pregão 01/2026"
        externalLink={{
          href: "https://comprasnet.gov.br/disputa/123",
          label: "Acessar Sala de Disputa",
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: /ver mais/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Objeto do Contrato")).toBeInTheDocument();
    expect(screen.getByText("Pregão 01/2026")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /acessar sala de disputa/i }),
    ).toHaveAttribute("href", "https://comprasnet.gov.br/disputa/123");
  });

  it("deve copiar o texto completo para o clipboard com feedback visual", async () => {
    const textoLongo =
      "Texto longo para teste de cópia de conteúdo com mais de cinquenta caracteres.";

    render(
      <TruncatedCellWithModal text={textoLongo} characterThreshold={30} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ver mais/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", {
      name: /copiar texto completo/i,
    });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textoLongo);
    await waitFor(() => {
      expect(screen.getByText("Copiado!")).toBeInTheDocument();
    });
  });
});
