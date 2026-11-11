import { defineConfig } from "@playwright/test";

const porta = Number(process.env.VISUAL_PORT ?? 3001);

/**
 * Teste visual opt-in (`pnpm --filter @transparencia/web test:visual`).
 * Depende do servidor Next local e do banco local; fora de `make test`.
 */
export default defineConfig({
  testDir: "./e2e/visual",
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{testFileName}/{arg}-{projectName}{ext}",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  use: {
    baseURL: `http://localhost:${porta}`,
    colorScheme: "light",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 1,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `pnpm dev`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: String(porta) },
  },
});
