import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaudeEmendasSection } from "./saude-emendas-section";

const emenda = (
  valorRecebidoFundo: number,
  recebimentoFundo = "confirmado_por_proposta",
) => ({
  id: "1",
  numero: "10",
  objeto: "Custeio",
  valorAutorizado: 1_000_000,
  empenhado: null,
  autor: "Autor",
  tipoEmenda: "individual",
  esferaOrigem: "federal",
  atoNormativo: "ato",
  destinacao: "custeio",
  valorRecebidoFundo,
  recebimentoFundo,
  receitaCodigo: "1713.50.1.1.29.00",
  receitaDescricao: "TRANS.SUS PORTARIA",
});

const stats = (totalRecebidoFundo: number, totalReceitaPossivel = 0) => ({
  totalAutorizado: 1_000_000,
  totalEmpenhado: 0,
  totalRecebidoFundo,
  totalReceitaPossivel,
  taxaEmpenho: 0,
  maiorEmenda: 1_000_000,
  lista: [
    emenda(
      totalRecebidoFundo,
      totalRecebidoFundo > 0 ? "confirmado_por_proposta" : "valor_igual",
    ),
  ],
});

describe("SaudeEmendasSection: chegada do dinheiro", () => {
  it("mostra quanto chegou como receita e avisa que o empenho do cadastro pode estar desatualizado", () => {
    const { container } = render(
      <SaudeEmendasSection ano={2026} emendasStats={stats(1_000_000)} />,
    );
    expect(screen.getByText("Confirmada na receita")).toBeTruthy();
    expect(container.textContent).toMatch(/pode estar desatualizado/);
    expect(container.textContent).toMatch(/com o número da proposta/);
    expect(screen.getAllByText("Aparece na receita").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/1713\.50/);
  });

  it("mostra a receita correspondente ao expandir a linha", () => {
    const { container } = render(
      <SaudeEmendasSection ano={2026} emendasStats={stats(1_000_000)} />,
    );
    const gatilho = container.querySelector<HTMLButtonElement>(
      "button[aria-expanded]",
    );
    expect(gatilho).not.toBeNull();
    if (gatilho) fireEvent.click(gatilho);
    expect(container.textContent).toMatch(/Receita correspondente/);
    expect(container.textContent).toMatch(/trans\.sus portaria/i);
    expect(container.textContent).toMatch(
      /Pelo valor e pelo número da proposta/,
    );
  });

  it("diz que não foi possível identificar quando nada aparece como receita", () => {
    const { container } = render(
      <SaudeEmendasSection ano={2026} emendasStats={stats(0)} />,
    );
    expect(container.textContent).toMatch(
      /Não foi possível identificar emendas na receita/,
    );
    expect(screen.queryByText("Aparece na receita")).toBeNull();
  });
});
