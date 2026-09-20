CREATE SCHEMA IF NOT EXISTS analytics;

GRANT USAGE ON SCHEMA public TO read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO read_only;

GRANT USAGE ON SCHEMA analytics TO read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO read_only;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT USAGE, SELECT ON SEQUENCES TO read_only;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename, schemaname FROM pg_tables WHERE schemaname IN ('public', 'analytics')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.schemaname, r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS read_only_select ON %I.%I;', r.schemaname, r.tablename);
    EXECUTE format('CREATE POLICY read_only_select ON %I.%I FOR SELECT TO read_only USING (true);', r.schemaname, r.tablename);
  END LOOP;

  -- Exceção: Permissões de escrita e políticas RLS para newsletter_subscribers
  IF to_regclass('public.newsletter_subscribers') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only') THEN
      EXECUTE 'GRANT USAGE ON SCHEMA public TO read_only;';
      EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.newsletter_subscribers TO read_only;';
      EXECUTE 'DROP POLICY IF EXISTS newsletter_subscribers_read_only_all ON public.newsletter_subscribers;';
      EXECUTE 'CREATE POLICY newsletter_subscribers_read_only_all ON public.newsletter_subscribers FOR ALL TO read_only USING (true) WITH CHECK (true);';
    END IF;
  END IF;

  -- Exceção: Permissões de escrita e políticas RLS para push_subscriptions
  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only') THEN
      EXECUTE 'GRANT USAGE ON SCHEMA public TO read_only;';
      EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO read_only;';
      EXECUTE 'DROP POLICY IF EXISTS push_subscriptions_read_only_all ON public.push_subscriptions;';
      EXECUTE 'CREATE POLICY push_subscriptions_read_only_all ON public.push_subscriptions FOR ALL TO read_only USING (true) WITH CHECK (true);';
    END IF;
  END IF;
END
$$;

ALTER ROLE read_only SET search_path = analytics, public;
ALTER ROLE postgres SET search_path = analytics, public;
