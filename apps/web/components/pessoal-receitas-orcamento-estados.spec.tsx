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

  it("13º não mostra percentual quitado nem barra, e divide os dois grupos com a régua", () => {
    render(
      <DecimoTerceiroCard
        decimo13={{
          ano: 2026,
          anoAnterior: 2025,
          mesReferencia: 6,
          pago: 1_160_000,
          pagoAnoAnterior: null,
          pagoAnoAnteriorAteMesmoMes: null,
          anoAnteriorPagouSoDepois: false,
          grupos: [
            {
              grupo: "ativos",
              pago: 16_000,
              pagoAnoAnterior: 2_840_000,
              pagoAnoAnteriorAteMesmoMes: 100_000,
              abaixoDoMesmoPeriodo: true,
              temRegua: true,
              semPagamentoNosDoisPeriodos: false,
            },
            {
              grupo: "inativos_pensionistas",
              pago: 1_144_000,
              pagoAnoAnterior: 2_080_000,
              pagoAnoAnteriorAteMesmoMes: 1_010_000,
              abaixoDoMesmoPeriodo: false,
              temRegua: true,
              semPagamentoNosDoisPeriodos: false,
            },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/Percentual quitado/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Servidores ativos")).toBeTruthy();
    expect(screen.getByText("Aposentados e pensionistas")).toBeTruthy();
    expect(screen.getAllByText(/2025 \(até junho\)/)).toHaveLength(2);
    expect(screen.getAllByText(/Abaixo de 2025 no mesmo período/)).toHaveLength(
      1,
    );
  });

  it("13º sem ano anterior mostra só o pago acumulado", () => {
    render(
      <DecimoTerceiroCard
        decimo13={{
          ano: 2026,
          anoAnterior: null,
          mesReferencia: 6,
          pago: 300,
          pagoAnoAnterior: null,
          pagoAnoAnteriorAteMesmoMes: null,
          anoAnteriorPagouSoDepois: false,
          grupos: [
            {
              grupo: "ativos",
              pago: 300,
              pagoAnoAnterior: null,
              pagoAnoAnteriorAteMesmoMes: null,
              abaixoDoMesmoPeriodo: false,
              temRegua: false,
              semPagamentoNosDoisPeriodos: false,
            },
            {
              grupo: "inativos_pensionistas",
              pago: 0,
              pagoAnoAnterior: null,
              pagoAnoAnteriorAteMesmoMes: null,
              abaixoDoMesmoPeriodo: false,
              temRegua: false,
              semPagamentoNosDoisPeriodos: true,
            },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/2025/)).toBeNull();
    expect(screen.queryByText(/Abaixo de/)).toBeNull();
  });

  it("13º sem pagamento no ano e no mesmo período do anterior explica em vez de barras vazias", () => {
    render(
      <DecimoTerceiroCard
        decimo13={{
          ano: 2026,
          anoAnterior: 2025,
          mesReferencia: 10,
          pago: 0,
          pagoAnoAnterior: 4_500_000,
          pagoAnoAnteriorAteMesmoMes: 0,
          anoAnteriorPagouSoDepois: true,
          grupos: [
            {
              grupo: "ativos",
              pago: 0,
              pagoAnoAnterior: 4_500_000,
              pagoAnoAnteriorAteMesmoMes: 0,
              abaixoDoMesmoPeriodo: false,
              temRegua: true,
              semPagamentoNosDoisPeriodos: true,
            },
            {
              grupo: "inativos_pensionistas",
              pago: 0,
              pagoAnoAnterior: 40_000,
              pagoAnoAnteriorAteMesmoMes: 0,
              abaixoDoMesmoPeriodo: false,
              temRegua: true,
              semPagamentoNosDoisPeriodos: true,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getAllByText(/Nenhum pagamento registrado até outubro/),
    ).toHaveLength(2);
    expect(screen.getAllByText(/foram pagos depois/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Abaixo de/)).toBeNull();
  });

  it("13º sem pagamento no ano corrente e com ano anterior mostra o total do ano anterior", () => {
    render(
      <DecimoTerceiroCard
        decimo13={{
          ano: 2026,
          anoAnterior: 2025,
          mesReferencia: null,
          pago: 0,
          pagoAnoAnterior: 700,
          pagoAnoAnteriorAteMesmoMes: null,
          anoAnteriorPagouSoDepois: false,
          grupos: [
            {
              grupo: "ativos",
              pago: 0,
              pagoAnoAnterior: 700,
              pagoAnoAnteriorAteMesmoMes: null,
              abaixoDoMesmoPeriodo: false,
              temRegua: false,
              semPagamentoNosDoisPeriodos: true,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getAllByText(/Nenhum pagamento registrado em 2026/),
    ).toHaveLength(1);
    expect(screen.getAllByText(/Em 2025, foram pagos/).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/Abaixo de/)).toBeNull();
  });
});
