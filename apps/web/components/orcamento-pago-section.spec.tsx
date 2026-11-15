import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  OrcamentoPagoSection,
  type OrcamentoPagoSectionProps,
} from "./orcamento-pago-section";

const baseProps: OrcamentoPagoSectionProps = {
  pagoTitle: "Pago no ano até agora",
  totalPago: 118_600_000,
  totalDotacao: 206_100_000,
  percentualPago: 58,
  anoEmAndamento: true,
  anoAnterior: 2025,
  percentualPagoAnoAnterior: 91,
  posicaoFinanceira: null,
  ano: 2026,
  orcamentoDetailUrl: "/porciuncula_prefeitura/orcamento?exercicio=2026",
  hasEntityFilter: false,
};

describe("OrcamentoPagoSection", () => {
  it("mostra o pago sobre o orçamento autorizado, igual ao destaque de /orcamento", () => {
    render(<OrcamentoPagoSection {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Para onde vai o dinheiro público" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /58% dos .* que a Prefeitura foi autorizada a gastar em 2026/,
      ),
    ).toBeInTheDocument();
  });

  it("avisa que o ano em andamento acumula pagamentos até dezembro", () => {
    render(<OrcamentoPagoSection {...baseProps} />);
    expect(screen.getByText(/Ano em andamento/)).toBeInTheDocument();
  });

  it("ano fechado não traz o aviso de ano em andamento", () => {
    render(<OrcamentoPagoSection {...baseProps} anoEmAndamento={false} />);
    expect(screen.queryByText(/Ano em andamento/)).toBeNull();
  });

  it("compara com o ano anterior inteiro quando há dado", () => {
    render(<OrcamentoPagoSection {...baseProps} />);
    expect(
      screen.getByText(
        /em 2025, o ano inteiro terminou com 91% do orçamento pago/,
      ),
    ).toBeInTheDocument();
  });

  it("sem ano anterior, não mostra a comparação", () => {
    render(
      <OrcamentoPagoSection {...baseProps} percentualPagoAnoAnterior={null} />,
    );
    expect(screen.queryByText(/Para comparar/)).toBeNull();
  });

  it("sem orçamento autorizado, mostra estado vazio sem barra", () => {
    render(
      <OrcamentoPagoSection {...baseProps} totalDotacao={0} totalPago={0} />,
    );
    expect(
      screen.getByText(
        "Ainda não há orçamento autorizado registrado para 2026.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Para comparar/)).toBeNull();
  });

  it("Ver detalhes leva a /orcamento", () => {
    render(<OrcamentoPagoSection {...baseProps} />);
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute(
      "href",
      baseProps.orcamentoDetailUrl,
    );
  });
});
