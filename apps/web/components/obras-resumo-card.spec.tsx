import { fireEvent, render, screen } from "@testing-library/react";
import type { ResumoObrasDTO } from "@transparencia/db";
import posthog from "posthog-js";
import { describe, expect, it, vi } from "vitest";
import { ObrasResumoCard } from "./obras-resumo-card";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const base: ResumoObrasDTO = {
  totalObras: 5,
  emExecucao: 2,
  paralisadas: 2,
  concluidas: 1,
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

describe("ObrasResumoCard (linha compacta)", () => {
  it("alerta sem valor informado nao mostra R$ 0", () => {
    render(
      <ObrasResumoCard
        resumo={{ ...base, paralisadas: 1, valorParalisadas: 0 }}
        detailUrl="/p/obras"
      />,
    );
    expect(screen.getByText("1 obra parada")).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).toBeNull();
  });

  it("alerta: badge, quantidade e valor parados e acao Ver mapa", () => {
    render(<ObrasResumoCard resumo={base} detailUrl="/p/obras" />);
    expect(screen.getByText("Alerta")).toBeInTheDocument();
    expect(screen.getByText(/2 obras · .*parados/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Ver mapa/ });
    expect(link).toHaveAttribute("href", "/p/obras");
    fireEvent.click(link);
    expect(posthog.capture).toHaveBeenCalledWith(
      "obras_card_cta_clicked",
      expect.objectContaining({ detailUrl: "/p/obras" }),
    );
  });

  it("em dia: sem paralisadas nao mostra zero enganoso", () => {
    render(
      <ObrasResumoCard
        resumo={{ ...base, paralisadas: 0, valorParalisadas: 0 }}
        detailUrl="/p/obras"
      />,
    );
    expect(screen.getByText("Em dia")).toBeInTheDocument();
    expect(screen.queryByText(/parados/)).toBeNull();
    expect(screen.queryByText("Alerta")).toBeNull();
  });

  it("sem obras registradas: badge neutro e sem numero", () => {
    render(
      <ObrasResumoCard
        resumo={{ ...base, totalObras: 0, paralisadas: 0 }}
        detailUrl="/p/obras"
      />,
    );
    expect(screen.getByText("Sem obras registradas")).toBeInTheDocument();
    expect(screen.queryByText(/^0 /)).toBeNull();
  });

  it("indisponivel: nao renderiza", () => {
    const { container } = render(
      <ObrasResumoCard resumo={null} detailUrl="/p/obras" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
