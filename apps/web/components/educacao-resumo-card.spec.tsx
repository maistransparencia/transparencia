import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture } }));

import {
  EducacaoResumoCard,
  type EducacaoResumoCardData,
  temEducacaoDestaque,
} from "./educacao-resumo-card";

const base: EducacaoResumoCardData = {
  ano: 2023,
  notaIdebTexto: "5,9",
  enfaseTom: "destaque",
  enfaseTitulo: "Destaque: evolução de +1,4 ponto no IDEB",
  evolucaoTexto: "+1,4 ponto",
  evolucaoTom: "destaque",
  notaAnteriorTexto: "Ciclo anterior: 4,5",
  notaAnteriorValorTexto: "4,5",
  metaTexto: "Meta do IDEB atingida",
  metaTom: "destaque",
  rankingTexto: "3º de 92 municípios",
  rankingVariacaoTexto: "+2 posições",
  rankingVariacaoTom: "destaque",
  exercicioDespesa: 2026,
  despesaLiquidadaEducacaoTexto: "R$ 12,3 mi",
  despesaLiquidadaEducacaoCompleta: "R$ 12.300.000,00",
};

describe("EducacaoResumoCard (linha compacta)", () => {
  it("mostra badge IDEB do ano, evolucao antes e depois e acao Ver Educação", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(screen.getByText("IDEB 2023")).toBeInTheDocument();
    expect(screen.getByText("4,5 → 5,9")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver Educação/ })).toHaveAttribute(
      "href",
      "/p/educacao",
    );
  });

  it("nao exibe ranking, meta nem despesa na linha compacta", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(screen.queryByText(/municípios/)).toBeNull();
    expect(screen.queryByText(/Meta do IDEB/)).toBeNull();
    expect(screen.queryByText(/R\$ 12,3 mi/)).toBeNull();
  });

  it("sem nota anterior mostra apenas a nota atual", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, notaAnteriorValorTexto: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/→/)).toBeNull();
    expect(screen.getAllByText("5,9")).toHaveLength(1);
  });

  it.each([
    ["destaque", "Conquista da Educação"],
    ["atencao", "Educação"],
    ["neutro", "Conquista da Educação"],
  ] as const)("tom %s: titulo %s", (enfaseTom, titulo) => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, enfaseTom }}
        detailUrl="/p/educacao"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: titulo }),
    ).toBeInTheDocument();
    const esperado = {
      destaque: "positivo",
      atencao: "atencao",
      neutro: "neutro",
    }[enfaseTom];
    expect(screen.getByTestId("destaque-linha")).toHaveAttribute(
      "data-tom",
      esperado,
    );
  });

  it("evolucao tem texto para leitor de tela e cita a fonte", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(screen.getByText("IDEB de 4,5 para 5,9")).toHaveClass("sr-only");
    const fonte = screen.getByRole("link", { name: "INEP" });
    expect(fonte).toHaveAttribute("href", FONTES_OFICIAIS.ideb.url);
    expect(fonte).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("nota indisponivel (traco) nao renderiza e o predicado e falso", () => {
    const resumo = { ...base, notaIdebTexto: "—" };
    const { container } = render(
      <EducacaoResumoCard resumo={resumo} detailUrl="/p/educacao" />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(temEducacaoDestaque(resumo)).toBe(false);
    expect(temEducacaoDestaque(base)).toBe(true);
  });

  it("sem IDEB nao renderiza", () => {
    const { container } = render(
      <EducacaoResumoCard resumo={null} detailUrl="/p/educacao" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("registra telemetria ao clicar na acao", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    fireEvent.click(screen.getByRole("link", { name: /Ver Educação/ }));
    expect(capture).toHaveBeenCalledWith(
      "educacao_card_cta_clicked",
      expect.objectContaining({ detailUrl: "/p/educacao" }),
    );
  });
});
