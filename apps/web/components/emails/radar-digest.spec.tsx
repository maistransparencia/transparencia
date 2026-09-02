import { render } from "@testing-library/react";
import type { RadarDigestMetricsDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { RadarDigestEmail } from "./radar-digest";

describe("RadarDigestEmail", () => {
  const mockMetrics: RadarDigestMetricsDTO = {
    portalSlug: "porciuncula_prefeitura",
    ano: 2025,
    posicaoFiscal: {
      totalArrecadado: 50000000,
      despesasPagas: 42000000,
      restosPagosNoAno: 1500000,
      saldoEstimado: 8000000,
      restosPendentesTotal: 25000000,
      restosLiquidadosPendentes: 2000000,
    },
    opacidade: {
      taxaValorOpacidadePct: 18.5,
      classificacaoRisco: "atencao",
      pagoResidual99: 7770000,
      pagoDesvioSensivel99: 2500000,
      totalPago: 42000000,
    },
    destaquesContratos: [
      {
        fornecedorNome: "Construtora Alfa Ltda",
        objetoDescricao: "Manutenção de vias urbanas",
        totalPago: 1200000,
        statusExecucao: "em_execucao",
      },
    ],
    destaquesCredoresOpacidade: [
      {
        credorNome: "Empresa Limpeza Urbana",
        totalPago: 2500000,
        categoriaPredominante: "limpeza_residuos",
      },
    ],
  };

  it("deve renderizar o boletim completo com métricas fiscais, opacidade e contratos", () => {
    const { getByText, getAllByText, container } = render(
      <RadarDigestEmail
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
        ano={2025}
        portalBaseUrl="https://transparencia.porciuncula.rj.gov.br"
        unsubscribeUrl="https://transparencia.porciuncula.rj.gov.br/api/newsletter/unsubscribe?token=unsub-123"
        metrics={mockMetrics}
      />,
    );

    // Header & Título
    expect(getAllByText(/Radar Porciúncula/i).length).toBeGreaterThan(0);
    expect(
      getByText(/Boletim Cívico Municipal • Exercício 2025/i),
    ).toBeInTheDocument();

    // Balanço Fiscal
    expect(getByText(/Balanço Fiscal & Execução/i)).toBeInTheDocument();
    expect(getAllByText(/R\$\s*50\.000\.000,00/i).length).toBeGreaterThan(0);
    expect(getAllByText(/R\$\s*42\.000\.000,00/i).length).toBeGreaterThan(0);

    // Termômetro de Opacidade
    expect(
      getByText(/Termômetro de Opacidade Orçamentária/i),
    ).toBeInTheDocument();
    expect(getByText(/18,5%/i)).toBeInTheDocument();
    expect(getByText(/Risco Atenção/i)).toBeInTheDocument();
    expect(getByText(/Empresa Limpeza Urbana/i)).toBeInTheDocument();

    // Contratos em Destaque
    expect(
      getByText(/Principais Contratos & Fornecedores/i),
    ).toBeInTheDocument();
    expect(getByText(/Construtora Alfa Ltda/i)).toBeInTheDocument();
    expect(getByText(/Manutenção de vias urbanas/i)).toBeInTheDocument();
    expect(getByText(/Em execução/i)).toBeInTheDocument();

    // CTAs com UTM tracking
    const despesasLink = container.querySelector(
      'a[href*="utm_source=radar_digest"][href*="/porciuncula_prefeitura/despesas"]',
    );
    expect(despesasLink).not.toBeNull();

    const licitacoesLink = container.querySelector(
      'a[href*="utm_source=radar_digest"][href*="/porciuncula_prefeitura/licitacoes"]',
    );
    expect(licitacoesLink).not.toBeNull();

    // Rodapé de Descadastramento e LGPD
    const unsubLink = container.querySelector(
      'a[href="https://transparencia.porciuncula.rj.gov.br/api/newsletter/unsubscribe?token=unsub-123"]',
    );
    expect(unsubLink).not.toBeNull();
    expect(
      getByText(/Compromisso com a Privacidade \(LGPD\)/i),
    ).toBeInTheDocument();
  });

  it("deve renderizar graciosamente quando seções de métricas estiverem nulas", () => {
    const emptyMetrics: RadarDigestMetricsDTO = {
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      posicaoFiscal: null,
      opacidade: null,
      destaquesContratos: [],
      destaquesCredoresOpacidade: [],
    };

    const { getByText } = render(
      <RadarDigestEmail
        portalSlug="porciuncula_prefeitura"
        municipioNome="Porciúncula"
        ano={2025}
        portalBaseUrl="https://transparencia.porciuncula.rj.gov.br"
        unsubscribeUrl="https://transparencia.porciuncula.rj.gov.br/api/newsletter/unsubscribe?token=unsub-123"
        metrics={emptyMetrics}
      />,
    );

    expect(
      getByText(/Dados de posição fiscal em consolidação para este exercício/i),
    ).toBeInTheDocument();
    expect(
      getByText(
        /Dados de opacidade contábil não disponíveis para este exercício/i,
      ),
    ).toBeInTheDocument();
    expect(
      getByText(/Nenhum contrato de serviço registrado para este exercício/i),
    ).toBeInTheDocument();
  });
});
