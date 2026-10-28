import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ARQUIVOS = [
  "components/termometro-opacidade-fiscal.tsx",
  "components/radar-gastos-sensiveis.tsx",
  "components/restos-a-pagar-vendors-chart.tsx",
  "app/[portalSlug]/despesas/page.tsx",
].map((caminho) => ({
  nome: caminho,
  fonte: readFileSync(join(__dirname, "..", caminho), "utf8"),
}));

describe("Despesas no padrão Divisórias", () => {
  it.each(ARQUIVOS)(
    "$nome não usa cartões, hex, paleta fixa nem aliases legados",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/rounded-(\w+-)?(xl|2xl|3xl|lg|\[\d+px\])/);
      expect(fonte).not.toMatch(/shadow-(xs|sm|md|lg|xl)|\bbg-white\b/);
      expect(fonte).not.toMatch(
        /\b(bg|text|border|ring|from|to)-(slate|rose|amber|emerald|sky|blue|indigo|purple|gray|red|green)-/,
      );
      expect(fonte).not.toMatch(/(?<!&)#[0-9a-fA-F]{3,8}\b/);
      expect(fonte).not.toMatch(/\bdark:/);
      expect(fonte).not.toMatch(/\b(text-accent|text-subtleText|borderLine)\b/);
    },
  );

  it("a página usa SectionHeader de @transparencia/ui e KPIs divisoria", () => {
    const pagina = ARQUIVOS[3]?.fonte ?? "";
    expect(pagina).not.toContain("@/components/section-header");
    expect(pagina).toMatch(
      /import \{[^}]*\bSectionHeader\b[^}]*\} from "@transparencia\/ui"/,
    );
    expect(pagina.match(/variant="divisoria"/g)?.length).toBeGreaterThanOrEqual(
      9,
    );
  });
});
