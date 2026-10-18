import { fireEvent, render, screen } from "@testing-library/react";
import { useQueryState } from "nuqs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NewsletterFeedbackBanner } from "./newsletter-feedback-banner";

vi.mock("nuqs", () => ({
  parseAsString: {
    withOptions: () => ({}),
  },
  useQueryState: vi.fn(),
}));

describe("NewsletterFeedbackBanner component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve renderizar quando o parâmetro newsletter for nulo", () => {
    (useQueryState as Mock).mockReturnValue([null, vi.fn()]);
    render(<NewsletterFeedbackBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deve renderizar mensagem de sucesso para newsletter=confirmed", () => {
    const setNewsletter = vi.fn();
    (useQueryState as Mock).mockReturnValue(["confirmed", setNewsletter]);
    render(<NewsletterFeedbackBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/inscrição confirmada com sucesso/i),
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /fechar/i });
    fireEvent.click(closeBtn);
    expect(setNewsletter).toHaveBeenCalledWith(null);
  });

  it("deve renderizar mensagem de cancelamento para newsletter=unsubscribed", () => {
    const setNewsletter = vi.fn();
    (useQueryState as Mock).mockReturnValue(["unsubscribed", setNewsletter]);
    render(<NewsletterFeedbackBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/inscrição cancelada com sucesso/i),
    ).toBeInTheDocument();
  });
});
