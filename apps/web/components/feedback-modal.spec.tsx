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
    vi.unstubAllGlobals();
  });

  it("não renderiza quando isOpen é false", () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(
      screen.queryByRole("dialog", {
        name: /sugestão ou erro/i,
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
      screen.getByRole("dialog", { name: /sugestão ou erro/i }),
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

  it("tem acessibilidade básica: grupo rotulado, foco no texto e erro anunciado", async () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByRole("radiogroup", { name: /tipo/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByLabelText(/descrição do problema ou sugestão/i),
      ).toHaveFocus(),
    );

    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /pelo menos 10 caracteres/i,
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

  it("envia o relato à API com rota e portal, sem enviar conteúdo ao PostHog", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const handleClose = vi.fn();
    render(
      <FeedbackModal
        isOpen={true}
        onClose={handleClose}
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /divergência de dados/i }),
    );
    fireEvent.change(
      screen.getByLabelText(/descrição do problema ou sugestão/i),
      {
        target: {
          value:
            "O valor empenhado no contrato nº 123 diverge do diário oficial.",
        },
      },
    );
    fireEvent.change(screen.getByLabelText(/seu e-mail/i), {
      target: { value: "cidadao@exemplo.com" },
    });
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(
      await screen.findByText(/relato enviado com sucesso!/i),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/feedback");
    expect(JSON.parse(String(init.body))).toEqual({
      tipoRelato: "inconsistencia_dados",
      mensagem:
        "O valor empenhado no contrato nº 123 diverge do diário oficial.",
      emailRetorno: "cidadao@exemplo.com",
      rotaPagina: window.location.pathname,
      portalSlug: "porciuncula_prefeitura",
    });
    expect(posthog.capture).not.toHaveBeenCalledWith(
      "feedback_submitted",
      expect.anything(),
    );

    fireEvent.click(screen.getByRole("button", { name: /^fechar$/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("trata honeypot sem chamar a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(
      screen.getByLabelText(/descrição do problema ou sugestão/i),
      { target: { value: "Mensagem enviada por bot spamer automatizado." } },
    );
    const honeypot = screen
      .getByRole("dialog")
      .querySelector("input[name='site_url']");
    if (!honeypot) throw new Error("Honeypot input not found");
    fireEvent.change(honeypot, { target: { value: "https://spam-link.com" } });
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/relato enviado com sucesso!/i),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "falha de rede",
      () => Promise.reject(new Error("offline")),
      /não foi possível enviar/i,
    ],
    [
      "limite de envios",
      () => Promise.resolve(new Response("{}", { status: 429 })),
      /aguarde alguns minutos/i,
    ],
    [
      "erro do servidor",
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Município não encontrado." }), {
            status: 400,
          }),
        ),
      /município não encontrado/i,
    ],
  ])(
    "mostra o erro e preserva o texto em %s",
    async (_nome, impl, esperado) => {
      vi.stubGlobal("fetch", vi.fn(impl));
      render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

      const texto = "Ocorreu uma falha ao exibir a lista de empenhos.";
      fireEvent.change(
        screen.getByLabelText(/descrição do problema ou sugestão/i),
        { target: { value: texto } },
      );
      const form = screen.getByRole("dialog").querySelector("form");
      if (!form) throw new Error("Form not found");
      fireEvent.submit(form);

      expect(await screen.findByRole("alert")).toHaveTextContent(esperado);
      expect(
        screen.getByLabelText(/descrição do problema ou sugestão/i),
      ).toHaveValue(texto);
    },
  );

  it("envia portalSlug nulo quando não fornecido (páginas raiz ou institucionais)", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(
      screen.getByLabelText(/descrição do problema ou sugestão/i),
      { target: { value: "Erro na página institucional de termos de uso." } },
    );
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(JSON.parse(String(init.body)).portalSlug).toBeNull();
  });
});
