-- Inicialização do usuário read_only no ambiente de desenvolvimento local
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only') THEN
    CREATE ROLE read_only WITH LOGIN PASSWORD 'reader';
  ELSE
    ALTER ROLE read_only WITH LOGIN PASSWORD 'reader';
  END IF;
END
$$;

-- Acesso ao schema public e todos os dados existentes
GRANT USAGE ON SCHEMA public TO read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO read_only;

-- Permissões automáticas para futuras tabelas e sequências criadas no schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO read_only;
