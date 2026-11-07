import { render, screen } from "@testing-library/react";
import type {
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaudeRedePorMilMoradores } from "./saude-rede-por-mil-moradores";

const ano = (
  valores: Partial<SaudeRedeAnoDTO> & { ano: number },
): SaudeRedeAnoDTO => ({
  competenciaLeitos: valores.ano * 100 + 12,
  competenciaProfissionais: valores.ano * 100 + 12,
  totalLeitosExistentes: 10,
  totalLeitosSus: 8,
  totalProfissionais: 100,
  totalProfissionaisSus: 80,
  populacaoResidente: 5000,
  anoPopulacaoReferencia: valores.ano,
  populacaoEstimada: false,
  leitosExistentesPorMilMoradores: 2,
  leitosSusPorMilMoradores: 1.6,
  profissionaisPorMilMoradores: 20,
  profissionaisSusPorMilMoradores: 16,
  dataColeta: "2026-11-07",
  ...valores,
});

const rede = (serie: SaudeRedeAnoDTO[]): SaudeRedePorMilMoradoresDTO => ({
  portalSlug: "x",
  anoMin: serie[0].ano,
  anoMax: serie[serie.length - 1].ano,
  serie,
});

describe("SaudeRedePorMilMoradores", () => {
  it("não renderiza sem dados", () => {
    const { container } = render(<SaudeRedePorMilMoradores rede={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("compara com o ano anterior, usa o intervalo real e cita a fonte", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({ ano: 2022, leitosExistentesPorMilMoradores: 3 }),
          ano({ ano: 2023 }),
        ])}
      />,
    );
    expect(screen.getByText("2022–2023")).toBeTruthy();
    expect(screen.getByText("em 2023. Em 2022 eram 3,0")).toBeTruthy();
    expect(screen.getByText(/Ministério da Saúde/)).toBeTruthy();
    expect(screen.getByText(/Coletado em 07\/11\/2026/)).toBeTruthy();
    expect(screen.getByText(/Cálculo do Portal/)).toBeTruthy();
  });

  it("nunca julga a rede nem cita faixa de referência", () => {
    const { container } = render(
      <SaudeRedePorMilMoradores rede={rede([ano({ ano: 2024 })])} />,
    );
    expect(container.textContent).not.toMatch(
      /adequad|insuficient|abaixo do ideal|m[ií]nimo|2,5|Portaria/i,
    );
  });

  it("mostra traço quando a fonte não trouxe o dado, e não zero", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({
            ano: 2024,
            profissionaisPorMilMoradores: null,
            totalProfissionais: null,
          }),
        ])}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("sem dado da fonte")).toBeTruthy();
  });

  it("avisa que a população é estimativa quando o ano ainda não foi divulgado", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({
            ano: 2026,
            populacaoEstimada: true,
            anoPopulacaoReferencia: 2025,
          }),
        ])}
      />,
    );
    expect(
      screen.getByText(/população de 2026 ainda não foi divulgada.*de 2025/),
    ).toBeTruthy();
  });

  it("mostra o indicador do SUS com o valor do ano mais recente", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({ ano: 2022, leitosSusPorMilMoradores: 1.2 }),
          ano({ ano: 2023, leitosSusPorMilMoradores: 1.6 }),
        ])}
      />,
    );
    expect(screen.getByText("Leitos do SUS por mil moradores")).toBeTruthy();
    expect(screen.getByText("em 2023. Em 2022 eram 1,2")).toBeTruthy();
  });

  it("cita a competência de cada indicador e marca a população estimada na linha e na nota", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({
            ano: 2026,
            competenciaLeitos: 202610,
            competenciaProfissionais: 202609,
            populacaoEstimada: true,
            anoPopulacaoReferencia: 2025,
          }),
        ])}
      />,
    );
    expect(
      screen.getByText(
        /leitos mostrados são de 10\/2026 e os profissionais, de 09\/2026/,
      ),
    ).toBeTruthy();
    expect(screen.getAllByText(/população estimada/).length).toBeGreaterThan(1);
  });

  it("explica quando falta a população e não o dado do CNES", () => {
    render(
      <SaudeRedePorMilMoradores
        rede={rede([
          ano({
            ano: 2024,
            populacaoResidente: null,
            leitosExistentesPorMilMoradores: null,
            leitosSusPorMilMoradores: null,
            profissionaisPorMilMoradores: null,
          }),
        ])}
      />,
    );
    expect(screen.getByText(/Em 2024 não há população divulgada/)).toBeTruthy();
  });
});
