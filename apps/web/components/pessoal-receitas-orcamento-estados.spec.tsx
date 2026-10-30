import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DecimoTerceiroCard } from "./decimo-terceiro-card";
import { GastoPorFuncaoBars } from "./gasto-por-funcao-bars";
import { PrevistoVsArrecadadoOrigem } from "./previsto-vs-arrecadado";
import { ProventosDistributionChart } from "./proventos-distribution-chart";

describe("estados de borda no padrão Divisórias", () => {
  it("origem sem previsão não exibe percentual realizado", () => {
    render(
      <PrevistoVsArrecadadoOrigem
        items={[
          {
            fonte: "Entradas fora do orçamento",
            previsto: 10,
            arrecadado: 10,
            pctRealizado: 100,
            semPrevisao: true,
          },
        ]}
      />,
    );
    expect(
      screen.getByText("Sem valor previsto, pois não faz parte do orçamento"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/do previsto já arrecadado/)).toBeNull();
  });

  it("histograma vazio mostra mensagem com filete, sem cartão", () => {
    render(
      <ProventosDistributionChart
        data={[{ faixa: "a", min: 0, max: 1, count: 0 }]}
      />,
    );
    const mensagem = screen.getByText(/Nenhum registro de proventos/);
    expect(mensagem.className).toContain("border-y");
    expect(mensagem.className).toContain("border-line");
  });

  it("limita a largura das barras entre 0% e 100%", () => {
    const { container } = render(
      <GastoPorFuncaoBars
        maxVal={10}
        items={[
          { funcao: "A", valor: 50 },
          { funcao: "B", valor: 0 },
        ]}
      />,
    );
    const larguras = Array.from(
      container.querySelectorAll<HTMLElement>("div[style]"),
    ).map((el) => el.style.width);
    expect(larguras).toEqual(["100%", "0%"]);
  });

  it("13º com percentual acima de 100 fica limitado a 100%", () => {
    render(<DecimoTerceiroCard empenhado={10} pago={20} pctPago={2} />);
    expect(screen.getByText("100%")).toBeTruthy();
  });
});
