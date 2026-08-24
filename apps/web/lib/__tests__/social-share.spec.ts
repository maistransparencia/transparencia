import { describe, expect, it } from "vitest";
import { formatQuoteForSharing, getSocialShareLinks } from "../social-share";

describe("Utilitários de Compartilhamento Social (social-share)", () => {
  it("formata a citação para cópia direta incluindo nome do portal, texto e fonte", () => {
    const text = "O município gastou R$ 1.5M em saúde em 2024.";
    const portalUrl = "https://maistransparencia.com.br/porciuncula/saude";
    const portalDisplayName = "Prefeitura Municipal de Porciúncula";

    const {
      formattedQuote,
      shareUrl,
      portalDisplayName: resName,
    } = formatQuoteForSharing({
      text,
      portalUrl,
      portalDisplayName,
    });

    expect(resName).toBe("Prefeitura Municipal de Porciúncula");
    expect(formattedQuote).toContain(
      "Olha o que eu descobri na Prefeitura Municipal de Porciúncula via MaisTransparência:",
    );
    expect(formattedQuote).toContain(`> "${text}"`);
    expect(formattedQuote).toContain("Fonte: MaisTransparência");
    expect(formattedQuote).toContain(portalUrl);
    expect(shareUrl).toBe(portalUrl);
  });

  it("inclui os destaques dos cards de métricas na citação formatada para não omitir dados", () => {
    const text =
      "O valor total pendente com postos de combustíveis soma R$ 1.236.224,06.";
    const metrics = [
      { title: "Posto Shell 2025", value: "R$ 720.000,00" },
      { title: "Posto Ipiranga 2026", value: "R$ 516.224,06" },
    ];

    const { formattedQuote } = formatQuoteForSharing({
      text,
      metrics,
      portalDisplayName: "Prefeitura de Porciúncula",
    });

    expect(formattedQuote).toContain("• Posto Shell 2025: R$ 720.000,00");
    expect(formattedQuote).toContain("• Posto Ipiranga 2026: R$ 516.224,06");
  });

  it("utiliza fallback neutro 'Portal da Transparência' quando nenhum nome é fornecido", () => {
    const { portalDisplayName } = formatQuoteForSharing({ text: "Teste" });
    expect(portalDisplayName).toBe("Portal da Transparência");
  });

  it("gera links estruturados para cópia direta via getSocialShareLinks", () => {
    const text = "Receitas municipais atingiram R$ 50M.";
    const links = getSocialShareLinks({ text });

    expect(links.formattedQuote).toContain(
      "Receitas municipais atingiram R$ 50M.",
    );
    expect(links.portalDisplayName).toBe("Portal da Transparência");
  });
});
