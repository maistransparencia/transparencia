import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaudeMemoriaCalculo } from "./saude-memoria-calculo";

const orcamento = { empenhado: 1000, liquidado: 800, pago: 600 };

describe("SaudeMemoriaCalculo", () => {
  it("mostra a pergunta, as três etapas à vista e a lei, sem link solto de detalhes", () => {
    render(
      <SaudeMemoriaCalculo
        ano={2025}
        isCurrentYear={false}
        orcamento={orcamento}
        portalUrl="https://transparencia.exemplo.gov.br/"
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Quanto do que o Fundo reservou para a saúde já foi pago?",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("meter", { hidden: true })).toHaveLength(3);
    expect(
      screen.getByText(/Ficaram .* sem pagar dentro do ano/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lei 4\.320\/1964/ })).toBeTruthy();
    expect(screen.queryByText("Ver detalhes")).toBeNull();
  });

  it("ano em andamento não afirma o que ficou sem pagar", () => {
    render(
      <SaudeMemoriaCalculo ano={2026} isCurrentYear orcamento={orcamento} />,
    );
    expect(
      screen.getByText("Reservado (empenhado) no ano até agora"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sem pagar dentro do ano/)).toBeNull();
  });

  it("sem despesas diz que o portal não tem dado", () => {
    render(
      <SaudeMemoriaCalculo
        ano={2025}
        isCurrentYear={false}
        orcamento={{ empenhado: 0, liquidado: 0, pago: 0 }}
      />,
    );
    expect(
      screen.getByText(/não tem despesas de saúde registradas para 2025/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("meter", { hidden: true })).toHaveLength(0);
  });
});
