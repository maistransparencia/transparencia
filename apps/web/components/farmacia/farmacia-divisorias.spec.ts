import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIRETORIO = __dirname;
const PAGINA = join(DIRETORIO, "../../app/[portalSlug]/farmacia/page.tsx");
const ARQUIVOS = [
  ...readdirSync(DIRETORIO)
    .filter((nome) => nome.endsWith(".tsx") && !nome.endsWith(".spec.tsx"))
    .map((nome) => join(DIRETORIO, nome)),
  PAGINA,
].map((caminho) => ({
  nome: caminho.split("/").slice(-2).join("/"),
  fonte: readFileSync(caminho, "utf8"),
}));

describe("Farmácia SUS no padrão Divisórias", () => {
  it.each(ARQUIVOS)(
    "$nome não usa cartões, hex nem paleta fixa",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/rounded-(\w+-)?(xl|2xl|3xl|lg|\[\d+px\])/);
      expect(fonte).not.toMatch(/shadow-(xs|sm|md|lg|xl)|\bbg-white\b/);
      expect(fonte).not.toMatch(/\b(bg|text|border)-(slate|rose)-/);
      expect(fonte).not.toMatch(/(?<!&)#[0-9a-fA-F]{3,8}\b/);
      expect(fonte).not.toMatch(/\bdark:/);
    },
  );
});
