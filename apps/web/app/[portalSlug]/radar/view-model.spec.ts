import { describe, expect, it } from "vitest";
import type { loadRadarData } from "./loader";
import {
  buildRadarHistoricoViewModel,
  buildResumoSeveridadeLabel,
} from "./view-model";

type RawData = Awaited<ReturnType<typeof loadRadarData>>;

function makeRawRadarData(overrides: Partial<RawData> = {}): RawData {
  return {
    portalSlug: "porciuncula",
    portalConfig: {
      displayName: "Porciúncula",
      stateUF: "RJ",
    } as unknown as RawData["portalConfig"],
    entidades: [],
    alertas: [],
    entidade: undefined,
    ...overrides,
  };
}

describe("buildRadarHistoricoViewModel", () => {
  it("retorna emptyState amigável e seções vazias quando não houver alertas", () => {
    const raw = makeRawRadarData({ alertas: [] });
    const vm = buildRadarHistoricoViewModel(raw);

    expect(vm.hasAlertas).toBe(false);
    expect(vm.totalAlertasGeral).toBe(0);
    expect(vm.secoes).toHaveLength(0);
    expect(vm.emptyState.title).toContain("Plena Conformidade Histórica");
    expect(vm.emptyState.message).toContain("Porciúncula");
  });

  it("agrupa alertas por ano em ordem cronológica decrescente e oculta anos sem alertas", () => {
    const raw = makeRawRadarData({
      alertas: [
        // Alerta de 2023
        {
          anomaliaId: "anomalia-2023-1",
          portalSlug: "porciuncula",
          ano: 2023,
          tipoAnomalia: "concentracao_dispensa",
          dimensaoReferencia: "dispensas",
          grauSeveridade: "moderado",
          desvioPercentual: 20,
          valorObservado: 50,
          valorEsperado: 30,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_processos",
        },
        // Alertas de 2026
        {
          anomaliaId: "anomalia-2026-1",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "opacidade_gastos_genericos",
          dimensaoReferencia: "gastos_genericos",
          grauSeveridade: "alto",
          desvioPercentual: 1.03,
          valorObservado: 30.31,
          valorEsperado: 30.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "limite_normativo",
        },
        {
          anomaliaId: "anomalia-2026-2",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "explosao_comissionados",
          dimensaoReferencia: "comissionados",
          grauSeveridade: "critico",
          desvioPercentual: 45,
          valorObservado: 120,
          valorEsperado: 80,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_estoque",
        },
        // Alerta de 2024
        {
          anomaliaId: "anomalia-2024-1",
          portalSlug: "porciuncula",
          ano: 2024,
          tipoAnomalia: "rombo_caixa",
          dimensaoReferencia: "recursos_livres",
          grauSeveridade: "critico",
          desvioPercentual: 60,
          valorObservado: 200000,
          valorEsperado: 1500000,
          mesInicial: 12,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "iqr_estoque",
        },
      ],
    });

    const vm = buildRadarHistoricoViewModel(raw);

    expect(vm.hasAlertas).toBe(true);
    expect(vm.totalAlertasGeral).toBe(4);
    // Deve conter seções para 2026, 2024 e 2023. O ano 2025 não teve alertas e deve ser omitido!
    expect(vm.secoes).toHaveLength(3);
    expect(vm.secoes[0].ano).toBe(2026);
    expect(vm.secoes[1].ano).toBe(2024);
    expect(vm.secoes[2].ano).toBe(2023);

    // Seção 2026
    const sec2026 = vm.secoes[0];
    expect(sec2026.totalAlertas).toBe(2);
    expect(sec2026.alertasCriticos).toBe(1);
    expect(sec2026.alertasAltos).toBe(1);
    expect(sec2026.cards).toHaveLength(2);

    // Seção 2024
    const sec2024 = vm.secoes[1];
    expect(sec2024.totalAlertas).toBe(1);
    expect(sec2024.alertasCriticos).toBe(1);

    // Seção 2023
    const sec2023 = vm.secoes[2];
    expect(sec2023.totalAlertas).toBe(1);
    expect(sec2023.alertasModerados).toBe(1);
  });

  it("repassa raw.entidade para os cards do radar histórico", () => {
    const raw = makeRawRadarData({
      entidade: "saude",
      alertas: [
        {
          anomaliaId: "anomalia-2026-1",
          portalSlug: "porciuncula",
          ano: 2026,
          tipoAnomalia: "opacidade_gastos_genericos",
          dimensaoReferencia: "gastos_genericos",
          grauSeveridade: "alto",
          desvioPercentual: 1.03,
          valorObservado: 30.31,
          valorEsperado: 30.0,
          mesInicial: 1,
          mesFinal: 12,
          licitacaoNumero: null,
          metodoDeteccao: "limite_normativo",
        },
      ],
    });
    const vm = buildRadarHistoricoViewModel(raw);
    expect(vm.secoes[0].cards[0].ctaUrl).toContain("&entidade=saude");
  });
});

describe("buildResumoSeveridadeLabel", () => {
  it("formata contadores de severidade em label conciso", () => {
    expect(buildResumoSeveridadeLabel(1, 2, 0)).toBe("1 crítico, 2 atenção");
    expect(buildResumoSeveridadeLabel(2, 0, 1)).toBe(
      "2 críticos, 1 acompanhamento",
    );
    expect(buildResumoSeveridadeLabel(0, 0, 0)).toBe("Normal");
  });
});
