import { fireEvent, render, screen } from "@testing-library/react";
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
  primeiraCompetenciaAmbulatorial: valores.ano * 100 + 1,
  primeiraCompetenciaInternacoes: valores.ano * 100 + 1,
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

  it("não afirma período contínuo quando falta mês no meio", () => {
    const serie = [
      ano({
        ano: 2026,
        competenciasAmbulatoriais: 3,
        primeiraCompetenciaAmbulatorial: 202602,
        ultimaCompetenciaAmbulatorial: 202605,
        totalProcedimentosAmbulatoriais: 344122,
        anoCompletoAmbulatorial: false,
        anoIncompleto: true,
      }),
    ];
    render(<SaudeProducaoSus producao={producao(serie)} />);
    expect(screen.queryByText(/de fevereiro a maio/)).toBeNull();
    expect(screen.getAllByText(/até maio de 2026/i).length).toBeGreaterThan(0);
  });

  it("abre com a frase em linguagem comum e o período de cada medida", () => {
    const serie = [
      ano({
        ano: 2026,
        competenciasAmbulatoriais: 7,
        ultimaCompetenciaAmbulatorial: 202607,
        totalProcedimentosAmbulatoriais: 344122,
        competenciasInternacoes: 2,
        primeiraCompetenciaInternacoes: 202601,
        ultimaCompetenciaInternacoes: 202602,
        totalInternacoes: 63,
        anoCompletoAmbulatorial: false,
        anoCompletoInternacoes: false,
        anoIncompleto: true,
      }),
    ];
    render(<SaudeProducaoSus producao={producao(serie)} />);
    expect(
      screen.getByText(
        "De janeiro a julho de 2026, o SUS registrou 344 mil atendimentos e, de janeiro a fevereiro, 63 internações em unidades de saúde da cidade.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Atendimentos por mês (média)")).toBeTruthy();
    expect(screen.getByText("49 mil")).toBeTruthy();
    expect(screen.getByText("32")).toBeTruthy();
    expect(screen.getByText("média de janeiro a julho de 2026")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Quanto atendimento o SUS registra na cidade?",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Não mostra tempo de espera nem se faltou vaga/),
    ).toBeTruthy();
    expect(screen.queryByText(/pagou/)).toBeNull();
  });

  it("com um único ano não mostra eyebrow de ano e avisa de quem se trata fora", () => {
    render(<SaudeProducaoSus producao={producao([ano({ ano: 2026 })])} />);
    expect(screen.queryByText("2026")).toBeNull();
    expect(screen.queryByText("2026–2026")).toBeNull();
    expect(
      screen.getByText(/se trata em outra cidade não entra na conta daqui/),
    ).toBeTruthy();
  });

  it("usa o intervalo calculado dos dados, sem anos fixos", () => {
    render(
      <SaudeProducaoSus
        producao={producao([ano({ ano: 2017 }), ano({ ano: 2027 })])}
      />,
    );
    expect(screen.getByText("2017–2027")).toBeTruthy();
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
    expect(screen.getAllByText(/Ministério da Saúde/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Coletado em 07\/11\/2026/)).toBeTruthy();
    expect(
      screen.getByText(/Inclui pessoas de outras cidades atendidas aqui/),
    ).toBeTruthy();
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
    expect(
      screen.getByText(/não trouxe internações pagas pelo SUS/),
    ).toBeTruthy();
  });

  it("nunca julga a rede nem cita faixa de referência", () => {
    const { container } = render(
      <SaudeProducaoSus producao={producao([ano({ ano: 2024 })])} />,
    );
    expect(container.textContent).not.toMatch(
      /adequad|insuficient|abaixo do ideal|m[ií]nimo|Portaria|irregular/i,
    );
  });

  it("com algum valor indisponível explica o traço e a população estimada", () => {
    render(
      <SaudeProducaoSus
        producao={producao([
          ano({
            ano: 2026,
            populacaoEstimada: true,
            anoPopulacaoReferencia: 2025,
            internacoesPorMilMoradores: null,
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
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(screen.queryByText(/O traço \(—\) indica/)).toBeNull();
    expect(screen.queryByText(/ainda não foi divulgada/)).toBeNull();
    expect(screen.getByText(/Por mil moradores quer dizer/)).toBeTruthy();
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
