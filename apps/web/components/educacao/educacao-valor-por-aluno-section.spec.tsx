import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ValorPorAlunoView } from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoValorPorAlunoSection } from "./educacao-valor-por-aluno-section";

const base: ValorPorAlunoView = {
  ano: 2024,
  valor: 11000,
  parcial: false,
  periodo: 6,
  semValorCausa: null,
  anoAnterior: 2023,
  variacaoValor: 1000,
  variacaoPercentual: 10,
  serie: [
    { ano: 2023, valor: 10000, parcial: false, periodo: 6 },
    { ano: 2024, valor: 11000, parcial: false, periodo: 6 },
  ],
};

describe("EducacaoValorPorAlunoSection", () => {
  it("mostra pergunta, valor e variação com palavra", () => {
    render(<EducacaoValorPorAlunoSection valorPorAluno={base} />);
    expect(
      screen.getByText(
        "Quanto a Prefeitura investe por aluno da rede municipal?",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/subiu/)).toBeTruthy();
    expect(screen.getByText("Ver detalhes")).toBeTruthy();
  });

  it("ano parcial não compara e sem valor mostra a causa", () => {
    const { rerender } = render(
      <EducacaoValorPorAlunoSection
        valorPorAluno={{
          ...base,
          parcial: true,
          periodo: 4,
          variacaoValor: null,
        }}
      />,
    );
    expect(
      screen.getByText(/não se compara com anos já fechados/),
    ).toBeTruthy();
    rerender(
      <EducacaoValorPorAlunoSection
        valorPorAluno={{
          ...base,
          valor: null,
          semValorCausa: "sem_dado_siope",
          serie: [],
        }}
      />,
    );
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText(/sem dado publicado para 2024/)).toBeTruthy();
    expect(screen.queryByText("Ver detalhes")).toBeNull();
  });

  it("mostra alunos na rede com o ano real do Censo", () => {
    render(
      <EducacaoValorPorAlunoSection
        valorPorAluno={base}
        alunosRede={{ total: 2001, anoCenso: 2023 }}
      />,
    );
    expect(screen.getByText("Alunos na rede municipal")).toBeTruthy();
    expect(screen.getByText(/2\.001/)).toBeTruthy();
    expect(screen.getByText(/Censo Escolar 2023, INEP/)).toBeTruthy();
  });

  it("sem matrícula o indicador não aparece", () => {
    render(
      <EducacaoValorPorAlunoSection valorPorAluno={base} alunosRede={null} />,
    );
    expect(screen.queryByText("Alunos na rede municipal")).toBeNull();
  });
});
