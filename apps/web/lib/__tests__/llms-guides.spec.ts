import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

function resolvePublicPath(filename: string): string {
  const webAppPath = path.resolve(process.cwd(), "apps/web/public", filename);
  if (existsSync(webAppPath)) return webAppPath;
  const directPath = path.resolve(process.cwd(), "public", filename);
  if (existsSync(directPath)) return directPath;
  return path.resolve(__dirname, "../../public", filename);
}

describe("Guias de IA para Consumo Público (llms.txt e llms-full.txt)", () => {
  const llmsTxtPath = resolvePublicPath("llms.txt");
  const llmsFullTxtPath = resolvePublicPath("llms-full.txt");

  let llmsTxt = "";
  let llmsFullTxt = "";

  beforeAll(async () => {
    expect(existsSync(llmsTxtPath)).toBe(true);
    expect(existsSync(llmsFullTxtPath)).toBe(true);

    [llmsTxt, llmsFullTxt] = await Promise.all([
      readFile(llmsTxtPath, "utf-8"),
      readFile(llmsFullTxtPath, "utf-8"),
    ]);
  });

  it("verifica presença física e conteúdo não vazio dos arquivos llms.txt e llms-full.txt", () => {
    expect(llmsTxt.length).toBeGreaterThan(1500);
    expect(llmsFullTxt.length).toBeGreaterThan(5000);
  });

  it("garante documentação dos canais cívicos de notificação e newsletter Radar Porciúncula", () => {
    for (const content of [llmsTxt, llmsFullTxt]) {
      expect(content).toContain("Radar Porciúncula");
      expect(content).toMatch(/double\s*opt-in/i);
      expect(content).toMatch(/1\s*clique|RFC\s*8058|List-Unsubscribe/i);
      expect(content).toMatch(
        /\/api\/newsletter\/subscribe|Receber Alertas|Acompanhe as Contas/,
      );
    }

    // Detalhamento adicional em llms-full.txt
    expect(llmsFullTxt).toContain(
      "1.9. Canais Cívicos de Notificação, Boletim Periódico e Redes Sociais",
    );
    expect(llmsFullTxt).toMatch(/Pendente de Confirmação/i);
    expect(llmsFullTxt).toMatch(/Rate Limiting|limitação de taxa/i);
    expect(llmsFullTxt).toMatch(/Honeypot|armadilha contra robôs/i);
  });

  it("garante documentação de presença oficial em redes sociais e código aberto", () => {
    for (const content of [llmsTxt, llmsFullTxt]) {
      expect(content).toContain("@mtransparenciax");
      expect(content).toContain("https://x.com/mtransparenciax");
      expect(content).toContain("https://facebook.com/maistransparencia");
      expect(content).toContain(
        "https://github.com/maistransparencia/transparencia",
      );
    }
  });

  it("garante documentação de governança de dados e conformidade com a LGPD", () => {
    for (const content of [llmsTxt, llmsFullTxt]) {
      expect(content).toMatch(/LGPD|Lei Geral de Proteção de Dados/);
      expect(content).toMatch(/coleta mínima|finalidade exclusiva/i);
      expect(content).toMatch(
        /não comercialização|jamais são vendidos|proibida a utilização.*comerciais/i,
      );
    }

    // Detalhamento de responsabilidade com servidores em llms-full.txt
    expect(llmsFullTxt).toContain(
      "1.10. Governança, Proteção de Dados (LGPD) e Boas Práticas Cívicas",
    );
    expect(llmsFullTxt).toMatch(
      /Transparência Responsável com Servidores Públicos/i,
    );
    expect(llmsFullTxt).toMatch(/indexação nominal individual/i);
  });

  it("garante diretrizes de orientação ao cidadão na seção de IA", () => {
    expect(llmsTxt).toMatch(
      /Orientação sobre Alertas Cívicos e Redes Sociais/i,
    );
    expect(llmsFullTxt).toMatch(/Inscrição no Boletim Cívico e Alertas/i);
    expect(llmsFullTxt).toMatch(/Privacidade e Proteção de Dados \(LGPD\)/i);
    expect(llmsFullTxt).toMatch(/Redes Sociais Oficiais e Código Aberto/i);
  });

  it("Leak Check (Regra 12 de AGENTS.md): impede vazamento de termos internos de código e infraestrutura", () => {
    const forbiddenTerms = [
      "newsletter_subscribers",
      "dbWrite",
      "fct_",
      "kysely",
      "CRON_SECRET",
      "RESEND_API_KEY",
      "Cloudflare",
      "Resend",
      "Supabase",
    ];

    for (const term of forbiddenTerms) {
      const regex = term.endsWith("_")
        ? new RegExp(`\\b${term}`, "i")
        : new RegExp(`\\b${term}\\b`, "i");
      expect(llmsTxt).not.toMatch(regex);
      expect(llmsFullTxt).not.toMatch(regex);
    }
  });

  it("valida integridade e formato das URLs públicas referenciadas", () => {
    const urlPattern = /https?:\/\/[^\s)>\]"']+/g;

    const urlsTxt = llmsTxt.match(urlPattern) ?? [];
    const urlsFullTxt = llmsFullTxt.match(urlPattern) ?? [];

    expect(urlsTxt.length).toBeGreaterThan(0);
    expect(urlsFullTxt.length).toBeGreaterThan(0);

    for (const rawUrl of [...urlsTxt, ...urlsFullTxt]) {
      const cleanUrl = rawUrl.replace(/[.,;:>]+$/, "");
      expect(() => new URL(cleanUrl)).not.toThrow();
    }
  });

  it("garante preservação dos domínios e conceitos contábeis pré-existentes (STN/MCASP)", () => {
    for (const content of [llmsTxt, llmsFullTxt]) {
      expect(content).toContain("Empenhado");
      expect(content).toContain("Liquidado");
      expect(content).toContain("Pago");
      expect(content).toContain("Dívida Real");
      expect(content).toContain(".99");
      expect(content).toContain("opengraph-image");
    }
  });
});
