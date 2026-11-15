import { describe, expect, it } from "vitest";
import type { loadReceitasData } from "./loader";
import { buildReceitasViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadReceitasData>>;

function makeFonte(overrides: Record<string, unknown> = {}) {
  return {
    receitaPropriaPrevisto: 1000,
    receitaPropriaArrecadado: 900,
    transferenciasUniaoPrevisto: 500,
    transferenciasUniaoArrecadado: 400,
    transferenciasEstadoPrevisto: 300,
    transferenciasEstadoArrecadado: 200,
    receitaExtraOrcamentariaArrecadado: 50,
    totalPrevisto: 1800,
    totalArrecadado: 1550,
    pctPropria: 58,
    pctArrecadado: 0.86,
    alertaDependencia: false,
    totalPctChange: 5,
    emendasTotalArrecadado: 0,
    emendasTotalEmpenhado: 0,
    emendasPixArrecadado: 0,
    emendasIndividuaisArrecadado: 0,
    fpmArrecadado: 0,
    icmsArrecadado: 0,
    issIptuArrecadado: 0,
    ...overrides,
  };
}

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    fonte: makeFonte(),
    frescorFontes: [
      {
        fonte: "portal_municipal",
        descricaoDados: "sistema contábil da Prefeitura",
        frequenciaEsperada: "diaria",
        ultimaColetaEm: "2026-11-12T08:00:00.000Z",
        situacao: "coleta_em_dia",
      },
    ],
    ...overrides,
  } as unknown as RawData;
}

describe("buildReceitasViewModel", () => {
  it("repassa a origem das entradas fora do orçamento à linha correspondente", () => {
    const origem = [
      {
        categoria: "imposto_renda_retido",
        valorArrecadado: 10,
        percentualDoTotal: 100,
      },
    ];
    const vm = buildReceitasViewModel(makeRaw({ origemExtra: origem }));
    const linha = vm.origensData.find((item) => item.semPrevisao);
    expect(linha?.origem).toEqual(origem);
  });

  it("usa valores zerados quando não há fonte de receita disponível", () => {
    const vm = buildReceitasViewModel(makeRaw({ fonte: undefined }));
    expect(vm.totalArr).toBe(0);
    expect(vm.totalPrev).toBe(0);
    expect(vm.rec.alertaDependencia).toBe(false);
  });

  it("compara a arrecadação com o ano anterior quando ela subiu", () => {
    const vm = buildReceitasViewModel(
      makeRaw({ fonte: makeFonte({ totalPctChange: 12.3 }) }),
    );
    expect(vm.comparacaoArrecadacao).toEqual({
      direcao: "alta",
      texto:
        "A Prefeitura arrecadou 12,3% a mais que em 2023, sem descontar a inflação.",
    });
  });

  it("compara a arrecadação com o ano anterior quando ela caiu", () => {
    const vm = buildReceitasViewModel(
      makeRaw({ fonte: makeFonte({ totalPctChange: -8 }) }),
    );
    expect(vm.comparacaoArrecadacao).toEqual({
      direcao: "queda",
      texto:
        "A Prefeitura arrecadou 8,0% a menos que em 2023, sem descontar a inflação.",
    });
  });

  it("não compara quando não há ano anterior", () => {
    const vm = buildReceitasViewModel(
      makeRaw({ fonte: makeFonte({ totalPctChange: null }) }),
    );
    expect(vm.comparacaoArrecadacao).toBeNull();
  });

  it("não compara ano em andamento com ano fechado", () => {
    const vm = buildReceitasViewModel(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
        fonte: makeFonte({ totalPctChange: -14.9 }),
      }),
    );
    expect(vm.comparacaoArrecadacao).toEqual({
      direcao: null,
      texto:
        "Ano em andamento: ainda não dá para comparar com o ano anterior inteiro.",
    });
  });

  it("calcula pctRealizado como 0 quando o previsto é 0 (evita divisão por zero)", () => {
    const vm = buildReceitasViewModel(
      makeRaw({
        fonte: makeFonte({
          transferenciasUniaoPrevisto: 0,
          transferenciasUniaoArrecadado: 0,
        }),
      }),
    );
    const transferenciasUniao = vm.origensData.find(
      (o) => o.fonte === "Transferências da União",
    );
    expect(transferenciasUniao?.pctRealizado).toBe(0);
  });

  it("mapeia emendasTotalEmpenhado corretamente a partir do loader", () => {
    const vm = buildReceitasViewModel(
      makeRaw({ fonte: makeFonte({ emendasTotalEmpenhado: 75000 }) }),
    );
    expect(vm.rec.emendasTotalEmpenhado).toBe(75000);
  });

  it("usa 0 como fallback para emendasTotalEmpenhado quando ausente", () => {
    const vm = buildReceitasViewModel(makeRaw({ fonte: undefined }));
    expect(vm.rec.emendasTotalEmpenhado).toBe(0);
  });

  it("resolve cardDependencia como null quando não há alertas de dependência", () => {
    const vm = buildReceitasViewModel(makeRaw({ radarAlertas: [] }));
    expect(vm.cardDependencia).toBeNull();
  });

  it("resolve cardDependencia a partir do radarAlertas quando há anomalia de dependência de transferências", () => {
    const vm = buildReceitasViewModel(
      makeRaw({
        radarAlertas: [
          {
            anomaliaId: "anomalia-dep-1",
            portalSlug: "porciuncula_prefeitura",
            ano: 2024,
            tipoAnomalia: "dependencia_transferencias",
            dimensaoReferencia: "receita_propria",
            grauSeveridade: "critico",
            desvioPercentual: 5.0,
            valorObservado: 5.0,
            valorEsperado: 10.0,
            mesInicial: 1,
            mesFinal: 12,
            licitacaoNumero: null,
            metodoDeteccao: "art11_lrf_arrecadacao_propria",
          },
        ],
      }),
    );
    expect(vm.cardDependencia).not.toBeNull();
    expect(vm.cardDependencia?.tipoAnomalia).toBe("dependencia_transferencias");
    expect(vm.cardDependencia?.titulo).toBe(
      "Dependência de Transferências Externas",
    );
    expect(vm.cardDependencia?.valorObservadoFormatted).toBe("5%");
    expect(vm.cardDependencia?.valorEsperadoFormatted).toBe("10%");
  });

  it("monta o selo da fonte portal_municipal com link para a página do portal", () => {
    const vm = buildReceitasViewModel(makeRaw());
    expect(vm.seloFonte).toMatchObject({
      dataVerificacao: "12/11/2026",
      aviso: null,
      href: "/porciuncula_prefeitura/como-atualizamos",
    });
  });

  it("sem linha da fonte portal_municipal não há selo", () => {
    expect(
      buildReceitasViewModel(makeRaw({ frescorFontes: [] })).seloFonte,
    ).toBeNull();
  });
});
