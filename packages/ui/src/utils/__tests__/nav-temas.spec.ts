import { describe, expect, it } from "vitest";
import { buildTemasNavItems } from "../nav";

describe("buildTemasNavItems", () => {
  it("sem argumentos retorna Saude, Educacao, Obras e Previdencia nessa ordem", () => {
    expect(buildTemasNavItems().map((tema) => tema.id)).toEqual([
      "saude",
      "educacao",
      "obras",
      "previdencia",
    ]);
  });

  it("omite Previdencia quando habilitado e false", () => {
    const ids = buildTemasNavItems({ previdencia: { habilitado: false } }).map(
      (tema) => tema.id,
    );
    expect(ids).toEqual(["saude", "educacao", "obras"]);
  });

  it("usa a sigla customizada como nome da Previdencia", () => {
    const previdencia = buildTemasNavItems({
      previdencia: { habilitado: true, sigla: "CAPREM" },
    }).at(-1);
    expect(previdencia?.name).toBe("CAPREM");
    expect(previdencia?.href).toBe("/previdencia");
  });

  it("expoe href e nome curto de cada tema", () => {
    const [saude, educacao, obras] = buildTemasNavItems();
    expect([saude.href, educacao.href, obras.href]).toEqual([
      "/saude",
      "/educacao",
      "/obras",
    ]);
    expect(obras.name).toBe("Obras Públicas");
    expect(obras.shortName).toBe("Obras");
  });
});
