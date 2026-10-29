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
    expect(screen.getByText("VB")).toHaveClass("text-warn-text");
    expect(screen.getByText("sub")).toBeInTheDocument();
    expect(screen.getByText("+1")).toHaveClass("text-ok-text");
    expect(screen.getByText("-1")).toHaveClass("text-danger-text");
  });

  it("divisoria sem subtext e trend não renderiza rodapé", () => {
    const { container } = render(
      <KPICard variant="divisoria" title="a" value="V" />,
    );
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it.each([0, "", undefined])(
    "divisoria omite rodapé com subtext vazio (%s)",
    (subtext) => {
      render(
        <KPICard variant="divisoria" title="a" value="V" subtext={subtext} />,
      );
      expect(screen.queryByText("0")).toBeNull();
      expect(
        screen.getByText("V").parentElement?.parentElement?.children,
      ).toHaveLength(1);
    },
  );

  it("invertTrend troca a cor da tendência", () => {
    render(
      <KPICard
        variant="divisoria"
        title="a"
        value="V"
        trend={{ value: "+5%", isPositive: true }}
        invertTrend
      />,
    );
    expect(screen.getByText("+5%")).toHaveClass("text-danger-text");
  });

  it("accent tem precedência sobre alert", () => {
    render(<KPICard variant="divisoria" title="a" value="V" accent alert />);
    expect(screen.getByText("V")).toHaveClass("text-brand");
  });

  it("variante padrão compartilha o rodapé", () => {
    render(
      <KPICard
        title="a"
        value="V"
        subtext="sub"
        trend={{ value: "+1", isPositive: true }}
      />,
    );
    expect(screen.getByText("sub")).toBeInTheDocument();
    expect(screen.getByText("+1")).toHaveClass("text-emerald-600");
  });

  it("invertTrend mantém estilo negativo quando isPositive é indefinido", () => {
    render(
      <KPICard
        variant="divisoria"
        title="a"
        value="V"
        trend={{ value: "+5%" }}
        invertTrend
      />,
    );
    expect(screen.getByText("+5%")).toHaveClass("text-danger-text");
  });
});
