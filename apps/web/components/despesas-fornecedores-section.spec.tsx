import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FornecedorLinha } from "@/app/[portalSlug]/despesas/view-model";
import { DespesasFornecedoresSection } from "./despesas-fornecedores-section";

const linha = (overrides: Partial<FornecedorLinha> = {}): FornecedorLinha => ({
  nome: "Empresa A",
  documento: "00.000.000/0001-00",
  valorPago: 1000,
  percentualTotalPago: 10,
  larguraBarra: 100,
  ...overrides,
});

describe("DespesasFornecedoresSection", () => {
  it("não renderiza com lista vazia", () => {
    const { container } = render(
      <DespesasFornecedoresSection fornecedores={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o documento exatamente como vem da fonte", () => {
    const { container } = render(
      <DespesasFornecedoresSection
        fornecedores={[
          linha(),
          linha({ nome: "Pessoa", documento: "***.123.456-**" }),
        ]}
      />,
    );
    expect(container.textContent).toContain("00.000.000/0001-00");
    expect(container.textContent).toContain("***.123.456-**");
    expect(container.textContent).toContain("10.00%");
  });

  it("nunca renderiza número de 11 dígitos sem máscara", () => {
    const { container } = render(
      <DespesasFornecedoresSection
        fornecedores={[linha({ documento: "12345678901" })]}
      />,
    );
    expect(container.textContent).not.toMatch(/(?<!\d)\d{11}(?!\d)/);
    expect(container.textContent).toContain("Documento não informado");
  });

  it("não renderiza CPF completo formatado sem máscara", () => {
    const { container } = render(
      <DespesasFornecedoresSection
        fornecedores={[linha({ documento: "123.456.789-01" })]}
      />,
    );
    expect(container.textContent).not.toContain("123.456.789-01");
    expect(container.textContent).toContain("Documento não informado");
  });
});
