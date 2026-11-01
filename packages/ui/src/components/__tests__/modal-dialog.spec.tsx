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

  it("deve aplicar subtitleClassName customizado no elemento do subtítulo", () => {
    render(
      <ModalDialog
        isOpen={true}
        onClose={() => {}}
        title="Título"
        subtitle="Subtítulo que quebra linha"
        subtitleClassName="whitespace-normal leading-relaxed"
      >
        <p>Conteúdo</p>
      </ModalDialog>,
    );

    const subtitleElement = screen.getByText("Subtítulo que quebra linha");
    expect(subtitleElement).toHaveClass("whitespace-normal");
    expect(subtitleElement).toHaveClass("leading-relaxed");
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

describe("ModalDialog tokens", () => {
  it("usa tokens no diálogo e título serif", () => {
    render(
      <ModalDialog isOpen onClose={() => {}} title="Detalhes">
        <p>x</p>
      </ModalDialog>,
    );
    expect(screen.getByRole("dialog")).toHaveClass(
      "rounded-md",
      "border-line",
      "bg-page",
    );
    expect(screen.getByRole("dialog")).not.toHaveClass("shadow-2xl");
    expect(screen.getByText("Detalhes").tagName).toBe("H2");
    expect(screen.getByText("Detalhes").className).not.toMatch(/font-|text-/);
  });

  describe("ModalDialog acabamento", () => {
    it("vira bottom sheet no mobile (sem raio inferior)", () => {
      render(
        <ModalDialog isOpen onClose={() => {}} title="Detalhes">
          <p>x</p>
        </ModalDialog>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("max-sm:rounded-b-none");
    });

    it("botão voltar chama onBack e usa rótulo padrão", () => {
      const aoVoltar = vi.fn();
      render(
        <ModalDialog
          isOpen
          onClose={() => {}}
          title="Detalhes"
          onBack={aoVoltar}
        >
          <p>x</p>
        </ModalDialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(aoVoltar).toHaveBeenCalledTimes(1);
    });

    it("cabeçalho e rodapé se distinguem do corpo", () => {
      render(
        <ModalDialog
          isOpen
          onClose={() => {}}
          title="Detalhes"
          footer={<p>rod</p>}
        >
          <p>corpo</p>
        </ModalDialog>,
      );
      const dialogo = screen.getByRole("dialog");
      const cabecalho = screen.getByText("Detalhes").closest("div.border-b");
      const rodape = screen.getByText("rod").parentElement;
      expect(cabecalho).toHaveClass("bg-line2/40");
      expect(rodape).toHaveClass("bg-line2/40");
      expect(screen.getByText("corpo").parentElement).not.toHaveClass(
        "bg-line2/40",
      );
      expect(dialogo).toContainElement(rodape);
    });

    it("botões de fechar e voltar têm foco visível", () => {
      render(
        <ModalDialog
          isOpen
          onClose={() => {}}
          title="Detalhes"
          onBack={() => {}}
        >
          <p>x</p>
        </ModalDialog>,
      );
      expect(screen.getByRole("button", { name: "Fechar modal" })).toHaveClass(
        "focus-visible:ring-2",
      );
      expect(screen.getByRole("button", { name: "Voltar" })).toHaveClass(
        "focus-visible:ring-2",
      );
    });
  });
});
