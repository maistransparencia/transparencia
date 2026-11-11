import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedButton } from "../segmented-button";

describe("SegmentedButton", () => {
  it("ativo usa tokens ink/onink e rounded-md", () => {
    render(<SegmentedButton active>Ano</SegmentedButton>);
    expect(screen.getByRole("button")).toHaveClass(
      "rounded-md",
      "bg-ink",
      "text-onink",
    );
  });

  it("variante tabs usa border-b-2 e border-ink quando ativa", () => {
    render(
      <SegmentedButton active variant="tabs">
        Ano
      </SegmentedButton>,
    );
    const botao = screen.getByRole("tab");
    expect(botao).toHaveClass("border-b-2", "border-ink");
    expect(botao).not.toHaveClass("rounded-md");
  });

  it("tabs inativo usa border-transparent e text-mute2", () => {
    render(
      <SegmentedButton active={false} variant="tabs">
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("tab")).toHaveClass(
      "border-transparent",
      "text-mute2",
    );
  });

  it("tabs muted usa text-mute3", () => {
    render(
      <SegmentedButton active={false} muted variant="tabs">
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("tab")).toHaveClass("text-mute3");
  });

  it("segmentado muted usa border-dashed", () => {
    render(
      <SegmentedButton active={false} muted>
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-dashed");
  });

  it("tabs usa role=tab e aria-selected, sem aria-pressed", () => {
    render(
      <SegmentedButton active variant="tabs">
        Ano
      </SegmentedButton>,
    );
    const aba = screen.getByRole("tab");
    expect(aba).toHaveAttribute("aria-selected", "true");
    expect(aba).not.toHaveAttribute("aria-pressed");
  });

  it("segmentado expõe aria-pressed", () => {
    render(<SegmentedButton active={false}>Ano</SegmentedButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("disabled não dispara clique", () => {
    const aoClicar = vi.fn();
    render(
      <SegmentedButton active={false} disabled onClick={aoClicar}>
        Ano
      </SegmentedButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(aoClicar).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("aplica estilos de tamanho sm e md", () => {
    const { rerender } = render(
      <SegmentedButton active size="sm">
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("text-xs");
    rerender(
      <SegmentedButton active size="md">
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("text-sm");
  });

  it("tem anel de foco interno", () => {
    render(<SegmentedButton active>Ano</SegmentedButton>);
    expect(screen.getByRole("button")).toHaveClass("focus-visible:ring-inset");
  });
});
