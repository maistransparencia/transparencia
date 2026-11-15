import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPIGrid } from "./kpi-grid";

describe("KPIGrid", () => {
  it("variante divisoria usa filete vertical e primeira coluna sem recuo", () => {
    const { container } = render(
      <KPIGrid variant="divisoria">
        <div>a</div>
        <div>b</div>
      </KPIGrid>,
    );
    expect(container.firstElementChild).toHaveClass(
      "divide-x",
      "divide-line",
      "*:first:pl-0",
      "max-sm:divide-y",
      "sm:*:nth-[2n+1]:border-l-0",
      "lg:*:nth-[4n+1]:border-l-0",
      "lg:*:not-nth-[4n+1]:border-l",
    );
    expect(container.firstElementChild).not.toHaveClass("gap-4");
  });

  it("sem variant mantém o espaçamento atual", () => {
    const { container } = render(
      <KPIGrid>
        <div>a</div>
      </KPIGrid>,
    );
    expect(container.firstElementChild).toHaveClass("gap-4");
  });
});
