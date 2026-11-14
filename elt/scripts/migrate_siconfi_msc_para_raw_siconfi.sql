-- Copia siconfi_msc_patrimonial de raw_<portal> para o schema único raw_siconfi (Story 26.1).
-- Idempotente. `portal_slug` é derivado do nome do schema de origem (raw_<portal_slug>).
-- Confere paridade (linhas e soma de valor por portal) antes de concluir; se divergir, aborta.
-- As tabelas antigas NÃO são apagadas (remoção na 26.4), o que mantém a reversão simples.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
-- Depois da migração, rode `make dbt/run` (stg_siconfi__msc_patrimonial e marts consumidores).
-- Só rodar em produção com autorização explícita (Regra 15).
BEGIN;

CREATE SCHEMA IF NOT EXISTS raw_siconfi;
CREATE TABLE IF NOT EXISTS raw_siconfi.siconfi_msc_patrimonial (
    portal_slug TEXT NOT NULL,
    ano INTEGER NOT NULL,
    mes_referencia INTEGER NOT NULL,
    cod_ibge INTEGER NOT NULL,
    tipo_matriz TEXT NOT NULL,
    classe_conta INTEGER NOT NULL,
    conta_contabil TEXT NOT NULL,
    poder_orgao TEXT NOT NULL,
    financeiro_permanente INTEGER NOT NULL,
    ano_fonte_recursos INTEGER NOT NULL,
    fonte_recursos TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    natureza_conta TEXT NOT NULL,
    tipo_valor TEXT NOT NULL,
    entrada_msc INTEGER NOT NULL DEFAULT 0,
    complemento_fonte TEXT,
    data_referencia TEXT,
    data_extracao TEXT,
    PRIMARY KEY (portal_slug, ano, mes_referencia, cod_ibge, conta_contabil, poder_orgao, fonte_recursos, ano_fonte_recursos, financeiro_permanente, tipo_valor, natureza_conta, entrada_msc)
);

DO $$
DECLARE
    antiga RECORD;
    slug TEXT;
    linhas_antigas BIGINT;
    soma_antiga NUMERIC;
    linhas_novas BIGINT;
    soma_nova NUMERIC;
BEGIN
    FOR antiga IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name = 'siconfi_msc_patrimonial' AND table_schema LIKE 'raw\_%' AND table_schema <> 'raw_siconfi'
    LOOP
        slug := substr(antiga.table_schema, 5);
        EXECUTE format(
            'INSERT INTO raw_siconfi.siconfi_msc_patrimonial
             SELECT %L, ano, mes_referencia::int, cod_ibge::int, tipo_matriz, classe_conta::int, conta_contabil, poder_orgao,
                 financeiro_permanente::int, ano_fonte_recursos::int, fonte_recursos, valor::numeric, natureza_conta, tipo_valor,
                 entrada_msc::int, complemento_fonte, data_referencia, data_extracao
             FROM %I.siconfi_msc_patrimonial ON CONFLICT DO NOTHING', slug, antiga.table_schema);
        EXECUTE format('SELECT count(*), coalesce(sum(valor::numeric), 0) FROM %I.siconfi_msc_patrimonial', antiga.table_schema)
            INTO linhas_antigas, soma_antiga;
        SELECT count(*), coalesce(sum(valor), 0) INTO linhas_novas, soma_nova
            FROM raw_siconfi.siconfi_msc_patrimonial WHERE portal_slug = slug;
        IF linhas_antigas <> linhas_novas OR soma_antiga <> soma_nova THEN
            RAISE EXCEPTION 'paridade falhou em %: % linhas / soma % antes, % linhas / soma % em raw_siconfi',
                antiga.table_schema, linhas_antigas, soma_antiga, linhas_novas, soma_nova;
        END IF;
    END LOOP;
END $$;

COMMIT;
