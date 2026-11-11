import { defineConfig } from "vitest/config";
import { resolverTestDatabaseUrl } from "./src/test-database";

// Fixa as duas URLs no banco de teste antes de qualquer import do client: um DATABASE_URL
// exportado ou o .env da raiz (5544) nunca chegam aos testes.
const testDatabaseUrl = resolverTestDatabaseUrl();

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl,
      DATABASE_WRITE_URL: testDatabaseUrl,
    },
    globalSetup: ["./src/vitest-global-setup.ts"],
    setupFiles: ["./src/vitest-setup.ts"],
  },
});
