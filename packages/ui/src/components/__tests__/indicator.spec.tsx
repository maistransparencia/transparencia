import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Indicator, IndicatorPanel } from "../indicator";

describe("IndicatorPanel e Indicator", () => {
  it("monta panel > dl > div > dt + dd, com papéis eyebrow e stat-value", () => {
    const { container } = render(
      <IndicatorPanel>
        <Indicator label="Total pago" value="R$ 1,0 mi" note="em 2026" />
      </IndicatorPanel>,
    );

    const painel = container.firstElementChild as HTMLElement;
    expect(painel).toHaveClass("panel");
    const lista = painel.querySelector("dl") as HTMLElement;
    expect(lista).toHaveClass("grid");
    expect(lista.className).toContain("minmax(13rem,1fr)");
    expect(screen.getByText("Total pago").tagName).toBe("DT");
    expect(screen.getByText("Total pago")).toHaveClass("eyebrow");
    expect(screen.getByText("R$ 1,0 mi").tagName).toBe("DD");
    expect(screen.getByText("R$ 1,0 mi")).toHaveClass("stat-value");
    expect(screen.getByText("em 2026").closest("dd")).toHaveClass("caption");
  });

  it("usa um único tamanho de valor por painel", () => {
    render(
      <IndicatorPanel size="sm">
        <Indicator label="A" value="1" />
        <Indicator label="B" value="2" />
      </IndicatorPanel>,
    );

    expect(screen.getByText("1")).toHaveClass("stat-value-sm");
    expect(screen.getByText("2")).toHaveClass("stat-value-sm");
  });

  it("aplica o tom da borda no painel e o tom semântico só no valor", () => {
    const { container } = render(
      <IndicatorPanel tone="brand">
        <Indicator label="Saldo" value="-R$ 1,0 mi" tone="danger" />
      </IndicatorPanel>,
    );

    expect(container.firstElementChild).toHaveClass("panel-brand");
    expect(screen.getByText("-R$ 1,0 mi")).toHaveClass("text-danger-text");
  });

  it("bare renderiza só a grade, sem panel", () => {
    const { container } = render(
      <IndicatorPanel bare>
        <Indicator label="A" value="1" />
      </IndicatorPanel>,
    );

    expect(container.firstElementChild).not.toHaveClass("panel");
    expect(container.querySelector("dl")).not.toBeNull();
  });

  it("omite a nota quando não há conteúdo e mostra a variação com texto", () => {
    const { container, rerender } = render(
      <IndicatorPanel>
        <Indicator label="A" value="1" />
      </IndicatorPanel>,
    );
    expect(container.querySelectorAll("dd")).toHaveLength(1);

    rerender(
      <IndicatorPanel>
        <Indicator
          label="A"
          value="1"
          trend={{ value: "5% a mais", isPositive: true }}
        />
      </IndicatorPanel>,
    );
    expect(screen.getByText("5% a mais")).toHaveClass("text-ok-text");
  });

  it("twoColumnsOnMobile começa em 2 colunas e mantém 4 no desktop", () => {
    const { container } = render(
      <IndicatorPanel columns={4} twoColumnsOnMobile>
        <Indicator label="A" value="1" />
      </IndicatorPanel>,
    );
    const grade = container.querySelector("dl");
    expect(grade).toHaveClass("grid-cols-2", "lg:grid-cols-4");
    expect(grade).not.toHaveClass("grid-cols-1");
  });
});
