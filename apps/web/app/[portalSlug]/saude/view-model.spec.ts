import { describe, expect, it } from "vitest";
import { classifyHhi, type loadSaudeData } from "./loader";
import { buildSaudeViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadSaudeData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: { selectedYear: 2024, isCurrentYear: false },
    saude: {
      orcamento: { dotacao: 0, empenhado: 0 },
      farmaceutica: { hhi: 0, hhiClassificacao: "baixa" },
      fontesReceita: {},
      executionTrend: [],
      licitacoesSaude: [],
      emendasStats: { lista: [], totalAutorizado: 0 },
      emendas: [],
      emendasTotal: 0,
    },
    ...overrides,
  } as unknown as RawData;
}

describe("buildSaudeViewModel", () => {
  it("repassa o objeto saude computado pelo loader sem transformação", () => {
    const raw = makeRaw();
    const vm = buildSaudeViewModel(raw);
    expect(vm.saude).toBe(raw.saude);
    expect(vm.selectedYear).toBe(raw.context.selectedYear);
  });
});

describe("classifyHhi", () => {
  it("trata HHI zero, negativo ou NaN como Não aplicável", () => {
    const zeroRes = classifyHhi(0);
    expect(zeroRes).toEqual({
      hhi: 0,
      nivel: "baixa",
      label: "Não aplicável",
      descricao:
        "Sem registros de aquisições de insumos ou contratos no exercício",
    });

    const nanRes = classifyHhi(Number.NaN);
    expect(nanRes.label).toBe("Não aplicável");
  });

  it("classifica HHI abaixo de 1500 como baixa concentração", () => {
    const res = classifyHhi(1200);
    expect(res).toEqual({
      hhi: 1200,
      nivel: "baixa",
      label: "Baixa",
      descricao: "Compras bem distribuídas entre múltiplos fornecedores",
    });
  });

  it("classifica HHI exatamente em 1500 e entre 1500 e 2499 como moderada concentração", () => {
    const boundary = classifyHhi(1500);
    expect(boundary.nivel).toBe("moderada");
    expect(boundary.label).toBe("Moderada");

    const res = classifyHhi(1850);
    expect(res).toEqual({
      hhi: 1850,
      nivel: "moderada",
      label: "Moderada",
      descricao: "Mercado moderadamente concentrado em poucas empresas",
    });
  });

  it("classifica HHI exatamente em 2500 e acima como alta concentração", () => {
    const boundary = classifyHhi(2500);
    expect(boundary.nivel).toBe("alta");
    expect(boundary.label).toBe("Alta");

    const res = classifyHhi(2840);
    expect(res).toEqual({
      hhi: 2840,
      nivel: "alta",
      label: "Alta",
      descricao:
        "Alto risco de dependência: poucos fornecedores dominam os fornecimentos",
    });
  });
});
