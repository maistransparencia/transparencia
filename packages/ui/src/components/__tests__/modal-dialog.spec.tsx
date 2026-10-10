import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalDialog } from "../modal-dialog";

describe("ModalDialog", () => {
  it("não deve renderizar nada quando isOpen for false", () => {
    render(
      <ModalDialog isOpen={false} onClose={() => {}} title="Título de Teste">
        <p>Conteúdo interno</p>
      </ModalDialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Conteúdo interno")).not.toBeInTheDocument();
  });

  it("deve renderizar título, subtítulo e conteúdo quando isOpen for true", () => {
    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título de Teste"
        subtitle="Subtítulo de apoio"
        badge={<span data-testid="badge-test">Badge</span>}
      >
        <p>Conteúdo interno do modal</p>
      </ModalDialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Título de Teste")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo de apoio")).toBeInTheDocument();
    expect(screen.getByTestId("badge-test")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo interno do modal")).toBeInTheDocument();
  });

  it("deve chamar onClose ao clicar no botão de fechar (X)", () => {
    const handleClose = vi.fn();
    render(
      <ModalDialog isOpen={true} onClose={handleClose} title="Título">
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    const closeBtn = screen.getByRole("button", { name: /fechar modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("deve chamar onClose ao pressionar tecla Escape", () => {
    const handleClose = vi.fn();
    render(
      <ModalDialog isOpen={true} onClose={handleClose} title="Título">
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("deve travar o scroll do body enquanto estiver aberto e restaurar ao desmontar", () => {
    expect(document.body.style.overflow).toBe("");

    const { unmount } = render(
      <ModalDialog isOpen={true} onClose={() => {}} title="Título">
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("deve renderizar botão de compartilhamento por padrão no cabeçalho", () => {
    render(
      <ModalDialog isOpen={true} onClose={() => {}} title="Título">
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    expect(
      screen.getByRole("button", { name: /compartilhar página/i }),
    ).toBeInTheDocument();
  });

  it("não deve renderizar botão de compartilhamento quando showShareButton for false", () => {
    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título"
        showShareButton={false}
      >
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    expect(
      screen.queryByRole("button", { name: /compartilhar página/i }),
    ).not.toBeInTheDocument();
  });

  it("deve permitir customizar slot de compartilhamento com shareSlot e suprimir o botão padrão", () => {
    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título"
        shareSlot={<button type="button">Custom Share</button>}
      >
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    expect(
      screen.getByRole("button", { name: "Custom Share" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /compartilhar página/i }),
    ).not.toBeInTheDocument();
  });

  it("não deve renderizar botão de compartilhamento quando shareSlot for explicitamente null", () => {
    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título"
        shareSlot={null}
      >
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    expect(
      screen.queryByRole("button", { name: /compartilhar página/i }),
    ).not.toBeInTheDocument();
  });

  it("deve repassar shareUrl, shareTitle e onShare para o ShareButton", async () => {
    const handleShare = vi.fn();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "navigator", {
      value: { share: shareMock },
      writable: true,
      configurable: true,
    });

    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título Base"
        shareUrl="/detalhe?id=42"
        shareTitle="Contrato 42/2024"
        onShare={handleShare}
      >
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    const shareBtn = screen.getByRole("button", {
      name: /compartilhar página/i,
    });
    fireEvent.click(shareBtn);

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Contrato 42/2024",
      }),
    );
    await vi.waitFor(() => {
      expect(handleShare).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "native",
        }),
      );
    });
  });
});
