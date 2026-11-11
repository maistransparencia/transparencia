import { describe, expect, it } from "vitest";
import type { loadDespesasData } from "./loader";
import { buildDespesasViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadDespesasData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    metricasGerais: {
      empenhado: 1000,
      liquidado: 800,
      pago: 700,
      taxaLiquidacao: 80,
      taxaPagamento: 70,
    },
    radarGastosSensiveis: {
      itens: [],
      anoAtual: 2024,
      anoAnterior: 2023,
    },
    restosResumo: {
      totalPendente: 200,
      totalLiquidadoPendente: 50,
      fornecedoresAguardando: 5,
      dividaMaisAntigaAno: 2021,
      topFornecedores: [],
    },
    opacidadeContabil: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      exercicioAtual: {
        portalSlug: "porciuncula_prefeitura",
        ano: 2024,
        totalEmpenhos: 100,
        empenhosResidual99: 20,
        empenhosDesvioSensivel99: 5,
        taxaEmpenhosOpacidadePct: 20.0,
        totalPago: 100000,
        pagoResidual99: 20000,
        pagoDesvioSensivel99: 5000,
        taxaValorOpacidadePct: 20.0,
        taxaDesvioSensivelPct: 25.0,
        classificacaoRisco: "atencao",
      },
      historico: [],
      topCredores: [],
      limiares: { limiteAtencaoPct: 15, limiteCriticoPct: 30 },
      basesLegais: [],
    },
    ...overrides,
  } as unknown as RawData;
}

describe("buildDespesasViewModel", () => {
  it("repassa os dados brutos para o shape final sem perder informação", () => {
    const raw = makeRaw();
    const vm = buildDespesasViewModel(raw);
    expect(vm.selectedYear).toBe(raw.context.selectedYear);
    expect(vm.isCurrentYear).toBe(raw.context.isCurrentYear);
    expect(vm.metricasGerais).toEqual(raw.metricasGerais);
    expect(vm.radarGastosSensiveis).toEqual(raw.radarGastosSensiveis);
    expect(vm.restosResumo).toEqual(raw.restosResumo);
    expect(vm.opacidadeContabil).toEqual(raw.opacidadeContabil);
  });

  it("ordena as áreas por etapa e calcula percentual sobre a soma da mesma etapa", () => {
    const vm = buildDespesasViewModel(
      makeRaw({
        areasPorFuncao: [
          {
            funcaoCodigo: "10",
            funcaoNome: "Saúde",
            totalEmpenhado: 100,
            totalLiquidado: 90,
            totalPago: 10,
          },
          {
            funcaoCodigo: "12",
            funcaoNome: "Educação",
            totalEmpenhado: 300,
            totalLiquidado: 60,
            totalPago: 30,
          },
        ],
      }),
    );
    expect(vm.areasPorEtapa.pago.map((a) => a.nome)).toEqual([
      "Educação",
      "Saúde",
    ]);
    expect(vm.areasPorEtapa.liquidado.map((a) => a.nome)).toEqual([
      "Saúde",
      "Educação",
    ]);
    expect(vm.areasPorEtapa.pago[0]?.percentualEtapa).toBe(75);
    expect(vm.areasPorEtapa.pago[0]?.larguraBarra).toBe(100);
    expect(vm.areasPorEtapa.pago[1]?.larguraBarra).toBeCloseTo(33.33, 1);
    // etapas nunca são somadas: cada linha mantém os três valores separados
    expect(vm.areasPorEtapa.empenhado[0]).toMatchObject({
      empenhado: 300,
      liquidado: 60,
      pago: 30,
      valor: 300,
    });
  });

  it("áreas e fornecedores vazios geram listas vazias", () => {
    const vm = buildDespesasViewModel(makeRaw());
    expect(vm.areasPorEtapa.pago).toEqual([]);
    expect(vm.fornecedoresLinhas).toEqual([]);
  });

  it("percentual de fornecedor usa o total pago geral, não o do DTO", () => {
    const vm = buildDespesasViewModel(
      makeRaw({
        topFornecedores: [
          {
            fornecedorNome: "Empresa A",
            fornecedorCpfCnpj: "00.000.000/0001-00",
            totalPago: 70,
            totalEmpenhado: 80,
            percentualPago: 100,
          },
        ],
      }),
    );
    expect(vm.fornecedoresLinhas[0]).toMatchObject({
      nome: "Empresa A",
      documento: "00.000.000/0001-00",
      valorPago: 70,
      percentualTotalPago: 10,
    });
  });

  it("total pago zero não divide por zero", () => {
    const vm = buildDespesasViewModel(
      makeRaw({
        metricasGerais: {
          empenhado: 0,
          liquidado: 0,
          pago: 0,
          taxaLiquidacao: 0,
          taxaPagamento: 0,
        },
        topFornecedores: [
          {
            fornecedorNome: "Empresa A",
            fornecedorCpfCnpj: null,
            totalPago: 0,
            totalEmpenhado: 0,
            percentualPago: 0,
          },
        ],
      }),
    );
    expect(vm.fornecedoresLinhas[0]?.percentualTotalPago).toBe(0);
  });
});
