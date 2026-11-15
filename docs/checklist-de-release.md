# Checklist de release

O deploy do site é externo (Vercel) e não roda `dbt`. O que a Vercel publica só funciona se o banco já tiver o que o código lê.

## Seeds novos ou alterados

- [ ] Rodar `dbt seed` no banco de produção **antes** do deploy (com autorização, regra 15 do `CLAUDE.md`).
- Motivo: `getEducacaoMediasNacionais` (`packages/db/src/queries/educacao-metrics.ts`) lê `seed_inep_ideb_brasil` e devolve vazio em silêncio se a tabela não existe; a tela some com a média do Brasil sem erro.
- Rede de segurança: toda ingestão agendada (`ingestion-group.yml`) roda `dbt deps` e `dbt seed` antes do `dbt run`, mas só na próxima execução do cron. Não substitui o passo acima.
