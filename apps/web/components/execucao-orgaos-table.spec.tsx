import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type ExecucaoOrgaoItem,
  ExecucaoOrgaosTable,
} from "./execucao-orgaos-table";

function makeItem(overrides: Partial<ExecucaoOrgaoItem> = {}) {
  return {
    descricao: "SECRETARIA MUNICIPAL DE SAUDE",
    dotacaoAtualizada: 1000,
    empenhado: 800,
    pago: 600,
    percentualPago: 60,
    alerta: "normal",
    ...overrides,
  } as ExecucaoOrgaoItem;
}

describe("ExecucaoOrgaosTable", () => {
  it("mostra o percentual pago arredondado e não mostra alerta nem busca", () => {
    render(<ExecucaoOrgaosTable items={[makeItem()]} />);

    expect(screen.getByText("% pago")).toBeInTheDocument();
    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    expect(screen.queryByText("Alerta")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/reservado acima do autorizado/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/buscar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/baixar csv/i)).not.toBeInTheDocument();
  });

  it("mostra a coluna Alerta, o selo e a nota quando há reservado acima do autorizado", () => {
    render(
      <ExecucaoOrgaosTable
        items={[
          makeItem({
            descricao: "SECRETARIA MUNICIPAL DE OBRAS",
            dotacaoAtualizada: 100,
            empenhado: 120,
            percentualPago: 80,
            alerta: "excesso",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Alerta")).toBeInTheDocument();
    expect(
      screen.getAllByText("Reservado acima do autorizado").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/pode ser um ajuste de orçamento ainda não refletido/i),
    ).toBeInTheDocument();
  });
});
