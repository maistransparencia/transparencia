import type { ObraContratoDTO, ObraDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import {
  buildObraDetalheViewModel,
  buildObrasViewModel,
  getMapCenter,
  getSituacaoVisual,
  mapContratoToViewModel,
} from "./view-model";

describe("obras/view-model", () => {
  describe("getSituacaoVisual", () => {
    it("mapeia 'em_execucao' para estilo azul e rótulo 'Em Execução'", () => {
      const visual = getSituacaoVisual("em_execucao");
      expect(visual.label).toBe("Em Execução");
      expect(visual.colorHex).toBe("#2563eb");
      expect(visual.badgeClass).toContain("text-blue-700");
    });

    it("mapeia 'paralisada' para estilo vermelho e rótulo 'Paralisada'", () => {
      const visual = getSituacaoVisual("paralisada");
      expect(visual.label).toBe("Paralisada");
      expect(visual.colorHex).toBe("#dc2626");
      expect(visual.badgeClass).toContain("text-rose-700");
    });

    it("mapeia 'concluida' para estilo verde e rótulo 'Concluída'", () => {
      const visual = getSituacaoVisual("concluida");
      expect(visual.label).toBe("Concluída");
      expect(visual.colorHex).toBe("#16a34a");
      expect(visual.badgeClass).toContain("text-emerald-700");
    });

    it("mapeia 'cadastrada' e 'cancelada' com rótulos e estilos adequados", () => {
      const cad = getSituacaoVisual("cadastrada");
      expect(cad.label).toBe("Não iniciada");
      expect(cad.colorHex).toBe("#64748b");

      const canc = getSituacaoVisual("cancelada");
      expect(canc.label).toBe("Cancelada");
      expect(canc.colorHex).toBe("#475569");
    });

    it("usa fallback para status não mapeado", () => {
      const visual = getSituacaoVisual("status_desconhecido");
      expect(visual.label).toBe("Não iniciada");
    });
  });

  describe("getMapCenter", () => {
    it("calcula mediana dos marcadores quando disponíveis", () => {
      const center = getMapCenter([
        {
          idProjeto: "1",
          nomeObra: "Obra 1",
          situacao: "em_execucao",
          situacaoLabel: "Em Execução",
          situacaoColorHex: "#2563eb",
          latitude: -20.0,
          longitude: -40.0,
          isUrbana: true,
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
          situacaoColorHex: "#16a34a",
          latitude: -22.0,
          longitude: -42.0,
          isUrbana: false,
          valorInvestimentoFormatado: "R$ 200.000",
          percentualExecucaoFormatado: "100%",
          orgaoResponsavel: "Sec",
          dataFimPrevistaFormatada: "01/01/2026",
        },
      ]);
      expect(center[0]).toBeDefined();
      expect(center[1]).toBeDefined();
    });

    it("usa fallback neutro genérico quando não houver marcadores disponíveis", () => {
      const center = getMapCenter([]);
      expect(center[0]).toBeCloseTo(-21.0);
      expect(center[1]).toBeCloseTo(-42.0);
    });
  });

  describe("buildObrasViewModel", () => {
    it("transforma dados brutos em view model rico, identificando obras urbanas e paralisadas", () => {
      const rawData = {
        portalSlug: "porciuncula_prefeitura",
        portalConfig: {
          displayName: "Porciúncula",
          uf: "RJ",
        } as unknown as Awaited<
          ReturnType<typeof import("@transparencia/db").getPortalConfig>
        >,
        context: {
          selectedYear: 2026,
          isCurrentYear: true,
        },
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
          valorEmExecucao: 1500000,
          valorParalisadas: 1200000,
          valorConcluidas: 800000,
          valorCadastradas: 0,
          percentualMedioExecucaoFisica: 55.0,
          obrasSemMedicaoCount: 1,
        },
        obras: [
          {
            idProjeto: "OBR-01",
            portalSlug: "porciuncula_prefeitura",
            nomeObra: "Pavimentação do Bairro Centro",
            situacao: "em_execucao" as const,
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
            situacao: "paralisada" as const,
            orgaoResponsavel: "Secretaria de Educação",
            valorInvestimentoPrevisto: 1200000,
            percentualExecucaoFisica: 20.0,
            dataUltimaMedicao: "2024-03-15",
            latitude: -20.965,
            longitude: -42.042,
            motivoParalisacao: "Recisão contratual com a empreiteira",
            dataInicioPrevista: "2024-01-01",
            dataFimPrevista: "2025-08-30",
          },
          {
            idProjeto: "OBR-03",
            portalSlug: "porciuncula_prefeitura",
            nomeObra: "Iluminação Rural sem Coordenadas",
            situacao: "concluida" as const,
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
      expect(vm.selectedYear).toBe(2026);
      expect(vm.isCurrentYear).toBe(true);
      expect(vm.kpis.totalObras).toBe(3);
      expect(vm.kpis.emExecucao).toBe(1);
      expect(vm.kpis.paralisadas).toBe(1);
      expect(vm.kpis.valorTotalInvestimentoFormatado).toContain("3.500.000");

      expect(vm.obras).toHaveLength(3);
      expect(vm.markers).toHaveLength(2); // OBR-03 não tem coordenadas
      expect(vm.totalGeorreferenciadas).toBe(2);
      expect(vm.totalNaoGeorreferenciadas).toBe(1);

      // Obra sem coordenadas
      const obraSemGeo = vm.obras.find((o) => o.idProjeto === "OBR-03");
      expect(obraSemGeo?.hasCoordinates).toBe(false);
      expect(obraSemGeo?.orgaoResponsavel).toBe("Órgão não informado");
      expect(obraSemGeo?.percentualExecucaoFormatado).toBe("Não informado");

      // Obra paralisada
      expect(vm.paralisadasObras).toHaveLength(1);
      const obraParalisada = vm.paralisadasObras[0];
      expect(obraParalisada.idProjeto).toBe("OBR-02");
      expect(obraParalisada.motivoParalisacao).toBe(
        "Recisão contratual com a empreiteira",
      );
      expect(obraParalisada.mesesParalisada).toBeGreaterThan(0);
    });
  });

  describe("buildObraDetalheViewModel", () => {
    const baseObra: ObraDTO = {
      idProjeto: "OBR-101",
      portalSlug: "porciuncula_prefeitura",
      nomeObra: "Reforma da Unidade Básica de Saúde",
      situacao: "em_execucao",
      orgaoResponsavel: "Secretaria Municipal de Saúde",
      valorInvestimentoPrevisto: 350000,
      percentualExecucaoFisica: 50,
      percentualExecucaoFinanceira: 45,
      dataUltimaMedicao: "2024-06-15",
      latitude: -20.9625,
      longitude: -42.0412,
      motivoParalisacao: null,
      dataInicioPrevista: "2024-01-10",
      dataFimPrevista: "2024-12-20",
    };

    it("deve mapear corretamente uma obra ativa sem descompasso", () => {
      const vm = buildObraDetalheViewModel(baseObra, "porciuncula_prefeitura");

      expect(vm.idProjeto).toBe("OBR-101");
      expect(vm.portalSlug).toBe("porciuncula_prefeitura");
      expect(vm.nomeObra).toBe("Reforma da Unidade Básica de Saúde");
      expect(vm.situacao).toBe("em_execucao");
      expect(vm.situacaoVisual.label).toBe("Em Execução");
      expect(vm.orgaoResponsavel).toBe("Secretaria Municipal de Saúde");
      expect(vm.valorInvestimentoPrevisto).toBe(350000);
      expect(vm.percentualExecucaoFisica).toBe(50);
      expect(vm.percentualExecucaoFinanceira).toBe(45);
      expect(vm.isParalisada).toBe(false);
      expect(vm.motivoParalisacao).toBe("");
      expect(vm.alertaDescompasso.temDescompasso).toBe(false);
      expect(vm.hasCoordinates).toBe(true);
      expect(vm.linkObrasGov).toBe(
        "https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/OBR-101",
      );
      expect(vm.linkLegislacao).toContain("planalto.gov.br");
    });

    it("deve detectar descompasso físico-financeiro quando financeiro > físico + 15%", () => {
      const obraComDescompasso: ObraDTO = {
        ...baseObra,
        percentualExecucaoFisica: 20,
        percentualExecucaoFinanceira: 45,
      };

      const vm = buildObraDetalheViewModel(
        obraComDescompasso,
        "porciuncula_prefeitura",
      );

      expect(vm.alertaDescompasso.temDescompasso).toBe(true);
      expect(vm.alertaDescompasso.diferencaPercentual).toBe(25);
      expect(vm.alertaDescompasso.mensagem).toBe(
        "Atenção: O desembolso financeiro acumulado supera em 25% o avanço físico medido em campo.",
      );
    });

    it("não deve disparar alerta de descompasso quando a diferença for de 15% ou menor", () => {
      const obraLimite: ObraDTO = {
        ...baseObra,
        percentualExecucaoFisica: 20,
        percentualExecucaoFinanceira: 35,
      };

      const vm = buildObraDetalheViewModel(
        obraLimite,
        "porciuncula_prefeitura",
      );
      expect(vm.alertaDescompasso.temDescompasso).toBe(false);
    });

    it("deve tratar obra paralisada com motivo oficial", () => {
      const obraParalisada: ObraDTO = {
        ...baseObra,
        situacao: "paralisada",
        motivoParalisacao:
          "Inadimplência da empresa contratada e rescisão unilateral",
        dataParalisacao: "2024-04-10",
      };

      const vm = buildObraDetalheViewModel(
        obraParalisada,
        "porciuncula_prefeitura",
      );

      expect(vm.isParalisada).toBe(true);
      expect(vm.motivoParalisacao).toBe(
        "Inadimplência da empresa contratada e rescisão unilateral",
      );
      expect(vm.dataParalisacaoFormatada).toBe("10/04/2024");
    });

    it("deve fornecer fallback amigável quando obra paralisada não possuir motivo registrado", () => {
      const obraSemMotivo: ObraDTO = {
        ...baseObra,
        situacao: "paralisada",
        motivoParalisacao: null,
        dataParalisacao: null,
        dataUltimaMedicao: null,
      };

      const vm = buildObraDetalheViewModel(
        obraSemMotivo,
        "porciuncula_prefeitura",
      );

      expect(vm.isParalisada).toBe(true);
      expect(vm.motivoParalisacao).toBe(
        "Justificativa oficial não registrada no sistema governamental",
      );
      expect(vm.dataParalisacaoFormatada).toBe("Data não informada");
    });

    it("não deve disparar descompasso se percentualExecucaoFisica for nulo", () => {
      const obraSemFisico: ObraDTO = {
        ...baseObra,
        percentualExecucaoFisica: null,
        percentualExecucaoFinanceira: 80,
      };

      const vm = buildObraDetalheViewModel(
        obraSemFisico,
        "porciuncula_prefeitura",
      );

      expect(vm.alertaDescompasso.temDescompasso).toBe(false);
    });

    it("deve tratar percentuais e datas nulas graciosamente", () => {
      const obraNula: ObraDTO = {
        ...baseObra,
        percentualExecucaoFisica: null,
        percentualExecucaoFinanceira: null,
        dataUltimaMedicao: null,
        dataInicioPrevista: null,
        dataFimPrevista: null,
        latitude: null,
        longitude: null,
      };

      const vm = buildObraDetalheViewModel(obraNula, "porciuncula_prefeitura");

      expect(vm.percentualExecucaoFisica).toBeNull();
      expect(vm.percentualFisicoFormatado).toBe(
        "Sem medição técnica registrada",
      );
      expect(vm.percentualExecucaoFinanceira).toBeNull();
      expect(vm.percentualFinanceiroFormatado).toBe("Em apuração contábil");
      expect(vm.dataUltimaMedicaoFormatada).toBe("Sem registro oficial");
      expect(vm.dataInicioPrevistaFormatada).toBe("Não informada");
      expect(vm.dataFimPrevistaFormatada).toBe("Não informada");
      expect(vm.hasCoordinates).toBe(false);
      expect(vm.alertaDescompasso.temDescompasso).toBe(false);
    });

    it("deve codificar caracteres especiais no link do ObrasGov.br", () => {
      const obraIdEspecial: ObraDTO = {
        ...baseObra,
        idProjeto: "12345/ABC DEF",
      };

      const vm = buildObraDetalheViewModel(
        obraIdEspecial,
        "porciuncula_prefeitura",
      );
      expect(vm.linkObrasGov).toBe(
        "https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/12345%2FABC%20DEF",
      );
    });

    it("deve mapear contratos correlacionados para a ObraDetalheViewModel", () => {
      const mockContrato: ObraContratoDTO = {
        contratoId: "ctr-1",
        contratoNumero: "001/2024",
        fornecedorNome: "EMPRESA DE OBRAS LTDA",
        fornecedorCpfCnpj: "12345678000190",
        valorContrato: 450000,
        modalidade: "concorrencia_eletronica",
        licitacaoNumero: "010/2024",
        status: "vigente",
        dataInicio: "2024-02-01",
        vencimentoAtual: "2025-02-01",
        ano: 2024,
        licitacaoAno: 2023,
      };

      const obraComContratos: ObraDTO = {
        ...baseObra,
        contratos: [mockContrato],
      };

      const vm = buildObraDetalheViewModel(
        obraComContratos,
        "porciuncula_prefeitura",
      );

      expect(vm.contratos).toHaveLength(1);
      const c = vm.contratos[0];
      expect(c.contratoNumero).toBe("001/2024");
      expect(c.fornecedorNome).toBe("EMPRESA DE OBRAS LTDA");
      expect(c.fornecedorCpfCnpjMascarado).toBe("12.***.***/0001-90");
      expect(c.valorContratoFormatado).toContain("450.000");
      expect(c.modalidadeLabel).toBe("Concorrência Eletrônica");
      expect(c.statusLabel).toBe("Vigente");
      expect(c.statusBadgeClasses).toContain("text-emerald-700");
      expect(c.linkContrato).toBe(
        "/porciuncula_prefeitura/contratos?numero=001%2F2024",
      );
      expect(c.linkLicitacao).toBe(
        "/porciuncula_prefeitura/licitacoes?numero=010%2F2024&ano=2023#licitacoes-em-andamento",
      );
    });

    it("deve retornar contratos como array vazio quando a obra não possuir contratos vinculados", () => {
      const vm = buildObraDetalheViewModel(baseObra, "porciuncula_prefeitura");
      expect(vm.contratos).toEqual([]);
    });
  });

  describe("mapContratoToViewModel", () => {
    it("deve mapear contrato vigente com fornecedor mascarado e links corretos", () => {
      const contrato: ObraContratoDTO = {
        contratoId: "ctr-123",
        contratoNumero: "CTR-99/2024",
        fornecedorNome: "CONSTRUTORA EXEMPLO",
        fornecedorCpfCnpj: "11222333000144",
        valorContrato: 250000,
        modalidade: "dispensa",
        licitacaoNumero: "DISP-01/2024",
        status: "vigente",
        dataInicio: "2024-03-01",
        vencimentoAtual: "2099-12-31",
        ano: 2024,
      };

      const vm = mapContratoToViewModel(contrato, "porciuncula_prefeitura");

      expect(vm.contratoId).toBe("ctr-123");
      expect(vm.contratoNumero).toBe("CTR-99/2024");
      expect(vm.fornecedorNome).toBe("CONSTRUTORA EXEMPLO");
      expect(vm.fornecedorCpfCnpjMascarado).toBe("11.***.***/0001-44");
      expect(vm.statusLabel).toBe("Vigente");
      expect(vm.statusBadgeClasses).toContain("text-emerald-700");
      expect(vm.modalidadeLabel).toBe("Dispensa de Licitação");
      expect(vm.linkContrato).toBe(
        "/porciuncula_prefeitura/contratos?numero=CTR-99%2F2024",
      );
      expect(vm.linkLicitacao).toBe(
        "/porciuncula_prefeitura/licitacoes?numero=DISP-01%2F2024&ano=2024#licitacoes-em-andamento",
      );
    });

    it("não deve gerar barra dupla se portalSlug for vazio", () => {
      const contrato: ObraContratoDTO = {
        contratoId: "ctr-empty-slug",
        contratoNumero: "CTR-01/2024",
        fornecedorNome: "EMPRESA",
        fornecedorCpfCnpj: null,
        valorContrato: 1000,
        modalidade: null,
        licitacaoNumero: "LIC-01/2024",
        status: "vigente",
        dataInicio: null,
        vencimentoAtual: null,
        ano: 2024,
      };

      const vm = mapContratoToViewModel(contrato, "");
      expect(vm.linkContrato).toBe("/contratos?numero=CTR-01%2F2024");
      expect(vm.linkLicitacao).toBe(
        "/licitacoes?numero=LIC-01%2F2024&ano=2024#licitacoes-em-andamento",
      );
    });

    it("deve mapear contrato encerrado e CPF de pessoa física mascarado", () => {
      const contrato: ObraContratoDTO = {
        contratoId: "ctr-456",
        contratoNumero: "CTR-12/2023",
        fornecedorNome: "JOAO ENGENHEIRO",
        fornecedorCpfCnpj: "12345678900",
        valorContrato: 50000,
        modalidade: "inexigibilidade",
        licitacaoNumero: null,
        status: "encerrado",
        dataInicio: "2023-01-01",
        vencimentoAtual: "2023-12-31",
      };

      const vm = mapContratoToViewModel(contrato, "porciuncula_prefeitura");

      expect(vm.fornecedorCpfCnpjMascarado).toBe("123.***.***-00");
      expect(vm.statusLabel).toBe("Encerrado");
      expect(vm.statusBadgeClasses).toContain("text-slate-700");
      expect(vm.linkLicitacao).toBeNull();
    });

    it("deve tratar documento não informado graciosamente", () => {
      const contrato: ObraContratoDTO = {
        contratoId: "ctr-789",
        contratoNumero: "CTR-01/2024",
        fornecedorNome: "EMPRESA SEM DOC",
        fornecedorCpfCnpj: null,
        valorContrato: 10000,
        modalidade: null,
        licitacaoNumero: null,
        status: "vigente",
        dataInicio: null,
        vencimentoAtual: null,
      };

      const vm = mapContratoToViewModel(contrato, "porciuncula_prefeitura");

      expect(vm.fornecedorCpfCnpjMascarado).toBe("Não informado");
      expect(vm.dataInicioFormatada).toBe("Não informada");
      expect(vm.vencimentoAtualFormatado).toBe("Não informada");
    });
  });
});
