import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestosAPagarVendorsChart } from "./restos-a-pagar-vendors-chart";

describe("RestosAPagarVendorsChart", () => {
  it("separa liquidado e não processado por tokens distintos", () => {
    const { container } = render(
      <RestosAPagarVendorsChart
        items={[
          { fornecedor: "Fornecedor Alfa", valorTotal: 1000, liquidado: 400 },
        ]}
      />,
    );

    expect(screen.getByText(/Fornecedor Alfa/i)).toBeInTheDocument();
    expect(container.querySelector(".bg-warn")).not.toBeNull();
    expect(container.querySelector(".bg-brand")).not.toBeNull();
  });

  it("não renderiza nada sem fornecedores", () => {
    const { container } = render(<RestosAPagarVendorsChart items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
