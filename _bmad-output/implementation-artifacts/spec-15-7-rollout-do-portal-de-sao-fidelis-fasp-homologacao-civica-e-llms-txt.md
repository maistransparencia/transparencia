---
title: 'Story 15.7: Rollout do Portal de São Fidélis (FASP), Homologação Cívica e Atualização dos Guias de IA'
type: 'feature'
created: '2026-10-02'
status: 'backlog'
baseline_revision: ''
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A plataforma de transparência fiscal atua para Porciúncula, Natividade e Bom Jesus do Itabapoana, mas a população de São Fidélis (~38 mil habitantes) e agentes autônomos de IA ainda não contam com homologação cívica completa e esteira dedicada de extração de receitas históricas.

**Approach:** Executar a esteira dedicada de extração e carga de receitas históricas CSV (`elt/extract/fiorilli/sao_fidelis_prefeitura/receitas_csv.py` e `elt/load/fiorilli/sao_fidelis_prefeitura/load_receitas_csv.py`), homologar os indicadores de despesas, receitas, licitações, pessoal e previdência (FASP) de São Fidélis, e atualizar os guias públicos de IA (`llms.txt` e `llms-full.txt`) conforme a Regra 12.

## Boundaries & Constraints

**Always:**
- Salvar e carregar dados históricos estritamente em `data/raw/sao_fidelis_prefeitura/receitas_csv/` e schema `raw_sao_fidelis_prefeitura`.
- Garantir isolamento de `portal_slug` em todas as queries e telas, prevenindo vazamento de dados.
- Sincronizar fixtures compactados via `make db/fixture/dump` e `make db/fixture/check` (Regra 21).
- Todas as propriedades TypeScript em DTOs e View Models devem seguir estritamente `camelCase` (Regra 18).

**Never:**
- Nunca misturar dados entre municípios.
- Nunca executar queries contra bancos de dados de produção sem permissão explícita (Regra 15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alternância para São Fidélis | Usuário seleciona "Prefeitura de São Fidélis" na UI | Navega para `/sao_fidelis_prefeitura/...` mantendo ano e sub-rota | Redireciona para rota base se sub-rota inexistente |
| Acesso via slug amigável | `GET /sao-fidelis` | Redirecionamento permanente HTTP 308 para `/sao_fidelis_prefeitura` | Configurado em `next.config.js` |
| Carga de receitas históricas | Execução de `elt/load/fiorilli/sao_fidelis_prefeitura/load_receitas_csv.py` | Registros inseridos no schema `raw_sao_fidelis_prefeitura` | Logs em `failed_requests.csv` |

</intent-contract>

## Code Map

- `elt/extract/fiorilli/sao_fidelis_prefeitura/receitas_csv.py` -- Script de extração Playwright dedicado.
- `elt/load/fiorilli/sao_fidelis_prefeitura/load_receitas_csv.py` -- Loader SQL dedicado.
- `elt/portals/sao_fidelis_prefeitura.yml` -- Configuração do portal de São Fidélis.
- `apps/web/public/llms.txt` & `apps/web/public/llms-full.txt` -- Documentação de rotas e campos públicos para LLMs.

## Tasks & Acceptance

**Execution:**
- [ ] Executar e homologar extração de receitas históricas (2021–2025) via `elt/extract/fiorilli/sao_fidelis_prefeitura/receitas_csv.py`.
- [ ] Executar carga de dados brutos via `elt/load/fiorilli/sao_fidelis_prefeitura/load_receitas_csv.py`.
- [ ] Homologar páginas públicas de São Fidélis (Homepage, Despesas, Receitas, Licitações, Pessoal e Previdência - FASP).
- [ ] Validar documentação em `llms.txt` e `llms-full.txt`.
- [ ] Executar baterias completas de testes: `make check`, `make test`, `make db/fixture/check`, `pnpm test`, `pnpm build`.

**Acceptance Criteria:**
- Given os dados históricos e correntes de São Fidélis processados, when o usuário navega pelo portal, then todos os indicadores fiscais são renderizados com dados fidedignos e isolados por `portal_slug`.
- Given o seletor de portais, when São Fidélis é selecionado, then a navegação ocorre de forma transparente preservando os parâmetros de contexto.
- Given `make test`, `make check` e `pnpm build`, when executados, then passam com 100% de sucesso.
