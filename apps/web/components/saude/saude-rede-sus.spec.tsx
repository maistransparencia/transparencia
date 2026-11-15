import { fireEvent, render, screen } from "@testing-library/react";
import type {
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaudeRedeSus } from "./saude-rede-sus";

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

describe("SaudeRedeSus", () => {
  it("não renderiza sem dados", () => {
    const { container } = render(<SaudeRedeSus rede={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("com um único ano não há tabela por ano", () => {
    render(<SaudeRedeSus rede={rede([ano({ ano: 2026 })])} />);
    expect(screen.queryByText("2026")).toBeNull();
    expect(
      screen.getByText(/Dados de 2026\. Ainda não há outros anos/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("compara com o ano anterior, usa o intervalo real e cita a fonte", () => {
    render(
      <SaudeRedeSus
        rede={rede([
          ano({ ano: 2022, totalLeitosExistentes: 12 }),
          ano({ ano: 2023 }),
        ])}
      />,
    );
    expect(
      screen.getByText("cadastro do CNES em 12/2023. Em 2022 eram 12"),
    ).toBeTruthy();
    expect(screen.getByText(/Ministério da Saúde/)).toBeTruthy();
    expect(screen.getByText(/Coletado em 07\/11\/2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.getByText(/Cálculo do Portal/)).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("nunca julga a rede nem cita faixa de referência", () => {
    const { container } = render(
      <SaudeRedeSus rede={rede([ano({ ano: 2024 })])} />,
    );
    expect(container.textContent).not.toMatch(
      /adequad|insuficient|abaixo do ideal|m[ií]nimo|2,5|Portaria/i,
    );
  });

  it("mostra traço quando a fonte não trouxe o dado, e não zero", () => {
    render(
      <SaudeRedeSus
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

  it("com algum valor indisponível explica o traço e a população estimada", () => {
    render(
      <SaudeRedeSus
        rede={rede([
          ano({
            ano: 2026,
            populacaoEstimada: true,
            anoPopulacaoReferencia: 2025,
            totalProfissionais: null,
            profissionaisPorMilMoradores: null,
          }),
        ])}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.getByText(/O traço \(—\) indica/)).toBeTruthy();
    expect(
      screen.getByText(/população de 2026 ainda não foi divulgada.*de 2025/),
    ).toBeTruthy();
  });

  it("sem nenhum traço na tela não mostra a nota do traço nem da estimativa", () => {
    render(
      <SaudeRedeSus
        rede={rede([
          ano({
            ano: 2026,
            populacaoEstimada: true,
            anoPopulacaoReferencia: 2025,
          }),
        ])}
      />,
    );
    expect(screen.queryByText(/O traço \(—\) indica/)).toBeNull();
  });

  it("mostra o indicador do SUS com o valor do ano mais recente", () => {
    render(
      <SaudeRedeSus
        rede={rede([
          ano({ ano: 2022, totalLeitosSus: 7 }),
          ano({ ano: 2023, totalLeitosSus: 8 }),
        ])}
      />,
    );
    expect(screen.getByText("Leitos do SUS")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(
      screen.getByText("cadastro do CNES em 12/2023. Em 2022 eram 7"),
    ).toBeTruthy();
  });

  it("cita a competência de cada indicador e marca a população estimada na linha e na nota", () => {
    render(
      <SaudeRedeSus
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
    expect(screen.getAllByText("cadastro do CNES em 10/2026").length).toBe(2);
    expect(screen.getByText("cadastro do CNES em 09/2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.getAllByText(/população estimada/).length).toBeGreaterThan(0);
  });

  it("explica quando falta a população e não o dado do CNES", () => {
    render(
      <SaudeRedeSus
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
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.getByText(/Em 2024 não há população divulgada/)).toBeTruthy();
  });
});
