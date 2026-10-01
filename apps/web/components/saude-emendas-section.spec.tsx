import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SaudeEmendasSection,
  type SaudeEmendasStatsProps,
} from "./saude-emendas-section";

const mockStats: SaudeEmendasStatsProps = {
  totalAutorizado: 2031183,
  totalEmpenhado: 1015591,
  taxaEmpenho: 0.5,
  maiorEmenda: 2031183,
  lista: [
    {
      id: "1",
      numero: "63000759632202600",
      objeto: "Incremento Temporário PAP",
      valorAutorizado: 2031183,
      empenhado: 1015591,
      autor: "DANIELA CARNEIRO",
      origem: "Federal",
      tipoEmenda: "INDIVIDUAL",
      esferaOrigem: "FEDERAL",
      atoNormativo: "Portaria GM/MS 11.813/2026",
      destinacao: "Atenção Primária",
      qtdEmpenhos: 2,
      empenhos: [
        {
          empenhoId: "24339",
          dataEmpenho: "2026-03-01",
          fornecedorNome: "L FORASTIERI MACHADO LTDA",
          fornecedorCpfCnpj: "12.345.678/0001-90",
          licitacaoNumero: "000121/26",
          licitacaoModalidade: "PREGÃO ELETRÔNICO",
          valorEmpenhado: 20300,
          valorLiquidado: 20300,
          valorPago: 20300,
          descricao:
            "Aquisição de material médico hospitalar conforme proposta 63000759631202600",
        },
        {
          empenhoId: "24340",
          dataEmpenho: "2026-03-02",
          fornecedorNome: "HEALTH EQUIPAMENTOS LTDA",
          fornecedorCpfCnpj: "98.765.432/0001-10",
          licitacaoNumero: "000121/26",
          licitacaoModalidade: "PREGÃO ELETRÔNICO",
          valorEmpenhado: 75900,
          valorLiquidado: 75900,
          valorPago: 0,
          descricao:
            "Aquisição de equipamentos conforme proposta 63000759631202600",
        },
      ],
    },
    {
      id: "2",
      numero: "202643380001",
      objeto: "Custeio Atenção Especializada",
      valorAutorizado: 500000,
      empenhado: 400000,
      autor: "DANIEL SORANZ",
      tipoEmenda: "INDIVIDUAL",
      esferaOrigem: "FEDERAL",
      atoNormativo: "",
      destinacao: "Média e Alta Complexidade",
      qtdEmpenhos: 0,
      empenhos: [],
    },
  ],
};

describe("SaudeEmendasSection", () => {
  it("renderiza cabeçalho, KPIs e lista de emendas", () => {
    render(
      <SaudeEmendasSection
        ano={2026}
        emendasStats={mockStats}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByText("Emendas parlamentares destinadas à Saúde"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Daniela Carneiro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Daniel Soranz").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 empenhos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bloco Orçamentário").length).toBeGreaterThan(0);
  });

  it("abre modal com rastreabilidade ao clicar no botão de empenhos", () => {
    render(
      <SaudeEmendasSection
        ano={2026}
        emendasStats={mockStats}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const button = screen.getAllByRole("button", { name: /2 empenhos/i })[0];
    if (!button) throw new Error("Botão de empenhos não encontrado");
    fireEvent.click(button);

    // Modal deve ser exibido com os detalhes da emenda e dos empenhos
    expect(
      screen.getByText("Emenda Parlamentar · Daniela Carneiro"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Notas de Empenho Vinculadas (2)"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("L Forastieri Machado Ltda").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Health Equipamentos Ltda").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("000121/26").length).toBeGreaterThan(0);
  });

  it("abre modal com rastreabilidade ao clicar no nome do autor da emenda", () => {
    render(
      <SaudeEmendasSection
        ano={2026}
        emendasStats={mockStats}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const authorBtn = screen.getAllByRole("button", {
      name: "Daniela Carneiro",
    })[0];
    if (!authorBtn) throw new Error("Botão de autor não encontrado");
    fireEvent.click(authorBtn);

    expect(
      screen.getByText("Emenda Parlamentar · Daniela Carneiro"),
    ).toBeInTheDocument();
  });

  it("permite expandir e recolher o histórico da despesa no modal", () => {
    const longDesc =
      "Aquisição emergencial de medicamentos e insumos médicos para atendimento das unidades básicas de saúde da família e pronto atendimento municipal durante o exercício financeiro de 2026";
    const baseEmenda = mockStats.lista[0];
    if (!baseEmenda?.empenhos?.[0]) {
      throw new Error("mockStats inválido");
    }
    const baseEmpenho = baseEmenda.empenhos[0];

    const customStats: SaudeEmendasStatsProps = {
      ...mockStats,
      lista: [
        {
          ...baseEmenda,
          empenhos: [
            {
              ...baseEmpenho,
              descricao: longDesc,
            },
          ],
        },
      ],
    };

    render(
      <SaudeEmendasSection
        ano={2026}
        emendasStats={customStats}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    const button = screen.getAllByRole("button", { name: /2 empenhos/i })[0];
    if (!button) throw new Error("Botão de empenhos não encontrado");
    fireEvent.click(button);

    // O botão de expansão do histórico deve estar disponível
    const expandButtons = screen.getAllByRole("button", {
      name: /ler histórico completo/i,
    });
    expect(expandButtons.length).toBeGreaterThan(0);

    // Ao clicar, o botão deve alternar para "Recolher texto"
    fireEvent.click(expandButtons[0]);
    expect(
      screen.getByRole("button", { name: /recolher texto/i }),
    ).toBeInTheDocument();

    // Ao clicar novamente, deve voltar para "Ler histórico completo"
    const collapseButton = screen.getByRole("button", {
      name: /recolher texto/i,
    });
    fireEvent.click(collapseButton);
    expect(
      screen.getAllByRole("button", { name: /ler histórico completo/i }).length,
    ).toBeGreaterThan(0);
  });

  it("renderiza cartões mobile com dados de emendas e badges", () => {
    render(
      <SaudeEmendasSection
        ano={2026}
        emendasStats={mockStats}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    // No card mobile, exibe Proposta nº e botão de auditar
    expect(
      screen.getByText("Proposta nº 63000759632202600"),
    ).toBeInTheDocument();
    expect(screen.getByText("Proposta nº 202643380001")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /auditar 2 empenhos vinculados/i }),
    ).toBeInTheDocument();
  });
});
