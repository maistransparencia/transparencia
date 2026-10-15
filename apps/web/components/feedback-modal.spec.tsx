import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackModal } from "./feedback-modal";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    sessionRecording: {
      isRecording: vi.fn(() => true),
    },
  },
}));

describe("FeedbackModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando isOpen é false", () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(
      screen.queryByRole("dialog", {
        name: /reportar inconsistência ou erro/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renderiza campos e captura feedback_modal_opened ao abrir", () => {
    render(
      <FeedbackModal
        isOpen={true}
        onClose={vi.fn()}
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
      />,
    );

    expect(
      screen.getByRole("dialog", { name: /reportar inconsistência ou erro/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/descrição do problema ou sugestão/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/seu e-mail/i)).toBeInTheDocument();

    expect(posthog.capture).toHaveBeenCalledWith(
      "feedback_modal_opened",
      expect.objectContaining({
        portal_slug: "porciuncula_prefeitura",
      }),
    );
  });

  it("valida obrigatoriedade e tamanho mínimo da mensagem", async () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(
      await screen.findByText(/pelo menos 10 caracteres/i),
    ).toBeInTheDocument();
    expect(posthog.capture).not.toHaveBeenCalledWith(
      "feedback_submitted",
      expect.anything(),
    );
  });

  it("valida formato de e-mail inválido quando preenchido", async () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByLabelText(
      /descrição do problema ou sugestão/i,
    );
    fireEvent.change(textarea, {
      target: { value: "O gráfico de despesas por função não carrega." },
    });

    const emailInput = screen.getByLabelText(/seu e-mail/i);
    fireEvent.change(emailInput, {
      target: { value: "email_invalido" },
    });

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(
      await screen.findByText(/endereço de e-mail informado parece inválido/i),
    ).toBeInTheDocument();
    expect(posthog.capture).not.toHaveBeenCalledWith(
      "feedback_submitted",
      expect.anything(),
    );
  });

  it("submete com atributos em inglês no PostHog e exibe tela de sucesso", async () => {
    const handleClose = vi.fn();
    render(
      <FeedbackModal
        isOpen={true}
        onClose={handleClose}
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
      />,
    );

    // Seleciona tipo de relato 'inconsistencia_dados'
    const optionRadio = screen.getByRole("radio", {
      name: /divergência de dados/i,
    });
    fireEvent.click(optionRadio);

    const textarea = screen.getByLabelText(
      /descrição do problema ou sugestão/i,
    );
    fireEvent.change(textarea, {
      target: {
        value:
          "O valor empenhado no contrato nº 123 diverge do diário oficial.",
      },
    });

    const emailInput = screen.getByLabelText(/seu e-mail/i);
    fireEvent.change(emailInput, {
      target: { value: "cidadao@exemplo.com" },
    });

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith(
        "feedback_submitted",
        expect.objectContaining({
          type: "inconsistencia_dados",
          message:
            "O valor empenhado no contrato nº 123 diverge do diário oficial.",
          email: "cidadao@exemplo.com",
          portal_slug: "porciuncula_prefeitura",
          has_session_recording: true,
          timestamp: expect.any(String),
        }),
      );
    });

    expect(
      screen.getByText(/relato enviado com sucesso!/i),
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /^fechar$/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("trata honeypot anti-spam sem disparar telemetria no PostHog", () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByLabelText(
      /descrição do problema ou sugestão/i,
    );
    fireEvent.change(textarea, {
      target: { value: "Mensagem enviada por bot spamer automatizado." },
    });

    const honeypot = screen
      .getByRole("dialog")
      .querySelector("input[name='site_url']");
    if (!honeypot) throw new Error("Honeypot input not found");
    fireEvent.change(honeypot, {
      target: { value: "https://spam-link.com" },
    });

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(posthog.capture).not.toHaveBeenCalledWith(
      "feedback_submitted",
      expect.anything(),
    );
    expect(
      screen.getByText(/relato enviado com sucesso!/i),
    ).toBeInTheDocument();
  });

  it("exibe mensagem amigável de erro se posthog.capture lançar exceção", () => {
    vi.mocked(posthog.capture).mockImplementation((event: string) => {
      if (event === "feedback_submitted") {
        throw new Error("Network blocked");
      }
    });

    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByLabelText(
      /descrição do problema ou sugestão/i,
    );
    fireEvent.change(textarea, {
      target: { value: "Ocorreu uma falha ao exibir a lista de empenhos." },
    });

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(
      screen.getByText(/não foi possível enviar o relato no momento/i),
    ).toBeInTheDocument();
  });

  it("atribui portal_slug como null quando não fornecido (páginas raiz ou institucionais)", async () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByLabelText(
      /descrição do problema ou sugestão/i,
    );
    fireEvent.change(textarea, {
      target: { value: "Erro na página institucional de termos de uso." },
    });

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith(
        "feedback_submitted",
        expect.objectContaining({
          portal_slug: null,
        }),
      );
    });
  });
});
