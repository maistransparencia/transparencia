import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OGCardTemplate } from "./og-card-template";

describe("OGCardTemplate", () => {
  it("renderiza o cabeçalho com nome do município, UF e marca MaisTransparencia", () => {
    render(
      <OGCardTemplate
        portalDisplayName="Prefeitura de Porciúncula"
        portalUf="RJ"
        pageTitle="Visão Geral & Posição Fiscal"
        subtitle="Exercício 2026 • Dados Fiscais Oficiais"
        metrics={[
          {
            label: "Total Arrecadado",
            value: "R$ 42,5M",
            detail: "85% da meta",
            variant: "success",
          },
          {
            label: "Despesas Pagas",
            value: "R$ 38,1M",
            detail: "Dentro do limite",
            variant: "default",
          },
        ]}
      />,
    );

    expect(screen.getByText("MaisTransparencia")).toBeInTheDocument();
    expect(
      screen.getByText("Prefeitura de Porciúncula • RJ"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Visão Geral & Posição Fiscal"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Exercício 2026 • Dados Fiscais Oficiais"),
    ).toBeInTheDocument();
  });

  it("renderiza todos os blocos de métricas com suas respectivas labels, valores e variantes", () => {
    render(
      <OGCardTemplate
        portalDisplayName="Prefeitura de Porciúncula"
        pageTitle="Despesas & Controle de Gastos"
        badgeText="Alerta de Opacidade"
        metrics={[
          {
            label: "Total Pago",
            value: "R$ 35,2M",
            variant: "default",
          },
          {
            label: "Opacidade .99",
            value: "18,4%",
            detail: "R$ 6,4M em Outros Serviços",
            variant: "warning",
          },
          {
            label: "Combustíveis",
            value: "R$ 2,1M",
            detail: "+12% vs ano anterior",
            variant: "danger",
          },
        ]}
      />,
    );

    expect(screen.getByText("Total Pago")).toBeInTheDocument();
    expect(screen.getByText("R$ 35,2M")).toBeInTheDocument();
    expect(screen.getByText("Opacidade .99")).toBeInTheDocument();
    expect(screen.getByText("18,4%")).toBeInTheDocument();
    expect(screen.getByText("R$ 6,4M em Outros Serviços")).toBeInTheDocument();
    expect(screen.getByText("Combustíveis")).toBeInTheDocument();
    expect(screen.getByText("R$ 2,1M")).toBeInTheDocument();
    expect(screen.getByText("Alerta de Opacidade")).toBeInTheDocument();
  });

  it("renderiza rodapé com selo de auditoria contábil e URL canônica", () => {
    render(
      <OGCardTemplate
        portalDisplayName="Prefeitura de Porciúncula"
        pageTitle="Saúde Pública"
        footerNote="Atualizado em 30/08/2026"
        metrics={[
          {
            label: "Orçamento da Saúde",
            value: "R$ 15,0M",
          },
        ]}
      />,
    );

    expect(screen.getByText("maistransparencia.com")).toBeInTheDocument();
    expect(
      screen.getByText(/Auditoria Contábil Automatizada/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Atualizado em 30\/08\/2026/i)).toBeInTheDocument();
  });

  it("permite customização de brandName e brandDomain para instâncias customizadas / open-source", () => {
    render(
      <OGCardTemplate
        portalDisplayName="Prefeitura de Exemplo"
        pageTitle="Orçamento Anual"
        brandName="Transparência Aberta"
        brandDomain="transparencia.exemplo.gov.br"
        metrics={[
          {
            label: "Dotação",
            value: "R$ 10,0M",
          },
        ]}
      />,
    );

    expect(screen.getByText("Transparência Aberta")).toBeInTheDocument();
    expect(
      screen.getByText("transparencia.exemplo.gov.br"),
    ).toBeInTheDocument();
  });
});
