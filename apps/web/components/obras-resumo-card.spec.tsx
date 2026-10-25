import { fireEvent, render, screen } from "@testing-library/react";
import type { ResumoObrasDTO } from "@transparencia/db";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObrasResumoCard } from "./obras-resumo-card";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("ObrasResumoCard Component", () => {
  const sampleResumoComParalisadas: ResumoObrasDTO = {
    totalObras: 5,
    emExecucao: 2,
    paralisadas: 1,
    concluidas: 2,
    cadastradas: 0,
    canceladas: 0,
    valorTotalInvestimento: 15000000,
    valorEmExecucao: 8000000,
    valorParalisadas: 2000000,
    valorConcluidas: 5000000,
    valorCadastradas: 0,
    percentualMedioExecucaoFisica: 65,
    obrasSemMedicaoCount: 0,
  };

  const sampleResumoSemParalisadas: ResumoObrasDTO = {
    totalObras: 3,
    emExecucao: 2,
    paralisadas: 0,
    concluidas: 1,
    cadastradas: 0,
    canceladas: 0,
    valorTotalInvestimento: 9000000,
    valorEmExecucao: 6000000,
    valorParalisadas: 0,
    valorConcluidas: 3000000,
    valorCadastradas: 0,
    percentualMedioExecucaoFisica: 55,
    obrasSemMedicaoCount: 0,
  };

  it("renderiza cabeçalho, fonte ObrasGov.br com link externo seguro e título da seção", () => {
    render(
      <ObrasResumoCard
        resumo={sampleResumoComParalisadas}
        detailUrl="/porciuncula/obras"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /^obras públicas$/i }),
    ).toBeInTheDocument();

    const linkObrasGov = screen.getByRole("link", { name: /obrasgov\.br/i });
    expect(linkObrasGov).toBeInTheDocument();
    expect(linkObrasGov).toHaveAttribute("target", "_blank");
    expect(linkObrasGov).toHaveAttribute("rel", "noopener noreferrer");
    expect(linkObrasGov).toHaveAttribute(
      "href",
      "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html",
    );
  });

  it("exibe montante consolidado em destaque e contadores exatos", () => {
    render(
      <ObrasResumoCard
        resumo={sampleResumoComParalisadas}
        detailUrl="/porciuncula/obras"
      />,
    );

    expect(
      screen.getByText(/total de investimento previsto/i),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 15,0 mi")).toBeInTheDocument();
    expect(screen.getByText("5 obras")).toBeInTheDocument();

    // Contadores das 4 situações na ordem consistente
    expect(screen.getByText(/2\s*\(R\$\s*8,0\s*mi\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s*\(R\$\s*5,0\s*mi\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0\s*\(R\$\s*0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*\(R\$\s*2,0\s*mi\)/i)).toBeInTheDocument();

    // Barra de progresso com atributos de acessibilidade e percentuais calculados por valor
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Distribuição do investimento: 53% em execução, 33% concluídas, 0% não iniciadas, 13% paralisadas",
    );
  });

  it("não exibe alerta de paralisação quando paralisadas === 0 e calcula aria-valuenow correspondente", () => {
    render(
      <ObrasResumoCard
        resumo={sampleResumoSemParalisadas}
        detailUrl="/porciuncula/obras"
      />,
    );

    expect(
      screen.queryByText(/obra pública paralisada/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/recursos de investimento paralisados no município/i),
    ).not.toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Distribuição do investimento: 67% em execução, 33% concluídas, 0% não iniciadas, 0% paralisadas",
    );
  });

  it("calcula barra proporcional com base na contagem quando valorTotalInvestimento === 0 e anuncia 'Distribuição das obras'", () => {
    const resumoSemValor: ResumoObrasDTO = {
      totalObras: 2,
      emExecucao: 1,
      paralisadas: 0,
      concluidas: 1,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 0,
      valorEmExecucao: 0,
      valorParalisadas: 0,
      valorConcluidas: 0,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: null,
      obrasSemMedicaoCount: 2,
    };

    render(
      <ObrasResumoCard
        resumo={resumoSemValor}
        detailUrl="/porciuncula/obras"
      />,
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Distribuição das obras: 50% em execução, 50% concluídas, 0% não iniciadas, 0% paralisadas",
    );
  });

  it("recorre à distribuição por contagem quando soma dos valores for 0 apesar de valorTotalInvestimento > 0", () => {
    const resumoValoresZerados: ResumoObrasDTO = {
      totalObras: 4,
      emExecucao: 2,
      paralisadas: 1,
      concluidas: 1,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 5000000,
      valorEmExecucao: 0,
      valorParalisadas: 0,
      valorConcluidas: 0,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: null,
      obrasSemMedicaoCount: 4,
    };

    render(
      <ObrasResumoCard
        resumo={resumoValoresZerados}
        detailUrl="/porciuncula/obras"
      />,
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "25");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Distribuição das obras: 50% em execução, 25% concluídas, 0% não iniciadas, 25% paralisadas",
    );
  });

  it("renderiza empty state amigável quando resumo for nulo e dispara telemetria ao clicar no link", () => {
    render(<ObrasResumoCard resumo={null} detailUrl="/porciuncula/obras" />);

    expect(
      screen.getByText(
        /nenhuma obra ou intervenção pública registrada no obrasgov\.br para o período/i,
      ),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: /ver mapa e detalhes das obras/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/porciuncula/obras");

    fireEvent.click(link);

    expect(posthog.capture).toHaveBeenCalledWith("obras_card_cta_clicked", {
      detailUrl: "/porciuncula/obras",
      totalObras: 0,
    });
    expect(posthog.capture).toHaveBeenCalledWith(
      "funnel_home_to_internal_page",
      {
        from: "obras_resumo_card_empty_state",
        to: "/porciuncula/obras",
      },
    );
  });

  it("renderiza empty state quando totalObras for <= 0", () => {
    const resumoVazio: ResumoObrasDTO = {
      totalObras: 0,
      emExecucao: 0,
      paralisadas: 0,
      concluidas: 0,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 0,
      valorEmExecucao: 0,
      valorParalisadas: 0,
      valorConcluidas: 0,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: null,
      obrasSemMedicaoCount: 0,
    };

    render(
      <ObrasResumoCard resumo={resumoVazio} detailUrl="/porciuncula/obras" />,
    );

    expect(
      screen.getByText(
        /nenhuma obra ou intervenção pública registrada no obrasgov\.br para o período/i,
      ),
    ).toBeInTheDocument();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza CTA para a rota de obras com link correto e dispara telemetria ao clicar", () => {
    render(
      <ObrasResumoCard
        resumo={sampleResumoComParalisadas}
        detailUrl="/porciuncula/obras?ano=2024"
      />,
    );

    const ctaLink = screen.getByRole("link", {
      name: /ver mapa e detalhes das obras/i,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/porciuncula/obras?ano=2024");

    fireEvent.click(ctaLink);

    expect(posthog.capture).toHaveBeenCalledWith("obras_card_cta_clicked", {
      detailUrl: "/porciuncula/obras?ano=2024",
      totalObras: 5,
    });
    expect(posthog.capture).toHaveBeenCalledWith(
      "funnel_home_to_internal_page",
      {
        from: "obras_resumo_card_footer",
        to: "/porciuncula/obras?ano=2024",
      },
    );
  });

  it("renderiza mini mapa estático com imagem cartográfica, link para detailUrl e dispara eventos PostHog ao clicar", () => {
    const markers = [
      {
        id: "obra-1",
        situacao: "em_execucao",
        latitude: -20.9634,
        longitude: -42.0408,
      },
      {
        id: "obra-2",
        situacao: "concluida",
        latitude: -20.965,
        longitude: -42.042,
      },
      {
        id: "obra-3",
        situacao: "paralisada",
        latitude: -20.961,
        longitude: -42.039,
      },
      {
        id: "obra-4",
        situacao: "cadastrada",
        latitude: -20.962,
        longitude: -42.041,
      },
    ];

    render(
      <ObrasResumoCard
        resumo={sampleResumoComParalisadas}
        detailUrl="/porciuncula/obras?ano=2024"
        markers={markers}
        center={[-20.9634, -42.0408]}
      />,
    );

    const mapLink = screen.getByRole("link", {
      name: /ver no mapa interativo de obras públicas/i,
    });
    expect(mapLink).toBeInTheDocument();
    expect(mapLink).toHaveAttribute("href", "/porciuncula/obras?ano=2024");

    const img = screen.getByAltText(
      /visão geral cartográfica das obras públicas/i,
    );
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("server.arcgisonline.com"),
    );

    // Verifica affordance "Ver no mapa"
    expect(screen.getByText(/ver no mapa/i)).toBeInTheDocument();

    // Clica no mini mapa e valida o disparo no PostHog
    fireEvent.click(mapLink);

    expect(posthog.capture).toHaveBeenCalledWith("obras_mini_map_clicked", {
      detailUrl: "/porciuncula/obras?ano=2024",
      totalObras: 5,
      markersCount: 4,
      emExecucao: 2,
      concluidas: 2,
      paralisadas: 1,
      cadastradas: 0,
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "funnel_home_to_internal_page",
      {
        from: "obras_mini_map",
        to: "/porciuncula/obras?ano=2024",
      },
    );
  });
});
