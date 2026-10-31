import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CAMINHOS = [
  "app/[portalSlug]/saude/page.tsx",
  "app/[portalSlug]/educacao/page.tsx",
  "components/saude-hero-section.tsx",
  "components/saude-contratacao-section.tsx",
  "components/emendas-section.tsx",
  "components/saude-origem-recursos.tsx",
  "components/evolucao-anual.tsx",
  "components/educacao-resumo-card.tsx",
  "components/educacao/categoria-contrato-card.tsx",
  "components/educacao/contratos-categoria-modal.tsx",
  "components/educacao/educacao-aprendizado-section.tsx",
  "components/educacao/educacao-contratos-section.tsx",
  "components/educacao/educacao-hero-section.tsx",
  "components/educacao/educacao-historico-section.tsx",
  "components/educacao/educacao-origem-recursos-section.tsx",
  "components/educacao/fonte-recurso-modal.tsx",
];

/** Nomes oficiais de documentos e normas que carregam ano no próprio título. */
const CITACOES_OFICIAIS = /Nota Informativa do Ideb 2025|\/2021/g;

const ARQUIVOS = CAMINHOS.map((caminho) => ({
  nome: caminho,
  fonte: readFileSync(join(__dirname, "..", caminho), "utf8"),
}));

describe("Saúde e Educação no padrão Divisórias", () => {
  it.each(ARQUIVOS)(
    "$nome não usa cartões, hex, paleta fixa nem aliases legados",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/rounded-(\w+-)?(xl|2xl|3xl|lg|\[\d+px\])/);
      expect(fonte).not.toMatch(/shadow-(2xs|xs|sm|md|lg|xl)|\bbg-white\b/);
      expect(fonte).not.toMatch(
        /\b(bg|text|border|ring|from|to|decoration|fill|stroke)-(slate|rose|amber|emerald|sky|blue|indigo|purple|violet|lime|cyan|teal|gray|red|green|orange|yellow)-/,
      );
      expect(fonte).not.toMatch(/(?<!&)#[0-9a-fA-F]{3,8}\b/);
      expect(fonte).not.toMatch(/\bdark:/);
      expect(fonte).not.toMatch(
        /\b(text|bg|border)-(accent|subtleText|mutedText|cardBg|borderLine)\b|\bborderLine\b/,
      );
      expect(fonte).not.toMatch(/text-\[\d+px\]/);
    },
  );

  it.each(ARQUIVOS)(
    "$nome não usa h5/h6, font-mono, UF nem ano fixo",
    ({ fonte }) => {
      const semCitacoes = fonte.replace(CITACOES_OFICIAIS, "");
      expect(fonte).not.toMatch(/<h[56]\b/);
      expect(fonte).not.toMatch(/\bfont-mono\b/);
      expect(fonte).not.toMatch(/["'`>(\s]RJ["'`<)\s]/);
      expect(semCitacoes).not.toMatch(/\b20[12]\d\b/);
    },
  );

  it.each(ARQUIVOS)(
    "$nome não dá tamanho por classe a títulos h1 a h4",
    ({ fonte }) => {
      const titulos = fonte.match(/<h[1-4]\b[^>]*>/g) ?? [];
      for (const titulo of titulos) {
        expect(titulo).not.toMatch(/\btext-(xs|sm|base|lg|xl|\dxl)\b/);
      }
    },
  );

  it("a página de saúde usa SectionHeader e IndicatorPanel", () => {
    const [saude] = ARQUIVOS.map((a) => a.fonte);
    expect(saude).toMatch(
      /import \{[^}]*\bSectionHeader\b[^}]*\} from "@transparencia\/ui"/,
    );
    expect(saude).toContain("<IndicatorPanel");
  });

  it("gráficos usam corDoGrafico", () => {
    const graficos = ARQUIVOS.filter(({ nome }) =>
      /fiscal-section|historico-section/.test(nome),
    );
    for (const { fonte } of graficos) {
      expect(fonte).toContain("corDoGrafico(");
    }
  });
});
