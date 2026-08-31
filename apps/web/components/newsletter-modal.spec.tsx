import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewsletterModal } from "./newsletter-modal";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("NewsletterModal component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não deve renderizar quando isOpen for false", () => {
    render(
      <NewsletterModal
        isOpen={false}
        onClose={vi.fn()}
        portalSlug="porciuncula_prefeitura"
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deve renderizar modal com acessibilidade e disparar evento ao abrir", () => {
    const onClose = vi.fn();
    render(
      <NewsletterModal
        isOpen={true}
        onClose={onClose}
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
        stateUF="RJ"
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith("newsletter_modal_opened", {
      portal_slug: "porciuncula_prefeitura",
    });

    // Testar fechar com ESC
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("deve submeter e-mail e exibir estado de sucesso", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "E-mail de confirmação enviado.",
      }),
    });

    render(
      <NewsletterModal
        isOpen={true}
        onClose={vi.fn()}
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
      />,
    );

    const input = screen.getByLabelText(/seu melhor e-mail/i);
    fireEvent.change(input, { target: { value: "cidadao@exemplo.com" } });

    const submitBtn = screen.getByRole("button", {
      name: /inscrever|receber alertas/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/confirme sua inscrição/i)).toBeInTheDocument();
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "newsletter_subscribe_submitted",
      {
        portal_slug: "porciuncula_prefeitura",
      },
    );
    expect(posthog.capture).toHaveBeenCalledWith(
      "newsletter_subscribe_success",
      {
        portal_slug: "porciuncula_prefeitura",
      },
    );
  });

  it("deve lidar com erro 429 de rate limit", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: "Muitas tentativas. Aguarde alguns minutos.",
      }),
    });

    render(
      <NewsletterModal
        isOpen={true}
        onClose={vi.fn()}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const input = screen.getByRole("textbox", { name: /e-mail/i });
    fireEvent.change(input, { target: { value: "cidadao@exemplo.com" } });

    const submitBtn = screen.getByRole("button", {
      name: /inscrever|receber alertas/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/muitas tentativas/i)).toBeInTheDocument();
    });

    expect(posthog.capture).toHaveBeenCalledWith("newsletter_rate_limited", {
      portal_slug: "porciuncula_prefeitura",
    });
  });
});
