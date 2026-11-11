import { render } from "@testing-library/react";
import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LicitacoesTempoNaPagina } from "./licitacoes-tempo-na-pagina";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const definirVisibilidade = (estado: "hidden" | "visible") => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: estado,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("LicitacoesTempoNaPagina", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    definirVisibilidade("visible");
    vi.mocked(posthog.capture).mockClear();
  });

  it("envia segundos e tipo de viewport ao ocultar a página", () => {
    vi.useFakeTimers();
    window.innerWidth = 375;
    render(<LicitacoesTempoNaPagina />);
    vi.advanceTimersByTime(12_000);
    definirVisibilidade("hidden");
    expect(posthog.capture).toHaveBeenCalledWith("licitacoes_tempo_na_pagina", {
      segundos: 12,
      tipo_viewport: "mobile",
    });
  });

  it("não envia nada enquanto a página está visível", () => {
    render(<LicitacoesTempoNaPagina />);
    definirVisibilidade("visible");
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("remove o listener ao desmontar", () => {
    const { unmount } = render(<LicitacoesTempoNaPagina />);
    unmount();
    definirVisibilidade("hidden");
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("acumula só intervalos visíveis e zera após cada envio", () => {
    vi.useFakeTimers();
    window.innerWidth = 1280;
    render(<LicitacoesTempoNaPagina />);
    vi.advanceTimersByTime(5_000);
    definirVisibilidade("hidden");
    vi.advanceTimersByTime(60_000);
    definirVisibilidade("visible");
    vi.advanceTimersByTime(3_000);
    definirVisibilidade("hidden");

    expect(posthog.capture).toHaveBeenNthCalledWith(
      1,
      "licitacoes_tempo_na_pagina",
      { segundos: 5, tipo_viewport: "desktop" },
    );
    expect(posthog.capture).toHaveBeenNthCalledWith(
      2,
      "licitacoes_tempo_na_pagina",
      { segundos: 3, tipo_viewport: "desktop" },
    );
  });

  it("envia também em pagehide", () => {
    vi.useFakeTimers();
    render(<LicitacoesTempoNaPagina />);
    vi.advanceTimersByTime(4_000);
    window.dispatchEvent(new Event("pagehide"));
    expect(posthog.capture).toHaveBeenCalledWith(
      "licitacoes_tempo_na_pagina",
      expect.objectContaining({ segundos: 4 }),
    );
  });

  it("não conta tempo quando monta com a aba oculta", () => {
    vi.useFakeTimers();
    definirVisibilidade("hidden");
    render(<LicitacoesTempoNaPagina />);
    vi.advanceTimersByTime(30_000);
    definirVisibilidade("hidden");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
