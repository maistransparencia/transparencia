import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "../kpi-card";

describe("KPICard", () => {
  it("variante divisoria não tem borda, raio nem sombra", () => {
    const { container } = render(
      <KPICard variant="divisoria" title="Receita" value="R$ 10" />,
    );
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).not.toMatch(/border|rounded|shadow/);
    expect(screen.getByText("Receita")).toHaveClass(
      "font-mono",
      "uppercase",
      "text-mute2",
    );
    expect(screen.getByText("R$ 10")).toHaveClass(
      "text-[26px]",
      "font-semibold",
    );
  });

  it("sem variant mantém o markup antigo", () => {
    const { container } = render(<KPICard title="Receita" value="R$ 10" />);
    expect(container.firstElementChild).toHaveClass(
      "rounded-xl",
      "border",
      "border-borderLine",
    );
  });

  it("divisoria aplica cores de accent, alert e trend", () => {
    render(
      <>
        <KPICard variant="divisoria" title="a" value="VA" accent />
        <KPICard variant="divisoria" title="b" value="VB" alert />
        <KPICard
          variant="divisoria"
          title="c"
          value="VC"
          subtext="sub"
          trend={{ value: "+1", isPositive: true }}
        />
        <KPICard
          variant="divisoria"
          title="d"
          value="VD"
          trend={{ value: "-1", isPositive: false }}
        />
      </>,
    );
    expect(screen.getByText("VA")).toHaveClass("text-brand");
    expect(screen.getByText("VB")).toHaveClass("text-warn");
    expect(screen.getByText("sub")).toBeInTheDocument();
    expect(screen.getByText("+1")).toHaveClass("text-ok");
    expect(screen.getByText("-1")).toHaveClass("text-danger");
  });

  it("divisoria sem subtext e trend não renderiza rodapé", () => {
    const { container } = render(
      <KPICard variant="divisoria" title="a" value="V" />,
    );
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
