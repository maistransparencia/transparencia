import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantFallbackChips,
  type FallbackChip,
} from "../assistant-fallback-chips";

describe("AssistantFallbackChips Component", () => {
  const mockChips: FallbackChip[] = [
    {
      type: "prompt",
      label: "Ver total com saúde",
      prompt: "Qual o total gasto com saúde?",
      icon: "Search",
    },
    {
      type: "link",
      label: "Abrir Painel de Pessoal",
      href: "/pessoal",
      icon: "ExternalLink",
    },
  ];

  it("should render null when chips array is empty", () => {
    const { container } = render(
      <AssistantFallbackChips
        chips={[]}
        onSelectPrompt={vi.fn()}
        portalSlug="porciuncula_prefeitura"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render prompt chips and trigger callback on click", () => {
    const onSelectPromptMock = vi.fn();
    render(
      <AssistantFallbackChips
        chips={mockChips}
        onSelectPrompt={onSelectPromptMock}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(screen.getByText("Que tal tentar uma destas opções?")).toBeDefined();
    const promptBtn = screen.getByText("Ver total com saúde");
    expect(promptBtn).toBeDefined();

    fireEvent.click(promptBtn);
    expect(onSelectPromptMock).toHaveBeenCalledWith(
      "Qual o total gasto com saúde?",
    );
  });

  it("should render navigation link chips pointing to portal route", () => {
    render(
      <AssistantFallbackChips
        chips={mockChips}
        onSelectPrompt={vi.fn()}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const linkEl = screen.getByText("Abrir Painel de Pessoal").closest("a");
    expect(linkEl).not.toBeNull();
    expect(linkEl?.getAttribute("href")).toBe(
      "/porciuncula_prefeitura/pessoal",
    );
  });
});
