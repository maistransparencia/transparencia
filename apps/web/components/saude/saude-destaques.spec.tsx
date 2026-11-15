import { render, screen } from "@testing-library/react";
import type {
  SaudeFarmaciaResumoDTO,
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { SaudeDestaqueFarmacia, SaudeDestaqueOrigem, SaudeDestaqueRede } =
  await import("./saude-destaques");

const anoRede = (valores: Partial<SaudeRedeAnoDTO>): SaudeRedeAnoDTO => ({
  ano: 2024,
  competenciaLeitos: 202412,
  competenciaProfissionais: 202412,
  totalLeitosExistentes: 40,
  totalLeitosSus: 30,
  totalProfissionais: 200,
  totalProfissionaisSus: 150,
  populacaoResidente: 10000,
  anoPopulacaoReferencia: 2024,
  populacaoEstimada: false,
  leitosExistentesPorMilMoradores: 4,
  leitosSusPorMilMoradores: 3,
  profissionaisPorMilMoradores: 20,
  profissionaisSusPorMilMoradores: 15,
  dataColeta: "2026-11-07",
  ...valores,
});

const rede = (serie: SaudeRedeAnoDTO[]): SaudeRedePorMilMoradoresDTO => ({
  portalSlug: "x",
  anoMin: serie[0].ano,
  anoMax: serie[serie.length - 1].ano,
  serie,
});

const farmacia = (
  valores: Partial<SaudeFarmaciaResumoDTO>,
): SaudeFarmaciaResumoDTO => ({
  status: "conforme",
  dataPosicaoMaisRecente: "2026-11-06",
  totalUnidadesAtivas: 9,
  essenciaisNoEstoque: 14,
  totalEssenciais: 20,
  ...valores,
});

describe("SaudeDestaqueOrigem", () => {
  it("diz quantos reais de cada R$ 100 vêm do Governo Federal e liga à seção", () => {
    render(
      <SaudeDestaqueOrigem
        ano={2026}
        fontes={{ percentualUniaoSus: 62, totalEntrada: 5_000_000 } as never}
      />,
    );
    expect(screen.getByText("R$ 62")).toBeInTheDocument();
    expect(
      screen.getByText("de cada R$ 100 vêm do Governo Federal"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver de onde veio cada parte/ }),
    ).toHaveAttribute("href", "#o-que-entrou");
  });

  it("sem entradas não inventa percentual", () => {
    render(
      <SaudeDestaqueOrigem
        ano={2026}
        fontes={{ percentualUniaoSus: 0, totalEntrada: 0 } as never}
      />,
    );
    expect(screen.queryByText(/de cada R\$ 100/)).toBeNull();
  });
});

describe("SaudeDestaqueRede", () => {
  it("mostra números absolutos do cadastro mais recente e compara com o ano anterior", () => {
    render(
      <SaudeDestaqueRede
        rede={rede([
          anoRede({
            ano: 2017,
            totalLeitosSus: 20,
            totalProfissionaisSus: 100,
          }),
          anoRede({
            ano: 2027,
            competenciaLeitos: 202709,
            competenciaProfissionais: 202709,
          }),
        ])}
      />,
    );
    expect(screen.getByText("Leitos do SUS")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(
      screen.getByText(
        "30 dos 40 leitos da cidade. Cadastro do CNES em 09/2027. Em 2017 eram 20",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "150 dos 200 profissionais da cidade. Cadastro do CNES em 09/2027. Em 2017 eram 100",
      ),
    ).toBeInTheDocument();
  });

  it("não usa por mil moradores nem estimativa de população no topo", () => {
    const { container } = render(
      <SaudeDestaqueRede rede={rede([anoRede({ populacaoEstimada: true })])} />,
    );
    expect(container.textContent).not.toMatch(/por mil|estimad/i);
  });

  it("sem dado da fonte mostra traço", () => {
    render(
      <SaudeDestaqueRede
        rede={rede([
          anoRede({ totalLeitosSus: null, totalProfissionaisSus: null }),
        ])}
      />,
    );
    expect(screen.getAllByText("—").length).toBe(2);
    expect(screen.getAllByText("sem dado da fonte").length).toBe(2);
  });
});

describe("SaudeDestaqueFarmacia", () => {
  it("conforme: mostra unidades e essenciais, com o aviso e o botão", () => {
    render(<SaudeDestaqueFarmacia farmacia={farmacia({})} portalSlug="x" />);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("14 de 20")).toBeInTheDocument();
    expect(
      screen.getByText(/informaram estoque \(lista de 06\/11\/2026\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Antes de ir, confirme com a unidade/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buscar remédio na Farmácia SUS" }),
    ).toBeInTheDocument();
  });

  it.each(["apagao", "indisponivel"] as const)(
    "%s: só texto e botão, sem números",
    (status) => {
      render(
        <SaudeDestaqueFarmacia
          farmacia={farmacia({
            status,
            totalUnidadesAtivas: null,
            essenciaisNoEstoque: null,
            totalEssenciais: null,
          })}
          portalSlug="x"
        />,
      );
      expect(screen.queryByText(/informaram estoque/)).toBeNull();
      expect(screen.queryByText(/essenciais/)).toBeNull();
      expect(
        screen.getByRole("button", { name: "Buscar remédio na Farmácia SUS" }),
      ).toBeInTheDocument();
    },
  );
});
