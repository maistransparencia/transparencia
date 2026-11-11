---
title: 'Story 11.1: Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI'
type: 'feature'
created: '2026-09-12T19:35:27-03:00'
baseline_revision: 'c148bc85caf805a35c5cf77b47107c2721523e6a'
final_revision: 'c3b7608'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/11-1-spike-rd-viabilidade-dados-granulares-tce-rj-sigfis-e-siconfi.md'
  - 'docs/governanca-constantes-fiscais.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** A expansão da plataforma de transparência para múltiplos municípios no Estado do Rio de Janeiro atualmente exige o desenvolvimento e manutenção de scrapers customizados e frágeis para cada portal municipal, sendo desconhecido se as fontes centralizadas do TCE-RJ (SIGFIS / Dados Abertos) e SICONFI fornecem granularidade suficiente (despesas linha a linha, contratos, licitações, folha nominal) e frescor de dados tempestivo para substituir ou complementar a extração direta.

**Approach:** Desenvolver um script protótipo reproduzível de benchmarking e extração em Python (`elt/spikes/tce_rj_sigfis_spike.py`), auditar as rotas e contratos da OpenAPI do TCE-RJ e APIs do SICONFI com testes unitários mockados em `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py`, e consolidar um relatório canônico de viabilidade técnica (`docs/tce-rj-sigfis-viability-report.md`) estabelecendo uma matriz comparativa multidimensional e a diretriz arquitetural oficial do modelo híbrido ("Hub & Spoke").

## Boundaries & Constraints

**Always:**
- Todo código Python novo em `elt/spikes/` deve obedecer estritamente às tipagens (mypy), formatação (ruff format) e linters (ruff check) verificados por `make check` e suíte de testes com `make test`.
- O script de spike deve utilizar cabeçalho canônico e identificável `User-Agent: TransparenciaCivicaBot/1.0 (+https://transparencia.porciuncula.rj.gov.br)` e prever timeout explícito e tratamento gracioso para requisições lentas.
- O relatório canônico `docs/tce-rj-sigfis-viability-report.md` deve conter hyperlinks diretos e canônicos para todas as leis e deliberações citadas (Art. 37 da CF/88, Art. 48-A da LRF LC 101/2000, LAI Lei 12.527/2011, Lei 14.133/2021 e Deliberação TCE-RJ nº 200/96), conforme a Regra 20 de `AGENTS.md`.
- Incorporar a evidência empírica mandatória sobre Data Freshness: em Setembro/2026, a competência mais recente disponível no SICONFI para saldos bancários é Julho/2026 (~60 dias de defasagem permitida pela STN).

**Block If:**
- A execução do spike tentar alterar, gravar ou poluir esquemas ou tabelas de banco de dados locais de produção/testes sem isolamento.
- A API do TCE-RJ exigir chaves privadas pagas ou tokens proprietários restritivos incompatíveis com open-source cívico.

**Never:**
- Nunca propor a desativação da extração direta dos portais municipais se houver perda de granularidade de folha nominal de servidores ou quebra da exigência de atualização em tempo real (24h) da LRF.
- Nunca criar migrações DDL ou alterar models dbt nesta story de Spike/R&D.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Consulta de Licitações (TCE-RJ) | `--municipio PORCIUNCULA --ano 2024 --rota licitacoes` | Dicionário contendo lista normalizada de licitações com status 200 e contagem | Captura HTTPError ou ConnectionError retornando status de falha estruturado |
| Endpoint com Envelope Polimórfico | Resposta contendo chaves variantes (`Licitacoes`, `Compras`, `SituacoesFuncionais` ou lista bruta) | Extrator normaliza os itens em lista homogênea de registros | Fallback para extração de lista interna ou lista direta sem exceção |
| Timeout em Rota Pesada (ex: empenho/receita) | Consulta em `/api/v1/empenho_municipio` ou `/api/v1/receitas_municipio` excedendo timeout (ex: > 10s) | Retorna resultado com `timeout: true`, tempo de execução medido e mensagem amigável | Captura `requests.exceptions.Timeout` / `TimeoutError` sem abortar o script |
| Amostra de Exportação CLI | Execução com `--output-sample` | Salva arquivo JSON formatado na pasta de saída especificada | Garante criação do diretório e captura IOError |

