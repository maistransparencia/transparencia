import path from "node:path";
import { resolverTestDatabaseUrl } from "@transparencia/db/src/test-database";
import { defineConfig } from "vitest/config";

// Specs que importam @transparencia/db criam o pool do client; ele aponta para o banco de teste,
// nunca para o .env da raiz (5544) nem para um DATABASE_URL exportado.
const testDatabaseUrl = resolverTestDatabaseUrl();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.spec.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    setupFiles: ["./vitest-setup.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl,
      DATABASE_WRITE_URL: testDatabaseUrl,
    },
  },
});
