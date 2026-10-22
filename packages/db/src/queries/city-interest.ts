import { sql } from "kysely";
import { dbWrite } from "../client";

export interface CityInterestRequestInput {
  email: string;
  cidade: string;
  uf: string;
  consentimento: boolean;
}

export interface CityInterestRequest {
  id: string;
  email: string;
  cidade: string;
  cidadeNormalizada: string;
  uf: string;
  consentimento: boolean;
  createdAt: Date | string;
}

interface CityInterestRequestRow {
  id: string;
  email: string;
  cidade: string;
  cidade_normalizada: string;
  uf: string;
  consentimento: boolean;
  created_at: Date | string;
}

/**
 * Normaliza o nome da cidade: minúsculas, sem acentos, sem espaços nas pontas
 * e com espaços internos colapsados.
 */
export function normalizeCityName(cidade: string): string {
  return cidade
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Registra o interesse de um cidadão em uma cidade ainda não integrada.
 * Idempotente por (email, cidade normalizada, UF): repetir o pedido não duplica
 * nem altera o registro original.
 */
export async function registerCityInterest(
  input: CityInterestRequestInput,
  dbInstance = dbWrite,
): Promise<CityInterestRequest> {
  const email = input.email.trim().toLowerCase();
  const cidade = input.cidade.trim().replace(/\s+/g, " ");
  const cidadeNormalizada = normalizeCityName(cidade);
  const uf = input.uf.trim().toUpperCase();

  const result = await sql<CityInterestRequestRow>`
    WITH inserted AS (
      INSERT INTO public.city_interest_requests (
        email, cidade, cidade_normalizada, uf, consentimento
      ) VALUES (
        ${email}, ${cidade}, ${cidadeNormalizada}, ${uf}, ${input.consentimento}
      )
      ON CONFLICT (email, cidade_normalizada, uf) DO NOTHING
      RETURNING *
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT * FROM public.city_interest_requests
    WHERE email = ${email}
      AND cidade_normalizada = ${cidadeNormalizada}
      AND uf = ${uf}
    LIMIT 1
  `.execute(dbInstance);

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    cidade: row.cidade,
    cidadeNormalizada: row.cidade_normalizada,
    uf: row.uf,
    consentimento: row.consentimento,
    createdAt: row.created_at,
  };
}
