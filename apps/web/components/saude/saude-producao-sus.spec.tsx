import { render, screen } from "@testing-library/react";
import type {
  SaudeProducaoSusAnoDTO,
  SaudeProducaoSusDTO,
  SaudeProducaoSusReferenciaDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaudeProducaoSus } from "./saude-producao-sus";

const ano = (
  valores: Partial<SaudeProducaoSusAnoDTO> & { ano: number },
): SaudeProducaoSusAnoDTO => ({
  competenciasAmbulatoriais: 12,
  competenciasInternacoes: 12,
  ultimaCompetenciaAmbulatorial: valores.ano * 100 + 12,
  ultimaCompetenciaInternacoes: valores.ano * 100 + 12,
  totalProcedimentosAmbulatoriais: 1200,
  totalInternacoes: 60,
  anoCompletoAmbulatorial: true,
  anoCompletoInternacoes: true,
  anoIncompleto: false,
  populacaoResidente: 10000,
  anoPopulacaoReferencia: valores.ano,
  populacaoEstimada: false,
  procedimentosAmbulatoriaisPorMilMoradores: 120,
  internacoesPorMilMoradores: 6,
  dataColeta: "2026-11-07",
  ...valores,
});

const referenciaCompleta = (
  serie: SaudeProducaoSusAnoDTO[],
): SaudeProducaoSusReferenciaDTO => {
  const ultimo = serie[serie.length - 1];
  return {
    ano: ultimo.ano,
    completo: true,
    ultimaCompetencia: ultimo.ano * 100 + 12,
    anoAnterior: serie.length > 1 ? serie[serie.length - 2].ano : null,
  };
};

const producao = (
  serie: SaudeProducaoSusAnoDTO[],
  extra: Partial<SaudeProducaoSusDTO> = {},
): SaudeProducaoSusDTO => ({
  portalSlug: "x",
  anoMin: serie[0].ano,
  anoMax: serie[serie.length - 1].ano,
  referenciaAmbulatorial: referenciaCompleta(serie),
  referenciaInternacoes: referenciaCompleta(serie),
  anoEmAndamento: null,
  semInternacoes: false,
  serie,
  ...extra,
});

describe("SaudeProducaoSus", () => {
  it("não renderiza sem dados", () => {
    const { container } = render(<SaudeProducaoSus producao={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("compara o ano completo mais recente com o anterior e cita a fonte", () => {
    render(
      <SaudeProducaoSus
        producao={producao([
          ano({
            ano: 2023,
            procedimentosAmbulatoriaisPorMilMoradores: 100,
            internacoesPorMilMoradores: 6,
          }),
          ano({ ano: 2024 }),
        ])}
      />,
    );
    expect(screen.getByText("2023–2024")).toBeTruthy();
    expect(screen.getByText("em 2024. Em 2023 eram 100,0")).toBeTruthy();
    expect(screen.getByText("em 2024. Em 2023 eram 6,0")).toBeTruthy();
    expect(screen.getAllByText(/Ministério da Saúde/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Coletado em 07\/11\/2026/)).toBeTruthy();
    expect(screen.getByText(/Não é todo o atendimento da cidade/)).toBeTruthy();
  });

  it("não compara o ano em andamento com anos completos", () => {
    render(
      <SaudeProducaoSus
        producao={producao(
          [
            ano({ ano: 2025 }),
            ano({
              ano: 2026,
              competenciasAmbulatoriais: 6,
              competenciasInternacoes: 6,
              ultimaCompetenciaAmbulatorial: 202606,
              ultimaCompetenciaInternacoes: 202606,
              anoCompletoAmbulatorial: false,
              anoCompletoInternacoes: false,
              anoIncompleto: true,
              procedimentosAmbulatoriaisPorMilMoradores: 50,
              internacoesPorMilMoradores: 3,
            }),
          ],
          {
            referenciaAmbulatorial: {
              ano: 2025,
              completo: true,
              ultimaCompetencia: 202512,
              anoAnterior: null,
            },
            referenciaInternacoes: {
              ano: 2025,
              completo: true,
              ultimaCompetencia: 202512,
              anoAnterior: null,
            },
            anoEmAndamento: { ano: 2026, ateCompetencia: 202606 },
          },
        )}
      />,
    );
    expect(screen.getAllByText("em 2025").length).toBe(2);
    expect(
      screen.getByText(/ano de 2026 está em andamento.*até 06\/2026/),
    ).toBeTruthy();
  });

  it("mostra SIH sem retorno como sem dado e não como zero", () => {
    render(
      <SaudeProducaoSus
        producao={producao(
          [
            ano({
              ano: 2024,
              competenciasInternacoes: null,
              ultimaCompetenciaInternacoes: null,
              totalInternacoes: null,
              anoCompletoInternacoes: false,
              internacoesPorMilMoradores: null,
            }),
          ],
          {
            referenciaInternacoes: null,
            semInternacoes: true,
          },
        )}
      />,
    );
    expect(screen.getByText("sem dado nesta fonte")).toBeTruthy();
    expect(
      screen.getByText(/não trouxe internações pagas pelo SUS/),
    ).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("nunca julga a rede nem cita faixa de referência", () => {
    const { container } = render(
      <SaudeProducaoSus producao={producao([ano({ ano: 2024 })])} />,
    );
    expect(container.textContent).not.toMatch(
      /adequad|insuficient|abaixo do ideal|m[ií]nimo|Portaria|irregular/i,
    );
  });

  it("avisa que a população é estimativa quando o ano ainda não foi divulgado", () => {
    render(
      <SaudeProducaoSus
        producao={producao([
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

  it("não chama de em andamento o último ano fechado de município sem SIH", () => {
    render(
      <SaudeProducaoSus
        producao={producao(
          [
            ano({
              ano: 2024,
              competenciasInternacoes: null,
              ultimaCompetenciaInternacoes: null,
              totalInternacoes: null,
              anoCompletoInternacoes: false,
              internacoesPorMilMoradores: null,
            }),
          ],
          { referenciaInternacoes: null, semInternacoes: true },
        )}
      />,
    );
    expect(screen.queryByText(/está em andamento/)).toBeNull();
    expect(screen.queryByText(/\(ano incompleto\)/)).toBeNull();
  });
});
