import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "../kpi-card";

describe("KPICard", () => {
  it("não tem borda, raio nem sombra", () => {
    const { container } = render(<KPICard title="Receita" value="R$ 10" />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).not.toMatch(/border|rounded|shadow/);
    expect(screen.getByText("Receita")).toHaveClass("eyebrow");
    expect(screen.getByText("R$ 10")).toHaveClass(
      "text-[26px]",
      "font-semibold",
    );
  });

  it("aplica cores de accent, alert e trend", () => {
    render(
      <>
        <KPICard title="a" value="VA" accent />
        <KPICard title="b" value="VB" alert />
        <KPICard
          title="c"
          value="VC"
          subtext="sub"
          trend={{ value: "+1", isPositive: true }}
        />
        <KPICard
          title="d"
          value="VD"
          trend={{ value: "-1", isPositive: false }}
        />
      </>,
    );
    expect(screen.getByText("VA")).toHaveClass("text-brand");
    expect(screen.getByText("VB")).toHaveClass("text-warn-text");
    expect(screen.getByText("sub")).toBeInTheDocument();
    expect(screen.getByText("+1")).toHaveClass("text-ok-text");
    expect(screen.getByText("-1")).toHaveClass("text-danger-text");
  });

  it("sem subtext e trend não renderiza rodapé", () => {
    const { container } = render(<KPICard title="a" value="V" />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it.each([0, "", undefined])(
    "omite rodapé com subtext vazio (%s)",
    (subtext) => {
      render(<KPICard title="a" value="V" subtext={subtext} />);
      expect(screen.queryByText("0")).toBeNull();
      expect(
        screen.getByText("V").parentElement?.parentElement?.children,
      ).toHaveLength(1);
    },
  );

  it("invertTrend troca a cor da tendência", () => {
    render(
      <KPICard
        title="a"
        value="V"
        trend={{ value: "+5%", isPositive: true }}
        invertTrend
      />,
    );
    expect(screen.getByText("+5%")).toHaveClass("text-danger-text");
  });

  it("accent tem precedência sobre alert", () => {
    render(<KPICard title="a" value="V" accent alert />);
    expect(screen.getByText("V")).toHaveClass("text-brand");
  });

  it("invertTrend mantém estilo negativo quando isPositive é indefinido", () => {
    render(
      <KPICard title="a" value="V" trend={{ value: "+5%" }} invertTrend />,
    );
    expect(screen.getByText("+5%")).toHaveClass("text-danger-text");
  });
});
