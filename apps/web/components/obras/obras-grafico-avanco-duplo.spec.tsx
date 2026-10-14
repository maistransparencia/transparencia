import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ObrasGraficoAvancoDuplo } from "./obras-grafico-avanco-duplo";

describe("ObrasGraficoAvancoDuplo", () => {
  it("deve renderizar as barras de avanço físico e financeiro com valores formatados", () => {
    render(
      <ObrasGraficoAvancoDuplo
        percentualExecucaoFisica={45}
        percentualFisicoFormatado="45,0%"
        percentualExecucaoFinanceira={50}
        percentualFinanceiroFormatado="50,0%"
        dataUltimaMedicaoFormatada="15/06/2024"
        alertaDescompasso={{
          temDescompasso: false,
          diferencaPercentual: 0,
          mensagem: "",
        }}
      />,
    );

    expect(screen.getByTestId("grafico-avanco-duplo")).toBeInTheDocument();
    expect(screen.getByTestId("barra-execucao-fisica")).toBeInTheDocument();
    expect(screen.getByTestId("barra-execucao-financeira")).toBeInTheDocument();

    expect(screen.getByText("45,0%")).toBeInTheDocument();
    expect(screen.getByText("50,0%")).toBeInTheDocument();
    expect(screen.getByText(/15\/06\/2024/)).toBeInTheDocument();
    expect(screen.queryByTestId("alerta-descompasso")).not.toBeInTheDocument();
  });

  it("deve exibir banner de alerta quando houver descompasso físico-financeiro", () => {
    render(
      <ObrasGraficoAvancoDuplo
        percentualExecucaoFisica={20}
        percentualFisicoFormatado="20,0%"
        percentualExecucaoFinanceira={55}
        percentualFinanceiroFormatado="55,0%"
        dataUltimaMedicaoFormatada="10/05/2024"
        alertaDescompasso={{
          temDescompasso: true,
          diferencaPercentual: 35,
          mensagem:
            "Atenção: O desembolso financeiro acumulado supera em 35% o avanço físico medido em campo.",
        }}
      />,
    );

    const alerta = screen.getByTestId("alerta-descompasso");
    expect(alerta).toBeInTheDocument();
    expect(
      screen.getByText(
        "Atenção: O desembolso financeiro acumulado supera em 35% o avanço físico medido em campo.",
      ),
    ).toBeInTheDocument();
  });

  it("deve tratar graciosamente valores nulos sem quebrar o layout", () => {
    render(
      <ObrasGraficoAvancoDuplo
        percentualExecucaoFisica={null}
        percentualFisicoFormatado="Sem medição técnica registrada"
        percentualExecucaoFinanceira={null}
        percentualFinanceiroFormatado="Em apuração contábil"
        dataUltimaMedicaoFormatada="Sem registro oficial"
        alertaDescompasso={{
          temDescompasso: false,
          diferencaPercentual: 0,
          mensagem: "",
        }}
      />,
    );

    expect(
      screen.getByText("Sem medição técnica registrada"),
    ).toBeInTheDocument();
    expect(screen.getByText("Em apuração contábil")).toBeInTheDocument();
    expect(screen.getByText(/Sem registro oficial/)).toBeInTheDocument();
  });
});
