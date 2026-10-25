import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE_TEMA, scriptAntiFlashTema } from "./tema-script";

const executar = () => new Function(scriptAntiFlashTema)();
const temaEscuroAtivo = () =>
  document.documentElement.classList.contains("dark");

describe("scriptAntiFlashTema", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("aplica .dark quando o valor guardado é dark", () => {
    localStorage.setItem(CHAVE_TEMA, "dark");
    executar();
    expect(temaEscuroAtivo()).toBe(true);
  });

  it("mantém tema claro sem valor guardado", () => {
    executar();
    expect(temaEscuroAtivo()).toBe(false);
  });

  it.each(["light", "lixo", ""])("mantém tema claro com valor %j", (valor) => {
    localStorage.setItem(CHAVE_TEMA, valor);
    executar();
    expect(temaEscuroAtivo()).toBe(false);
  });

  it("não quebra quando localStorage lança exceção", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(executar).not.toThrow();
    expect(temaEscuroAtivo()).toBe(false);
  });
});
