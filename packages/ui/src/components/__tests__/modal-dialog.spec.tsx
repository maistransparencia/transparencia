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
});
