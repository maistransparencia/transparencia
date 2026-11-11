import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CityInterestBlock } from "./city-interest-block";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

function fillValid() {
  fireEvent.change(screen.getByLabelText("Cidade"), {
    target: { value: "Cidade Exemplo" },
  });
  fireEvent.change(screen.getByLabelText("Estado"), {
    target: { value: "MG" },
  });
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "a@b.com.br" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("CityInterestBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renderiza o bloco Em breve com texto e botão", () => {
    render(<CityInterestBlock />);
    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(
      screen.getByText("Sua cidade ainda não está aqui"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quero ser avisado" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre o formulário com campos rotulados, 27 UFs e link de privacidade", () => {
    render(<CityInterestBlock />);
    fireEvent.click(screen.getByRole("button", { name: "Quero ser avisado" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "inputmode",
      "email",
    );
    expect(screen.getAllByRole("option")).toHaveLength(28);
    const link = screen.getByRole("link", { name: "Política de Privacidade" });
    expect(link).toHaveAttribute("href", "/privacidade");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("mostra erros por campo com aria-invalid e aria-describedby", () => {
    render(<CityInterestBlock />);
    fireEvent.click(screen.getByRole("button", { name: "Quero ser avisado" }));
    const submit = screen
      .getAllByRole("button", { name: "Quero ser avisado" })
      .at(-1) as HTMLElement;
    fireEvent.click(submit);
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute(
      "aria-describedby",
      "city-interest-email-error",
    );
    expect(
      screen.getByText("Confira o e-mail: falta o final, como .com.br."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Escolha o estado da sua cidade."),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("envia e mostra o estado de sucesso com role status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<CityInterestBlock />);
    fireEvent.click(screen.getByRole("button", { name: "Quero ser avisado" }));
    fillValid();
    fireEvent.submit(
      screen.getByLabelText("Cidade").closest("form") as Element,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Pronto, avisaremos você",
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Anotamos Cidade Exemplo (MG).",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Voltar para a lista de cidades" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra erro do servidor", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Muitas tentativas." }),
    });
    render(<CityInterestBlock />);
    fireEvent.click(screen.getByRole("button", { name: "Quero ser avisado" }));
    fillValid();
    fireEvent.submit(
      screen.getByLabelText("Cidade").closest("form") as Element,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Muitas tentativas."),
    );
  });

  describe("eventos do PostHog", () => {
    const capture = posthog.capture as unknown as ReturnType<typeof vi.fn>;
    const calls = (name: string) =>
      capture.mock.calls.filter(([event]) => event === name);

    it("registra clique no CTA com totalPortais e abertura do modal", () => {
      render(<CityInterestBlock totalPortais={3} />);
      fireEvent.click(
        screen.getByRole("button", { name: "Quero ser avisado" }),
      );
      expect(capture).toHaveBeenCalledWith("city_interest_cta_clicked", {
        totalPortais: 3,
      });
      expect(calls("city_interest_modal_opened")).toHaveLength(1);
    });

    it("registra form_started uma única vez e falha de validação só com nomes de campos", () => {
      render(<CityInterestBlock />);
      fireEvent.click(
        screen.getByRole("button", { name: "Quero ser avisado" }),
      );
      fireEvent.change(screen.getByLabelText("Cidade"), {
        target: { value: "Cidade Secreta" },
      });
      fireEvent.change(screen.getByLabelText("E-mail"), {
        target: { value: "segredo@exemplo.com" },
      });
      expect(calls("city_interest_form_started")).toHaveLength(1);
      fireEvent.submit(
        screen.getByLabelText("Cidade").closest("form") as Element,
      );
      const [, props] = calls("city_interest_validation_failed")[0];
      expect(props).toEqual({ fields: ["uf", "consentimento"] });
    });

    it("registra submitted com uf e cidade e nunca envia e-mail", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      render(<CityInterestBlock />);
      fireEvent.click(
        screen.getByRole("button", { name: "Quero ser avisado" }),
      );
      fillValid();
      fireEvent.submit(
        screen.getByLabelText("Cidade").closest("form") as Element,
      );
      await waitFor(() =>
        expect(calls("city_interest_submitted")).toHaveLength(1),
      );
      expect(calls("city_interest_submitted")[0][1]).toEqual({
        uf: "MG",
        cidade: "cidade exemplo",
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Voltar para a lista de cidades" }),
      );
      expect(capture).toHaveBeenCalledWith("city_interest_modal_closed", {
        state: "success",
        hadInteraction: true,
      });
      const serialized = JSON.stringify(capture.mock.calls);
      expect(serialized).not.toContain("a@b.com.br");
      expect(serialized).not.toContain("Cidade Exemplo");
    });

    it("registra submit_failed por tipo de erro e fechamento por abandono", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: "Muitas tentativas." }),
      });
      render(<CityInterestBlock />);
      fireEvent.click(
        screen.getByRole("button", { name: "Quero ser avisado" }),
      );
      fillValid();
      fireEvent.submit(
        screen.getByLabelText("Cidade").closest("form") as Element,
      );
      await waitFor(() =>
        expect(calls("city_interest_submit_failed")).toHaveLength(1),
      );
      expect(calls("city_interest_submit_failed")[0][1]).toEqual({
        status: 429,
        errorType: "rate_limited",
      });
      fireEvent.click(screen.getByRole("button", { name: /fechar/i }));
      expect(capture).toHaveBeenCalledWith("city_interest_modal_closed", {
        state: "form",
        hadInteraction: true,
      });
    });
  });
});