</intent-contract>

## Code Map

- `elt/spikes/tce_rj_sigfis_spike.py` -- Script de auditoria, benchmarking e extração protótipo de endpoints do TCE-RJ e SICONFI.
- `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` -- Testes unitários do cliente HTTP do spike, normalização de respostas e tratamento de timeouts/erros.
- `docs/tce-rj-sigfis-viability-report.md` -- Relatório canônico e completo de viabilidade técnica, matriz comparativa e recomendação de arquitetura.
- `_bmad-output/implementation-artifacts/11-1-spike-rd-viabilidade-dados-granulares-tce-rj-sigfis-e-siconfi.md` -- Especificação da story de contexto refinada.

## Tasks & Acceptance

**Execution:**
- [x] `elt/spikes/tce_rj_sigfis_spike.py` -- Implementar cliente HTTP, métodos de consulta para TCE-RJ e SICONFI, normalizador de envelopes, medição de latência e CLI CLI args (`--municipio`, `--ano`, `--limite`, `--output-dir`).
- [x] `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` -- Implementar cobertura de testes automatizados com mocks para casos felizes, respostas polimórficas e tratamento de timeouts.
- [x] `docs/tce-rj-sigfis-viability-report.md` -- Redigir relatório canônico de viabilidade técnica, matriz multidimensional de comparação e recomendação do modelo híbrido ("Hub & Spoke").

**Acceptance Criteria:**
- Given as APIs do TCE-RJ e SICONFI e a ferramenta CLI de spike, when executada para Porciúncula e municípios de referência, then mede o tempo de resposta, cataloga as limitações de granularidade e exporta amostras normalizadas sem falhar por timeout.
- Given o relatório `docs/tce-rj-sigfis-viability-report.md`, when inspecionado, then apresenta uma matriz comparativa completa cobrindo Granularidade, Latência & Data Freshness (destacando a defasagem de até 60 dias no SICONFI vs. 24h na LRF), Confiabilidade, Cobertura Histórica, Esforço de Integração e Conformidade Jurídica com links oficiais.
- Given a suíte de validações de código, when executados `make check` e `make test`, then o novo módulo Python e seus testes passam com 100% de sucesso sem warnings de lint ou tipagem.

## Spec Change Log

*(Vazio inicialmente)*

## Review Triage Log

### 2026-09-12T19:47:00-03:00 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 3, low 5)
- defer: 0
- reject: 1 (high 0, medium 0, low 1)
- addressed_findings:
  - `[medium]` `[patch]` Unificação de códigos IBGE municipais para código oficial de 7 dígitos (ex: Porciúncula 3304102)
  - `[medium]` `[patch]` Aprimoramento de normalização de respostas para buscar primeira lista com dicionários válidos
  - `[medium]` `[patch]` Suporte a parâmetro temporal `--mes` no CLI e no método de consulta do SICONFI
  - `[low]` `[patch]` Adição de `total_records` no ProbeResult e captura de erros remotos no payload
  - `[low]` `[patch]` Deduplicação de código HTTP em método unificado `_execute_request`
  - `[low]` `[patch]` Adição de context manager (`__enter__`/`__exit__`) e método `close()` no cliente HTTP
  - `[low]` `[patch]` Correção do cabeçalho User-Agent para repositório do projeto cívico
  - `[low]` `[patch]` Atualização de link oficial canônico da Deliberação TCE-RJ 200/1996

## Design Notes

### Rationale da Normalização de Respostas do TCE-RJ
A API de dados abertos do TCE-RJ utiliza convenções divergentes dependendo do endpoint:
- `/licitacoes` encapsula dados em `{"Licitacoes": [...], "Count": int}`.
- `/compras_diretas_municipio` encapsula dados em `{"Compras": [...], "Count": int}`.
- `/situacao_funcional` encapsula dados em `{"SituacoesFuncionais": [...], "Count": int}`.
- `/prestacao_contas_municipio` retorna uma lista direta `[...]`.

