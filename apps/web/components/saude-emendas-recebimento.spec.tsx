import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaudeEmendasSection } from "./saude-emendas-section";

const emenda = (valorRecebidoFundo: number) => ({
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
});

const stats = (totalRecebidoFundo: number) => ({
  totalAutorizado: 1_000_000,
  totalEmpenhado: 0,
  totalRecebidoFundo,
  taxaEmpenho: 0,
  maiorEmenda: 1_000_000,
  lista: [emenda(totalRecebidoFundo)],
});

describe("SaudeEmendasSection: chegada do dinheiro", () => {
  it("mostra quanto chegou como receita e avisa que o empenho do cadastro pode estar desatualizado", () => {
    const { container } = render(
      <SaudeEmendasSection ano={2026} emendasStats={stats(1_000_000)} />,
    );
    expect(screen.getByText("Chegou à entidade")).toBeTruthy();
    expect(container.textContent).toMatch(/pode estar desatualizado/);
    expect(container.textContent).toMatch(/identificados pelo valor/);
    expect(screen.getByText("Recebida como receita")).toBeTruthy();
  });

  it("diz que não foi possível identificar quando nada aparece como receita", () => {
    const { container } = render(
      <SaudeEmendasSection ano={2026} emendasStats={stats(0)} />,
    );
    expect(container.textContent).toMatch(/Não foi possível identificar/);
    expect(screen.queryByText("Recebida como receita")).toBeNull();
  });
});
