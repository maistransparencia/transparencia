import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestosAPagarVendorsChart } from "./restos-a-pagar-vendors-chart";

describe("RestosAPagarVendorsChart", () => {
  it("separa liquidado e não processado por tokens distintos", () => {
    const { container } = render(
      <RestosAPagarVendorsChart
        portalSlug="portal_teste"
        ano={2026}
        items={[
          { fornecedor: "Fornecedor Alfa", valorTotal: 1000, liquidado: 400 },
        ]}
      />,
    );

    expect(screen.getByText(/Fornecedor Alfa/i)).toBeInTheDocument();
    expect(container.querySelector(".bg-warn-fill")).not.toBeNull();
    expect(container.querySelector(".bg-brand-fill")).not.toBeNull();
  });

  it("não renderiza nada sem fornecedores", () => {
    const { container } = render(
      <RestosAPagarVendorsChart
        items={[]}
        portalSlug="portal_teste"
        ano={2026}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("liga o fornecedor com CNPJ à busca de licitações e contratos do ano", () => {
    render(
      <RestosAPagarVendorsChart
        portalSlug="portal_teste"
        ano={2026}
        items={[
          {
            fornecedor: "Fornecedor Alfa",
            fornecedorDocumento: "05.422.000/0001-01",
            valorTotal: 1000,
            liquidado: 0,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Ver licitações e contratos/ }),
    ).toHaveAttribute(
      "href",
      "/portal_teste/licitacoes?ano=2026&q=05422000000101",
    );
  });
});