O normalizador `normalize_tce_response(data)` inspeciona o payload: se for `list`, retorna diretamente; se for `dict`, busca a primeira chave cujo valor seja uma lista, garantindo interface consistente para qualquer rota consultada.

## Verification

**Commands:**
- `uv run --project elt pytest elt/spikes/__tests__/ -v` -- expected: Todos os testes unitários do spike passam com sucesso.
- `make check` -- expected: `ruff check`, `ruff format --check` e `mypy elt` passam sem erros de tipagem ou formatação.
- `make test` -- expected: Suíte geral de testes do projeto permanece íntegra e verde.

**Manual checks (if no CLI):**
- Inspecionar `docs/tce-rj-sigfis-viability-report.md` para assegurar presença da matriz comparativa completa, fundamentação em Data Freshness e todos os links da Presidência da República no formato markdown.

## Auto Run Result

**Status:** done

### Summary of Implemented Changes
- Desenvolvido cliente HTTP resiliente de spike para auditoria de APIs abertas do TCE-RJ e SICONFI (`elt/spikes/tce_rj_sigfis_spike.py`).
- Implementada suíte com 24 testes unitários automatizados com mocks cobrindo envelopes polimórficos, decodificação JSON, erros e timeouts (`elt/spikes/__tests__/test_tce_rj_sigfis_spike.py`).
- Produzido relatório canônico de viabilidade técnica com sumário executivo, mapeamento de contratos, matriz multidimensional de comparação sob 6 dimensões, análise crítica de Data Freshness e recomendação arquitetural oficial do modelo híbrido ("Hub & Spoke") (`docs/tce-rj-sigfis-viability-report.md`).
- Todas as legislações fundamentadas com links oficiais da Presidência da República e TCE-RJ (Regra 20 de AGENTS.md).

### Files Changed
- `elt/pyproject.toml` -- Inclusão de `spikes` nos testpaths do pytest.
- `elt/spikes/tce_rj_sigfis_spike.py` -- Script de auditoria, benchmarking e protótipo de extração para TCE-RJ e SICONFI.
- `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` -- Suíte de 24 testes unitários com mocks.
- `docs/tce-rj-sigfis-viability-report.md` -- Relatório canônico de viabilidade técnica e arquitetura híbrida.

### Review Findings Breakdown
- Patches applied: 8 (códigos IBGE unificados, normalização de respostas para buscar listas válidas, suporte a `--mes`, adição de `total_records`, deduplicação HTTP com `_execute_request`, context manager e `close()`, cabeçalho User-Agent canônico, link canônico de deliberação).
- Items deferred: 0.
- Items rejected: 1 (manutenção planejada de `spikes` no testpaths para CI).

### Follow-up Review Recommendation
`false` — Todos os patches de revisão foram pontuais, de baixa/média severidade e validados com 100% de cobertura nos testes e linters.

### Verification Performed
- `uv run --project elt pytest elt/spikes/__tests__/ -v`: 24 passed in 0.08s
- `make check`: ruff check, ruff format --check e mypy elt aprovados sem pendências.
- `make test`: 50 passed in 24.70s.

### Residual Risks
- Nocivo para a plataforma tentar desativar scrapers de portais locais em favor do TCE-RJ ou SICONFI, devido à perda de frescor (24h vs. 60 dias) e de folha nominal de servidores públicos. A recomendação do modelo híbrido mitiga integralmente esse risco.

### Strategic Project Decision (Post-Spike Formalization)
- **Decisão:** Manter o escopo e pipeline atual focado exclusivamente na MSC Patrimonial do SICONFI (Story 9.3) para conferência das disponibilidades bancárias e saldos de caixa de Porciúncula.
- **Congelamento:** Segurar e manter em espera (*on hold*) a ingestão de dados abertos do TCE-RJ (SIGFIS), dado que a substituição dos scrapers municipais é inviável no curto prazo.
- **Retomada Futura:** A arquitetura do spike, os scripts em `elt/spikes/` e o relatório em `docs/tce-rj-sigfis-viability-report.md` ficam salvos na branch `feature/epic11-story-11-1` e no repositório GitHub como base canônica pronta para ser reativada quando o projeto avançar para o onboarding de outros municípios fluminenses.


