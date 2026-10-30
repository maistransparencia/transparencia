import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CAMINHOS = [
  "app/[portalSlug]/pessoal/page.tsx",
  "app/[portalSlug]/receitas/page.tsx",
  "app/[portalSlug]/orcamento/page.tsx",
  "components/decimo-terceiro-card.tsx",
  "components/proventos-distribution-chart.tsx",
  "components/pessoal-regime-section.tsx",
  "components/saldo-caixa-entidades-section.tsx",
  "components/carros-chefe-arrecadacao.tsx",
  "components/emendas-card.tsx",
  "components/previsto-vs-arrecadado.tsx",
  "components/radar-anomalia-card.tsx",
  "components/funil-execucao-horizontal.tsx",
  "components/gasto-por-funcao-bars.tsx",
];

const ARQUIVOS = CAMINHOS.map((caminho) => ({
  nome: caminho,
  fonte: readFileSync(join(__dirname, "..", caminho), "utf8"),
}));

describe("Pessoal, Receitas e Orçamento no padrão Divisórias", () => {
  it.each(ARQUIVOS)(
    "$nome não usa cartões, hex, paleta fixa nem aliases legados",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/rounded-(\w+-)?(xl|2xl|3xl|lg|\[\d+px\])/);
      expect(fonte).not.toMatch(/shadow-(2xs|xs|sm|md|lg|xl)|\bbg-white\b/);
      expect(fonte).not.toMatch(
        /\b(bg|text|border|ring|from|to|decoration)-(slate|rose|amber|emerald|sky|blue|indigo|purple|violet|lime|cyan|teal|gray|red|green)-/,
      );
      expect(fonte).not.toMatch(/(?<!&)#[0-9a-fA-F]{3,8}\b/);
      expect(fonte).not.toMatch(/\bdark:/);
      expect(fonte).not.toMatch(
        /\b(text|bg|border)-(accent|subtleText|mutedText|cardBg|borderLine)\b|\bborderLine\b/,
      );
    },
  );

  it.each(ARQUIVOS)(
    "$nome não usa h5/h6, font-mono, UF nem ano fixo",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/<h[56]\b/);
      expect(fonte).not.toMatch(/\bfont-mono\b/);
      expect(fonte).not.toMatch(/["'`>(\s]RJ["'`<)\s]/);
      expect(fonte).not.toMatch(/\b20[12]\d\b/);
    },
  );

  it("pessoal e orçamento usam KPIs divisória, receitas usa o destaque; receitas e orçamento usam SectionHeader do UI", () => {
    const [pessoal, receitas, orcamento] = ARQUIVOS.map((a) => a.fonte);
    expect(pessoal).toContain('data-testid="pessoal-destaque"');
    expect(pessoal).toContain('<KPIGrid columns={3} variant="divisoria">');
    expect(receitas).toContain('data-testid="receitas-destaque"');
    expect(orcamento).toContain('variant="divisoria"');
    for (const pagina of [receitas, orcamento]) {
      expect(pagina).toMatch(
        /import \{[^}]*\bSectionHeader\b[^}]*\} from "@transparencia\/ui"/,
      );
    }
  });
});
