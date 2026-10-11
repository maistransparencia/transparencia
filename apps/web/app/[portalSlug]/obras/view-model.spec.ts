import { describe, expect, it } from "vitest";
import {
  buildObrasViewModel,
  getMapCenter,
  getSituacaoVisual,
} from "./view-model";

describe("obras/view-model", () => {
  describe("getSituacaoVisual", () => {
    it("mapeia 'em_execucao' para estilo esmeralda e rótulo 'Em Execução'", () => {
      const visual = getSituacaoVisual("em_execucao");
      expect(visual.label).toBe("Em Execução");
      expect(visual.colorHex).toBe("#059669");
      expect(visual.badgeClass).toContain("text-emerald-700");
    });

    it("mapeia 'paralisada' para estilo vermelho e rótulo 'Paralisada'", () => {
      const visual = getSituacaoVisual("paralisada");
      expect(visual.label).toBe("Paralisada");
      expect(visual.colorHex).toBe("#dc2626");
      expect(visual.badgeClass).toContain("text-rose-700");
    });

    it("mapeia 'concluida' para estilo azul e rótulo 'Concluída'", () => {
      const visual = getSituacaoVisual("concluida");
      expect(visual.label).toBe("Concluída");
      expect(visual.colorHex).toBe("#2563eb");
      expect(visual.badgeClass).toContain("text-sky-700");
    });

    it("mapeia 'cadastrada' e 'cancelada' com estilos neutros", () => {
      const cad = getSituacaoVisual("cadastrada");
      expect(cad.label).toBe("Cadastrada");
      expect(cad.colorHex).toBe("#64748b");

      const canc = getSituacaoVisual("cancelada");
      expect(canc.label).toBe("Cancelada");
      expect(canc.colorHex).toBe("#475569");
    });

    it("usa fallback para status não mapeado", () => {
      const visual = getSituacaoVisual("status_desconhecido");
      expect(visual.label).toBe("Cadastrada");
    });
  });

  describe("getMapCenter", () => {
    it("calcula média dos marcadores quando disponíveis", () => {
      const center = getMapCenter([
        {
          idProjeto: "1",
          nomeObra: "Obra 1",
          situacao: "em_execucao",
          situacaoLabel: "Em Execução",
          situacaoColorHex: "#059669",
          latitude: -20.0,
          longitude: -40.0,
          valorInvestimentoFormatado: "R$ 100.000",
          percentualExecucaoFormatado: "50%",
          orgaoResponsavel: "Sec",
          dataFimPrevistaFormatada: "01/01/2026",
        },
        {
          idProjeto: "2",
          nomeObra: "Obra 2",
          situacao: "concluida",
          situacaoLabel: "Concluída",
          situacaoColorHex: "#2563eb",
          latitude: -22.0,
          longitude: -42.0,
          valorInvestimentoFormatado: "R$ 200.000",
          percentualExecucaoFormatado: "100%",
          orgaoResponsavel: "Sec",
          dataFimPrevistaFormatada: "01/01/2026",
        },
      ]);
      expect(center[0]).toBeCloseTo(-21.0);
      expect(center[1]).toBeCloseTo(-41.0);
    });

    it("usa fallback neutro genérico quando não houver marcadores disponíveis", () => {
      const center = getMapCenter([]);
      expect(center[0]).toBeCloseTo(-21.0);
      expect(center[1]).toBeCloseTo(-42.0);
    });
  });

  describe("buildObrasViewModel", () => {
    it("transforma dados brutos em view model rico e filtra marcadores sem coordenadas", () => {
      const rawData = {
        portalSlug: "porciuncula_prefeitura",
        portalConfig: {
          displayName: "Porciúncula",
          uf: "RJ",
        } as unknown as Awaited<
          ReturnType<typeof import("@transparencia/db").getPortalConfig>
        >,
        filtros: {
          status: "todas" as const,
        },
        resumo: {
          totalObras: 3,
          emExecucao: 1,
          paralisadas: 1,
          concluidas: 1,
          cadastradas: 0,
          canceladas: 0,
          valorTotalInvestimento: 3500000,
          percentualMedioExecucaoFisica: 55.0,
        },
        obras: [
          {
            idProjeto: "OBR-01",
            portalSlug: "porciuncula_prefeitura",
            nomeObra: "Pavimentação do Bairro Centro",
            situacao: "em_execucao",
            orgaoResponsavel: "Secretaria de Obras",
            valorInvestimentoPrevisto: 1500000,
            percentualExecucaoFisica: 45.5,
            dataUltimaMedicao: "2026-06-01",
            latitude: -20.9634,
            longitude: -42.0408,
            motivoParalisacao: null,
            dataInicioPrevista: "2026-01-01",
            dataFimPrevista: "2026-12-31",
          },
          {
            idProjeto: "OBR-02",
            portalSlug: "porciuncula_prefeitura",
            nomeObra: "Construção de Creche Municipal",
            situacao: "paralisada",
            orgaoResponsavel: "Secretaria de Educação",
            valorInvestimentoPrevisto: 1200000,
            percentualExecucaoFisica: 20.0,
            dataUltimaMedicao: "2026-03-15",
            latitude: -20.965,
            longitude: -42.042,
            motivoParalisacao: "Recisão contratual com a empreiteira",
            dataInicioPrevista: "2025-06-01",
            dataFimPrevista: "2026-08-30",
          },
          {
            idProjeto: "OBR-03",
            portalSlug: "porciuncula_prefeitura",
            nomeObra: "Iluminação Rural sem Coordenadas",
            situacao: "concluida",
            orgaoResponsavel: null,
            valorInvestimentoPrevisto: 800000,
            percentualExecucaoFisica: null,
            dataUltimaMedicao: null,
            latitude: null,
            longitude: null,
            motivoParalisacao: null,
            dataInicioPrevista: null,
            dataFimPrevista: null,
          },
        ],
      };

      const vm = buildObrasViewModel(rawData);

      expect(vm.municipioNome).toBe("Porciúncula");
      expect(vm.kpis.totalObras).toBe(3);
      expect(vm.kpis.emExecucao).toBe(1);
      expect(vm.kpis.paralisadas).toBe(1);
      expect(vm.kpis.valorTotalInvestimentoFormatado).toContain("3.500.000");

      expect(vm.obras).toHaveLength(3);
      expect(vm.markers).toHaveLength(2); // OBR-03 não tem coordenadas
      expect(vm.totalGeorreferenciadas).toBe(2);
      expect(vm.totalNaoGeorreferenciadas).toBe(1);

      // Valida obra sem coordenadas
      const obraSemGeo = vm.obras.find((o) => o.idProjeto === "OBR-03");
      expect(obraSemGeo?.hasCoordinates).toBe(false);
      expect(obraSemGeo?.orgaoResponsavel).toBe("Órgão não informado");
      expect(obraSemGeo?.percentualExecucaoFormatado).toBe("Não informado");

      // Valida obra paralisada com motivo
      const obraParalisada = vm.obras.find((o) => o.idProjeto === "OBR-02");
      expect(obraParalisada?.motivoParalisacao).toBe(
        "Recisão contratual com a empreiteira",
      );
      expect(obraParalisada?.situacaoLabel).toBe("Paralisada");
    });
  });
});
