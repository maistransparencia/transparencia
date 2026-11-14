# Epic 26 Context: Camada Raw por Fonte (Fim do Schema por Município)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Passar a camada raw de "um schema por município" (`raw_<portal_slug>`) para "um schema por fonte" (`raw_siope`, `raw_siconfi`, `raw_fiorilli`...), com `portal_slug` como coluna e parte da chave primária de cada tabela. Motivo: escalabilidade; com muitos municípios, um schema por município (dezenas de tabelas cada) pesa no catálogo do Postgres, no `pg_dump`, nas migrações e nos `source` do dbt.

## Stories

- Story 26.1: Siconfi (MSC Patrimonial) em schema por fonte (concluída)
- Story 26.2: Inventário e plano de migração do legado raw por município
- Story 26.3: Migração das tabelas do portal municipal (Fiorilli), uma tabela ou grupo por story
- Story 26.4: Remoção dos schemas por município e dos modelos de consolidação
- Story 26.5: Migração do RGF (`siconfi_rgf`) para `raw_siconfi`

## Requirements & Constraints

- O schema é da fonte (fornecedor do portal ou fonte oficial), não do município, porque fornecedores diferentes têm estruturas diferentes.
- Toda fonte nova nasce por fonte, com `portal_slug` na chave.
- Paridade de dados antes e depois (mesmas contagens e totais por portal e saídas dos marts consumidores); recarga isolada por portal (`where portal_slug = ...`); plano de reversão; mudança de chave primária pode exigir `full-refresh`.
- Nada em produção sem autorização explícita do Julio (Regra 15); backup local com `make db/backup` antes de migrar.
- `int_*_consolidadas.sql` deixam de ser necessários (Regra 23: sem literal de tenant, joins e `GROUP BY` com `portal_slug`).
- Ajustar modelos dbt, `source` e a fixture/banco de teste (Regra 21).

## Technical Decisions

- Modelo a seguir: Story 24.9 (SIOPE em `raw_siope`) e 26.1 (`raw_siconfi`): corte direto, `portal_slug` aplicado na carga, script SQL idempotente de migração que deriva o slug do nome do schema e confere linhas e valores sem apagar as tabelas antigas.
- Já por fonte: `raw_siope`, `raw_siops`, `raw_farmacia_sus`, `raw_pncp`, `raw_obrasgov`, `raw_saude_rede`, `raw_inep_censo`, `raw_emendas_*`.
- Legado por município: `raw_porciuncula_prefeitura` e `raw_natividade_prefeitura` (mesmo conjunto: contratos, `despesas_*`, diarias, `emendas_*`, empresas, licitacoes, metadata, pessoal, `receita_*`, transferencias).

## Cross-Story Dependencies

- 26.2 bloqueia 26.3 e 26.4; a 26.1 (concluída) serve de modelo e seus aprendizados entram no plano.
- 26.5 (RGF) segue o método da 26.1.
- Relação com a pendência de migração de PK/`full-refresh` da Epic 19.
