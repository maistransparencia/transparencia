import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestosHistoricoLista } from "./restos-historico-lista";

const linhas = [
  { ano: 2021, restosInscritos: 1000, restosPagos: 250, saldoRestos: 750 },
  { ano: 2022, restosInscritos: 0, restosPagos: 0, saldoRestos: 0 },
];

describe("RestosHistoricoLista", () => {
  it("mostra uma linha por ano com o percentual pago e os valores em texto", () => {
    render(<RestosHistoricoLista linhas={linhas} />);

    const itens = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("2021");
    expect(itens[0]).toHaveTextContent("25% pago");
    expect(itens[0]).toHaveTextContent(
      "Pago R$ 250 de R$ 1,0 mil levados · ainda a pagar R$ 750",
    );
  });

  it("divide a barra entre pago e ainda a pagar na proporção dos valores", () => {
    render(<RestosHistoricoLista linhas={linhas} />);

    const barra = screen.getByRole("img", { name: "2021: 25% pago" });
    const [pago, aPagar] = Array.from(barra.children) as HTMLElement[];
    expect(pago.style.flexGrow).toBe("250");
    expect(aPagar.style.flexGrow).toBe("750");
  });

  it("não quebra quando o ano não tem valores levados", () => {
    render(<RestosHistoricoLista linhas={linhas} />);

    expect(screen.getByRole("img", { name: "2022: 0% pago" })).toBeTruthy();
  });

  it("explica as duas partes da barra na legenda", () => {
    render(<RestosHistoricoLista linhas={linhas} />);

    expect(screen.getByText("Pago no ano")).toBeInTheDocument();
    expect(screen.getByText("Ainda a pagar")).toBeInTheDocument();
  });

  it("aparece só no celular", () => {
    render(<RestosHistoricoLista linhas={linhas} />);

    expect(screen.getByTestId("restos-historico-lista")).toHaveClass(
      "md:hidden",
    );
  });
});
