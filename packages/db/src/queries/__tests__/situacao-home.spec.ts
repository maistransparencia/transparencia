import { describe, expect, it } from "vitest";
import {
  type CalcularSituacaoHomeParams,
  calcularSituacaoHome,
} from "../situacao-home";

const base: CalcularSituacaoHomeParams = {
  anoFechado: true,
  minimoSaude: { resultado: "cumpriu" },
  resumoObras: { totalObras: 5, paralisadas: 0 },
  minimoEducacao: { resultado: "cumpriu" },
};

describe("calcularSituacaoHome", () => {
  it("área normal não ganha etiqueta", () => {
    expect(calcularSituacaoHome(base)).toEqual({
      saude: { estado: "normal", emAtencao: false, motivo: null },
      obras: { estado: "normal", emAtencao: false, motivo: null },
      educacao: { estado: "normal", emAtencao: false, motivo: null },
    });
  });

  it("mínimo abaixo em ano fechado dispara abaixo_minimo em saúde e educação", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      minimoSaude: { resultado: "abaixo" },
      minimoEducacao: { resultado: "abaixo" },
    });
    const esperado = {
      estado: "abaixo",
      emAtencao: true,
      motivo: "abaixo_minimo",
    };
    expect(situacao.saude).toEqual(esperado);
    expect(situacao.educacao).toEqual(esperado);
  });

  it("mínimo abaixo em ano em andamento não dispara", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      anoFechado: false,
      minimoSaude: { resultado: "abaixo" },
    });
    expect(situacao.saude).toEqual({
      estado: "abaixo",
      emAtencao: false,
      motivo: null,
    });
  });

  it("obra paralisada dispara obra_paralisada com ao menos uma obra", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      resumoObras: { totalObras: 5, paralisadas: 1 },
    });
    expect(situacao.obras).toEqual({
      estado: "normal",
      emAtencao: true,
      motivo: "obra_paralisada",
    });
  });

  it("mínimo parcial nunca gera atenção", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      minimoSaude: { resultado: "parcial" },
      minimoEducacao: { resultado: "parcial" },
    });
    expect(situacao.saude).toEqual({
      estado: "parcial",
      emAtencao: false,
      motivo: null,
    });
    expect(situacao.educacao.emAtencao).toBe(false);
  });

  it("mínimo sem_dado ou indeterminado vira sem_dado e não gera atenção", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      minimoSaude: { resultado: "indeterminado" },
      minimoEducacao: { resultado: "sem_dado" },
    });
    expect(situacao.saude).toEqual({
      estado: "sem_dado",
      emAtencao: false,
      motivo: null,
    });
    expect(situacao.educacao).toEqual({
      estado: "sem_dado",
      emAtencao: false,
      motivo: null,
    });
  });

  it("apagão da farmácia não gera atenção", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      farmaciaStatus: "apagao",
    });
    expect(situacao.saude.emAtencao).toBe(false);
    expect(situacao.saude.motivo).toBeNull();
  });

  it("queda do Ideb não gera atenção", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      crescimentoPontosIdeb: -0.6,
    });
    expect(situacao.educacao.emAtencao).toBe(false);
    expect(situacao.educacao.motivo).toBeNull();
  });

  it("fonte ausente vira indisponivel, sem atenção", () => {
    const situacao = calcularSituacaoHome({
      anoFechado: true,
      minimoSaude: null,
      resumoObras: null,
      minimoEducacao: null,
    });
    const esperado = { estado: "indisponivel", emAtencao: false, motivo: null };
    expect(situacao).toEqual({
      saude: esperado,
      obras: esperado,
      educacao: esperado,
    });
  });

  it("cidade sem obras fica sem_dado e sem atenção", () => {
    const situacao = calcularSituacaoHome({
      ...base,
      resumoObras: { totalObras: 0, paralisadas: 0 },
    });
    expect(situacao.obras).toEqual({
      estado: "sem_dado",
      emAtencao: false,
      motivo: null,
    });
  });
});
