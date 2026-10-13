import { render, screen } from "@testing-library/react";
import type { ResumoObrasDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { ObrasResumoCard } from "./obras-resumo-card";

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
      screen.getByRole("heading", {
        name: /obras públicas e investimentos urbanos/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /painel oficial de intervenções urbanas \(obrasgov\.br\)/i,
      ),
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
    expect(screen.getByText("R$ 15.0mi")).toBeInTheDocument();
    expect(screen.getByText("5 obras")).toBeInTheDocument();

    // Contadores das 4 situações na ordem consistente
    expect(screen.getByText(/2\s*\(R\$\s*8\.0mi\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s*\(R\$\s*5\.0mi\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0\s*\(R\$\s*0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*\(R\$\s*2\.0mi\)/i)).toBeInTheDocument();

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

  it("renderiza empty state amigável quando resumo for nulo", () => {
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

  it("renderiza CTA para a rota de obras com link correto", () => {
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
  });
});
