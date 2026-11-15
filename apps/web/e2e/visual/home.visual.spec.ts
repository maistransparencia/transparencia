import { expect, test } from "@playwright/test";

const CHAVE_TEMA = "mt-tema";
const temas = ["claro", "escuro"] as const;

/** Slug do portal vem do ambiente ou do primeiro portal do banco local. */
async function resolverPortalSlug(): Promise<string> {
  const doAmbiente = process.env.VISUAL_PORTAL_SLUG;
  if (doAmbiente) return doAmbiente;
  const modulo = await import("@transparencia/db");
  // O Playwright pode expor o módulo ESM do workspace sob `default`.
  const { getAllPortais } = (
    "getAllPortais" in modulo
      ? modulo
      : (modulo as { default: typeof modulo }).default
  ) as typeof modulo;
  const [primeiro] = (await getAllPortais()).sort((a, b) =>
    a.portalSlug.localeCompare(b.portalSlug),
  );
  if (!primeiro) throw new Error("Nenhum portal no banco local");
  return primeiro.portalSlug;
}

for (const tema of temas) {
  test(`home no tema ${tema}`, async ({ page }) => {
    const portalSlug = await resolverPortalSlug();
    await page.addInitScript(
      ([chave, valor]) => localStorage.setItem(chave, valor),
      [CHAVE_TEMA, tema === "escuro" ? "dark" : "light"],
    );
    await page.goto(`/${portalSlug}`, { waitUntil: "load" });
    await page.locator("h1").first().waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        "nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });
    await expect(page.locator("html")).toHaveClass(
      tema === "escuro" ? /dark/ : /^((?!dark).)*$/,
    );
    await expect(page).toHaveScreenshot(`home-${tema}.png`, {
      fullPage: true,
      mask: [page.locator(".leaflet-container")],
    });
  });
}
