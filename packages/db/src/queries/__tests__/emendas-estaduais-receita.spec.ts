import { describe, expect, it } from "vitest";
import {
  getComparacaoReceitaEstadual,
  montarComparacaoReceita,
} from "../emendas-estaduais-receita";

const linha = (dados: Record<string, unknown> = {}) => ({
  emendas_chegam_prefeitura: 2,
  emendas_sem_pago_informado: 0,
  pago_estado_informado: 25000,
  posicao_ano_execucao_estado: 2026,
  posicao_mes_execucao_estado: 8,
  arrecadado_outras_transferencias_corrente: 10000,
  arrecadado_outras_transferencias_capital: 5000,
  arrecadado_outras_transferencias: 15000,
  hierarquia_clara: true,
  ...dados,
});

describe("montarComparacaoReceita", () => {
  it("sem linha no mart fica não identificado, sem inventar zero", () => {
    const r = montarComparacaoReceita(undefined, 2026);
    expect(r.situacao).toBe("nao_identificado");
    expect(r.pagoEstado).toBeNull();
    expect(r.arrecadadoOutrasTransferencias).toBeNull();
  });

  it("pago maior que o arrecadado: o excedente ainda não aparece e é derivado", () => {
    const r = montarComparacaoReceita(linha(), 2026);
    expect(r.situacao).toBe("pago_acima_do_registrado");
    expect(r.valorAindaNaoApareceNaReceita).toBe(10000);
    expect(r.posicaoExecucao).toBe("08/2026");
  });

  it("não soma estágios: o dto traz só o pago do Estado, sem empenhado nem liquidado", () => {
    const r = montarComparacaoReceita(linha(), 2026);
    expect(Object.keys(r)).not.toContain("empenhadoEstado");
    expect(Object.keys(r)).not.toContain("liquidadoEstado");
  });

  it("pago dentro do arrecadado não prova elo e não gera excedente", () => {
    const r = montarComparacaoReceita(
      linha({ pago_estado_informado: 8000 }),
      2026,
    );
    expect(r.situacao).toBe("dentro_do_registrado");
    expect(r.valorAindaNaoApareceNaReceita).toBeNull();
  });

  it("hierarquia não clara não compara", () => {
    const r = montarComparacaoReceita(linha({ hierarquia_clara: false }), 2026);
    expect(r.situacao).toBe("nao_identificado");
    expect(r.valorAindaNaoApareceNaReceita).toBeNull();
  });

  it("pago ausente não vira zero: nulo é não identificado", () => {
    const r = montarComparacaoReceita(
      linha({ pago_estado_informado: null, emendas_sem_pago_informado: 2 }),
      2026,
    );
    expect(r.situacao).toBe("nao_identificado");
    expect(r.pagoEstado).toBeNull();
  });

  it("pago zero informado é diferente de ausente", () => {
    const r = montarComparacaoReceita(
      linha({ pago_estado_informado: 0 }),
      2026,
    );
    expect(r.pagoEstado).toBe(0);
    expect(r.situacao).toBe("dentro_do_registrado");
  });

  it("pago parcial dentro do arrecadado não afirma que está dentro", () => {
    const r = montarComparacaoReceita(
      linha({ pago_estado_informado: 8000, emendas_sem_pago_informado: 1 }),
      2026,
    );
    expect(r.situacao).toBe("nao_identificado");
    expect(r.emendasSemPagoInformado).toBe(1);
  });

  it("pago parcial já acima do arrecadado continua valendo como piso", () => {
    const r = montarComparacaoReceita(
      linha({ emendas_sem_pago_informado: 1 }),
      2026,
    );
    expect(r.situacao).toBe("pago_acima_do_registrado");
  });

  it("relatório de outro ano que a receita não é comparado", () => {
    const r = montarComparacaoReceita(
      linha({
        posicao_ano_execucao_estado: 2025,
        posicao_mes_execucao_estado: 12,
      }),
      2026,
    );
    expect(r.situacao).toBe("exercicios_diferentes");
    expect(r.valorAindaNaoApareceNaReceita).toBeNull();
  });

  it("outro Estado e outra faixa de anos funcionam igual, sem literal de UF", () => {
    const r = montarComparacaoReceita(
      linha({
        posicao_ano_execucao_estado: 2027,
        posicao_mes_execucao_estado: 3,
        pago_estado_informado: 700,
        arrecadado_outras_transferencias: 1000,
      }),
      2027,
    );
    expect(r).toMatchObject({
      ano: 2027,
      situacao: "dentro_do_registrado",
      posicaoExecucao: "03/2027",
    });
  });
});

describe("getComparacaoReceitaEstadual", () => {
  it("portal sem dados devolve não identificado, sem erro", async () => {
    const r = await getComparacaoReceitaEstadual(
      "portal_inexistente_teste",
      2026,
    );
    expect(r.situacao).toBe("nao_identificado");
  });
});
