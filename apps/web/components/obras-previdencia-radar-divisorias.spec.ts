import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CAMINHOS = [
  "app/[portalSlug]/obras/page.tsx",
  "app/[portalSlug]/previdencia/page.tsx",
  "app/[portalSlug]/radar/page.tsx",
  "components/obras-resumo-card.tsx",
  "components/obras/obras-civic-disclaimer.tsx",
  "components/obras/obras-contratos-vinculados.tsx",
  "components/obras/obras-detalhe-modal.tsx",
  "components/obras/obras-empenhos-federais.tsx",
  "components/obras/obras-grafico-avanco-duplo.tsx",
  "components/obras/obras-hero-section.tsx",
  "components/obras/obras-interactive-section.tsx",
  "components/obras/obras-mapa-interativo.tsx",
  "components/obras/obras-paralisadas-section.tsx",
  "components/previdencia-actuarial-risk-section.tsx",
  "components/previdencia-entidades-donut.tsx",
  "components/previdencia-hero-section.tsx",
  "components/previdencia-patrimonio-historico-section.tsx",
  "components/previdencia-saldo-caixa-card.tsx",
  "components/radar-anomalia-card.tsx",
  "components/radar-civico-feed.tsx",
  "components/radar-gastos-sensiveis.tsx",
];

/** Nomes oficiais de normas que carregam ano no próprio título (ex.: Lei nº 14.133/2021). */
const CITACOES_OFICIAIS = /\/20(?:11|21)\b/g;

const ARQUIVOS = CAMINHOS.map((caminho) => ({
  nome: caminho,
  fonte: readFileSync(join(__dirname, "..", caminho), "utf8"),
}));

describe("Obras, Previdência e Radar no padrão Divisórias", () => {
  const SEM_PILULA = [
    "components/radar-gastos-sensiveis.tsx",
    "components/previdencia-saldo-caixa-card.tsx",
    "components/obras/obras-empenhos-federais.tsx",
    "components/obras/obras-detalhe-modal.tsx",
  ];

  it.each(ARQUIVOS.filter(({ nome }) => SEM_PILULA.includes(nome)))(
    "$nome usa o raio do Badge (rounded-sm) nos selos, sem pílula nem rounded-md",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/\brounded-(md|full)\b|\brounded(?![-\w])/);
    },
  );

  it.each(ARQUIVOS)(
    "$nome não usa cartões, hex, paleta fixa nem aliases legados",
    ({ fonte }) => {
      expect(fonte).not.toMatch(/rounded-(\w+-)?(xl|2xl|3xl|lg|\[\d+px\])/);
      expect(fonte).not.toMatch(/shadow-(2xs|xs|sm|md|lg|xl)|\bbg-white\b/);
      expect(fonte).not.toMatch(
        /\b(bg|text|border|ring|from|to|decoration|fill|stroke)-(slate|rose|amber|emerald|sky|blue|indigo|purple|violet|lime|cyan|teal|gray|red|green|orange|yellow|zinc|stone|neutral)-/,
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

  it("as páginas usam SectionHeader ou KPICard em divisória", () => {
    const [obras, previdencia] = ARQUIVOS.map((a) => a.fonte);
    expect(previdencia).toContain('variant="divisoria"');
    expect(previdencia).toMatch(/\bSectionHeader\b/);
    expect(obras).toBeDefined();
  });

  it("o mapa de obras acompanha o tema escuro", () => {
    const mapa = ARQUIVOS.find(({ nome }) =>
      nome.endsWith("mapa-interativo.tsx"),
    );
    const resumo = ARQUIVOS.find(({ nome }) =>
      nome.endsWith("resumo-card.tsx"),
    );
    expect(mapa?.fonte).toContain("mapa-tema");
    expect(resumo?.fonte).toContain("mapa-tema-imagem");
  });

  it("gráficos usam corDoGrafico", () => {
    const graficos = ARQUIVOS.filter(({ nome }) =>
      /entidades-donut|patrimonio-historico/.test(nome),
    );
    for (const { fonte } of graficos) {
      expect(fonte).toContain("corDoGrafico(");
    }
  });
});
