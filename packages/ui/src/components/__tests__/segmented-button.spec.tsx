import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    const botao = screen.getByRole("button");
    expect(botao).toHaveClass("border-b-2", "border-ink");
    expect(botao).not.toHaveClass("rounded-md");
  });

  it("tabs inativo usa border-transparent e text-mute2", () => {
    render(
      <SegmentedButton active={false} variant="tabs">
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("button")).toHaveClass(
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
    expect(screen.getByRole("button")).toHaveClass("text-mute3");
  });

  it("segmentado muted usa border-dashed", () => {
    render(
      <SegmentedButton active={false} muted>
        Ano
      </SegmentedButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-dashed");
  });
});
