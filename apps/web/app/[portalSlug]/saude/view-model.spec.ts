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
  it("classifica HHI abaixo de 1500 como baixa concentração", () => {
    const res = classifyHhi(1200);
    expect(res).toEqual({
      hhi: 1200,
      nivel: "baixa",
      label: "Baixa",
      descricao: "Compras bem distribuídas entre múltiplos fornecedores",
    });
  });

  it("classifica HHI entre 1500 e 2499 como moderada concentração", () => {
    const res = classifyHhi(1850);
    expect(res).toEqual({
      hhi: 1850,
      nivel: "moderada",
      label: "Moderada",
      descricao: "Mercado moderadamente concentrado em poucas empresas",
    });
  });

  it("classifica HHI igual ou acima de 2500 como alta concentração", () => {
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
