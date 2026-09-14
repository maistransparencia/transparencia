import { describe, expect, it } from "vitest";
import type { loadLicitacoesData } from "./loader";
import { buildLicitacoesViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadLicitacoesData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    gaps: [],
    adesao: { quantidade: 0 },
    adesaoExterna: { quantidade: 0 },
    anomalias: { fracionamento: [] },
    modalidades: [],
    ...overrides,
  } as unknown as RawData;
}

describe("buildLicitacoesViewModel", () => {
  it("filtra apenas os gaps acima do limite", () => {
    const vm = buildLicitacoesViewModel(
      makeRaw({
        gaps: [
          { acimaLimite: true, fornecedor: "A" },
          { acimaLimite: false, fornecedor: "B" },
          { acimaLimite: true, fornecedor: "C" },
        ],
      }),
    );
    expect(vm.acimaLimiteGaps).toHaveLength(2);
  });

  it("conta casos de fracionamento por fornecedor distinto", () => {
    const vm = buildLicitacoesViewModel(
      makeRaw({
        anomalias: {
          fracionamento: [
            { fornecedor: "Fornecedor X" },
            { fornecedor: "Fornecedor X" },
            { fornecedor: "Fornecedor Y" },
          ],
        },
      }),
    );
    expect(vm.numCasosFracionamento).toBe(2);
    expect(vm.fracionamentoVendorsMap).toEqual({
      "Fornecedor X": 2,
      "Fornecedor Y": 1,
    });
  });

  it("não indica fracionamento quando não há anomalias", () => {
    const vm = buildLicitacoesViewModel(makeRaw());
    expect(vm.numCasosFracionamento).toBe(0);
    expect(vm.fracionamentoVendorsMap).toEqual({});
  });

  it("propaga o limite de dispensa de compras e serviços vigente para a view model", () => {
    const vm = buildLicitacoesViewModel(
      makeRaw({
        limiteDispensaComprasServicos: 62725.59,
      }),
    );
    expect(vm.limiteDispensaComprasServicos).toBe(62725.59);
  });

  it("calcula taxa de contratação direta a partir das modalidades e identifica anomalia", () => {
    const vm = buildLicitacoesViewModel(
      makeRaw({
        modalidades: [
          { modalidade: "Pregão Eletrônico", valorTotal: 300000 },
          { modalidade: "Dispensa de Licitação", valorTotal: 500000 },
          { modalidade: "Inexigibilidade", valorTotal: 200000 },
        ],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: 70,
            valorEsperado: 35,
          },
        ],
        licitacoesEmAndamento: [
          {
            licitacaoId: "lic-1",
            licitacaoNumero: "001/2024",
            objeto: "Aquisição de medicamentos",
            modalidade: "pregao_eletronico",
            valor: 100000,
            valorEstimado: 100000,
            entidadeNome: "Fundo de Saúde",
          },
        ],
      }),
    );

    // Total = 1.000.000, Diretas (Dispensa + Inexigibilidade) = 700.000 -> 70%
    expect(vm.taxaContratacaoDireta).toBe(70);
    expect(vm.hasAnomaliaDispensa).toBe(true);
    expect(vm.alertaDispensa?.tipoAnomalia).toBe("concentracao_dispensa");
    expect(vm.licitacoesEmAndamento).toHaveLength(1);
    expect(vm.licitacoesEmAndamento[0].licitacaoNumero).toBe("001/2024");
  });

  it("utiliza valorObservado do alerta quando modalidades estiver vazio e sem anomalia quando alerta ausente", () => {
    const vmSemAlerta = buildLicitacoesViewModel(makeRaw({ modalidades: [] }));
    expect(vmSemAlerta.taxaContratacaoDireta).toBe(0);
    expect(vmSemAlerta.hasAnomaliaDispensa).toBe(false);

    const vmComAlerta = buildLicitacoesViewModel(
      makeRaw({
        modalidades: [],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: 48.87,
          },
        ],
      }),
    );
    expect(vmComAlerta.taxaContratacaoDireta).toBe(48.87);
    expect(vmComAlerta.hasAnomaliaDispensa).toBe(true);

    const vmComAlertaNaN = buildLicitacoesViewModel(
      makeRaw({
        modalidades: [],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: Number.NaN,
          },
        ],
      }),
    );
    expect(vmComAlertaNaN.taxaContratacaoDireta).toBe(0);
    expect(vmComAlertaNaN.hasAnomaliaDispensa).toBe(true);
  });
});
