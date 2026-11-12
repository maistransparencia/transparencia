import { afterAll } from "vitest";
import { closeDb } from "./client";
import { motivoRecusaUrlTeste } from "./test-database";

// O pool só conecta na primeira query; se alguma URL escapou do vitest.config, o teste para aqui.
for (const variavel of ["DATABASE_URL", "DATABASE_WRITE_URL"]) {
  const motivo = motivoRecusaUrlTeste(process.env[variavel] ?? "");
  if (motivo) {
    throw new Error(`Testes recusados: ${variavel} com ${motivo}.`);
  }
}

afterAll(async () => {
  await closeDb();
});
