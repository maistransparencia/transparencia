import { sql } from "kysely";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbWrite } from "../../client";
import { runMigrations } from "../../migrator";
import { normalizeCityName, registerCityInterest } from "../city-interest";

const EMAIL = "cidadao.interesse@exemplo.com";

describe("city interest queries", () => {
  beforeAll(async () => {
    await runMigrations(dbWrite);
  });

  beforeEach(async () => {
    await sql`DELETE FROM public.city_interest_requests WHERE email = ${EMAIL}`.execute(
      dbWrite,
    );
  });

  it("normaliza minúsculas, acentos e espaços", () => {
    expect(normalizeCityName("  São   João  da Barra ")).toBe(
      "sao joao da barra",
    );
  });

  it("registra o pedido com cidade normalizada e e-mail em minúsculas", async () => {
    const request = await registerCityInterest({
      email: ` ${EMAIL.toUpperCase()} `,
      cidade: "  Sao  Paulo ",
      uf: "sp",
      consentimento: true,
    });
    expect(request.email).toBe(EMAIL);
    expect(request.cidade).toBe("Sao Paulo");
    expect(request.cidadeNormalizada).toBe("sao paulo");
    expect(request.uf).toBe("SP");
    expect(request.consentimento).toBe(true);
  });

  it("é idempotente para o mesmo e-mail, cidade normalizada e UF", async () => {
    const first = await registerCityInterest({
      email: EMAIL,
      cidade: "São Paulo",
      uf: "SP",
      consentimento: true,
    });
    const second = await registerCityInterest({
      email: EMAIL,
      cidade: "sao  paulo",
      uf: "SP",
      consentimento: true,
    });
    expect(second.id).toBe(first.id);
    const count = await sql<{
      total: string;
    }>`SELECT count(*) AS total FROM public.city_interest_requests WHERE email = ${EMAIL}`.execute(
      dbWrite,
    );
    expect(count.rows[0].total).toBe("1");
  });

  it("aceita a mesma cidade em UFs diferentes", async () => {
    const a = await registerCityInterest({
      email: EMAIL,
      cidade: "Rio Claro",
      uf: "SP",
      consentimento: true,
    });
    const b = await registerCityInterest({
      email: EMAIL,
      cidade: "Rio Claro",
      uf: "RJ",
      consentimento: true,
    });
    expect(a.id).not.toBe(b.id);
  });

  it("rejeita UF com tamanho diferente de 2", async () => {
    await expect(
      registerCityInterest({
        email: EMAIL,
        cidade: "X",
        uf: "SPP",
        consentimento: true,
      }),
    ).rejects.toThrow();
  });
});
