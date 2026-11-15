import { describe, expect, it } from "vitest";
import { montarSaudeFarmaciaResumo } from "../saude-farmacia-resumo";

const indicadores = {
  totalEssenciais: 20,
  essenciaisNoEstoque: 14,
  essenciaisSomenteLoteVencido: 1,
  essenciaisSomenteCombinacao: 2,
  essenciaisSemRegistro: 3,
};

describe("montarSaudeFarmaciaResumo", () => {
  it("traz os números quando a farmácia está conforme", () => {
    expect(
      montarSaudeFarmaciaResumo(
        { status: "conforme", dataPosicaoMaisRecente: "2026-11-06" },
        { totalUnidadesAtivas: 9, indicadores },
      ),
    ).toEqual({
      status: "conforme",
      dataPosicaoMaisRecente: "2026-11-06",
      totalUnidadesAtivas: 9,
      essenciaisNoEstoque: 14,
      totalEssenciais: 20,
    });
  });

  it.each(["apagao", "indisponivel"] as const)(
    "não afirma nada sobre o estoque em %s",
    (status) => {
      const resumo = montarSaudeFarmaciaResumo(
        { status, dataPosicaoMaisRecente: "2026-10-01" },
        { totalUnidadesAtivas: 9, indicadores },
      );
      expect(resumo.totalUnidadesAtivas).toBeNull();
      expect(resumo.essenciaisNoEstoque).toBeNull();
      expect(resumo.totalEssenciais).toBeNull();
    },
  );

  it("sem unidades ativas ou sem essenciais não inventa números", () => {
    const semUnidades = montarSaudeFarmaciaResumo(
      { status: "conforme", dataPosicaoMaisRecente: null },
      { totalUnidadesAtivas: 0, indicadores },
    );
    expect(semUnidades.totalUnidadesAtivas).toBeNull();
    const semEssenciais = montarSaudeFarmaciaResumo(
      { status: "conforme", dataPosicaoMaisRecente: null },
      {
        totalUnidadesAtivas: 4,
        indicadores: { ...indicadores, totalEssenciais: 0 },
      },
    );
    expect(semEssenciais.totalUnidadesAtivas).toBe(4);
    expect(semEssenciais.essenciaisNoEstoque).toBeNull();
  });
});
