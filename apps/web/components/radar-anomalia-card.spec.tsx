import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarAnomaliaCard } from "./radar-anomalia-card";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const card = {
  anomaliaId: "a1",
  tipoAnomalia: "despesa_pico",
  titulo: "Despesa acima do padrão",
  dimensaoReferencia: "2031",
  grauSeveridade: "alto",
  metodologiaBadge: "Homologada",
  tipoMetodologia: "homologa",
  textoFactual: "Valor acima do histórico.",
  desvioPercentual: 20,
  valorObservadoFormatted: "R$ 120,00",
  valorEsperadoFormatted: "R$ 100,00",
  ctaLabel: "Ver detalhes",
  ctaUrl: "/x/despesas",
} as unknown as RadarCivicoCardItem;

describe("RadarAnomaliaCard", () => {
  it("mostra o aviso como indício, com severidade em texto e sem cartão arredondado", () => {
    const { container } = render(<RadarAnomaliaCard card={card} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Despesa acima do padrão",
    );
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/rounded-(xl|2xl|lg)|shadow-/);
  });

  it("não quebra sem cartão informado", () => {
    const { container } = render(<RadarAnomaliaCard />);
    expect(container).toBeDefined();
  });
});
