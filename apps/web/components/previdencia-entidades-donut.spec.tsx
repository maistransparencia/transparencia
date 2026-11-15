import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrevidenciaEntidadesDonut } from "./previdencia-entidades-donut";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

describe("PrevidenciaEntidadesDonut", () => {
  it("não renderiza quando nenhum órgão pagou (sem R$ 0)", () => {
    const { container } = render(
      <PrevidenciaEntidadesDonut
        ano={2031}
        data={[
          { entidade: "PREFEITURA", empenhado: 10, liquidado: 5, pago: 0 },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lista órgãos com legenda em tons de token e sigla dinâmica", () => {
    const { container } = render(
      <PrevidenciaEntidadesDonut
        ano={2031}
        previdenciaSigla="FUNPREV"
        data={[
          { entidade: "PREFEITURA", empenhado: 100, liquidado: 90, pago: 80 },
          { entidade: "CAMARA", empenhado: 20, liquidado: 20, pago: 20 },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "De quais órgãos veio o dinheiro repassado ao FUNPREV em 2031?",
    );
    expect(screen.getAllByText(/Prefeitura|Camara/i).length).toBeGreaterThan(0);
    const cores = Array.from(
      container.querySelectorAll<HTMLElement>("li span[style]"),
    ).map((el) => el.style.backgroundColor);
    expect(new Set(cores).size).toBe(2);
    expect(cores.every((cor) => cor.startsWith("var(--"))).toBe(true);
  });
});
