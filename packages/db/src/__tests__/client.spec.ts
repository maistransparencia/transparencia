import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { db, dbWrite } from "../client";

describe("db client search_path", () => {
  it("deve inicializar conexão do pool de leitura com search_path incluindo analytics e public", async () => {
    const result = await sql<{ search_path: string }>`SHOW search_path`.execute(
      db,
    );
    expect(result.rows[0]?.search_path).toContain("analytics");
    expect(result.rows[0]?.search_path).toContain("public");
  });

  it("deve inicializar conexão do pool de escrita com search_path incluindo analytics e public", async () => {
    const result = await sql<{ search_path: string }>`SHOW search_path`.execute(
      dbWrite,
    );
    expect(result.rows[0]?.search_path).toContain("analytics");
    expect(result.rows[0]?.search_path).toContain("public");
  });
});
