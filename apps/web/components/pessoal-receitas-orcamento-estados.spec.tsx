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
      screen.getByText(
        "Dinheiro que a prefeitura retém do salário dos servidores e de pagamentos a fornecedores (como contribuição à previdência, imposto de renda e parcelas de empréstimo) e repassa a quem de direito. Passa pelo caixa, mas em regra não é dinheiro da prefeitura.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/do previsto já arrecadado/)).toBeNull();
  });

  it("origem das entradas fora do orçamento fica recolhida e traduz categorias", () => {
    const { container } = render(
      <PrevistoVsArrecadadoOrigem
        items={[
          {
            fonte: "Entradas fora do orçamento",
            previsto: 10,
            arrecadado: 10,
            pctRealizado: 100,
            semPrevisao: true,
            origem: [
              {
                categoria: "imposto_renda_retido",
                valorArrecadado: 7,
                percentualDoTotal: 70,
              },
              {
                categoria: "categoria_desconhecida",
                valorArrecadado: 3,
                percentualDoTotal: 30,
              },
            ],
          },
        ]}
      />,
    );
    const detalhes = container.querySelector("details");
    expect(detalhes).not.toBeNull();
    expect(detalhes?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("De onde vem este valor")).toBeInTheDocument();
    expect(screen.getByText("Imposto de renda retido")).toBeInTheDocument();
    expect(
      screen.getByText("Outros descontos e retenções"),
    ).toBeInTheDocument();
    expect(screen.getByText(/70,0%/)).toBeInTheDocument();
  });

  it("sem origem das entradas fora do orçamento o bloco não aparece", () => {
    const { container } = render(
      <PrevistoVsArrecadadoOrigem
        items={[
          {
            fonte: "Entradas fora do orçamento",
            previsto: 0,
            arrecadado: 0,
            pctRealizado: 100,
            semPrevisao: true,
            origem: [],
          },
        ]}
      />,
    );
    expect(container.querySelector("details")).toBeNull();
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
