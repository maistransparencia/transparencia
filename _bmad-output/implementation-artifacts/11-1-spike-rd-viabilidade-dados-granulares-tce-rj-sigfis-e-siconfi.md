---
baseline_commit: c148bc85caf805a35c5cf77b47107c2721523e6a
---

# Story 11.1: Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a data engineer and municipal civic researcher,
I want to audit, prototype, and benchmark data extractions from the TCE-RJ (SIGFIS / Dados Abertos) and SICONFI APIs for municipalities in the state of Rio de Janeiro (specifically Porciúncula, with sampling from neighbouring fluminense municipalities),
So that we determine whether granular expenditures (empenhos, liquidações, pagamentos), payroll, contracts, and tenders can be ingested from centralized state/federal sources instead of maintaining custom municipal portal scrapers, establishing a definitive architectural roadmap for multi-city expansion.

---

## Acceptance Criteria

1. **Auditoria de Endpoints e Contratos de Dados (TCE-RJ Dados Abertos & SICONFI):**
   - Mapear exaustivamente as rotas da API REST pública do TCE-RJ (`https://dados.tcerj.tc.br/api/v1/` documentada via OpenAPI/Swagger) e do SICONFI (`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/`):
     - TCE-RJ: `/api/v1/empenho_municipio`, `/api/v1/contratos_municipio`, `/api/v1/licitacoes`, `/api/v1/licitante_vencedor_municipio`, `/api/v1/licitante_perdedor_municipio`, `/api/v1/compras_diretas_municipio`, `/api/v1/dotacao_municipio`, `/api/v1/receitas_municipio`, `/api/v1/situacao_funcional`, `/api/v1/gastos_com_pessoal`, `/api/v1/obras_paralisadas`, `/api/v1/prestacao_contas_municipio`.
     - SICONFI: `/msc_patrimonial`, `/msc_orcamentaria`, `/rreo`, `/rgf`, `/dca`.
   - Testar e validar a viabilidade de consulta para Porciúncula (IBGE 3304106) e municípios de amostragem no Noroeste Fluminense (Varre-Sai 3306150, Natividade 3303207, Itaperuna 3302209).
   - Documentar variações nos envelopes de resposta (ex: `{"Licitacoes": [...], "Count": n}`, `{"Compras": [...], "Count": n}`, versus arrays brutos `[...]`).

2. **Desenvolvimento de Script Protótipo / Spike de Extração (`elt/spikes/tce_rj_sigfis_spike.py`):**
   - Criar script reproduzível em Python (`elt/spikes/tce_rj_sigfis_spike.py`) para testar automação, paginação (`inicio`, `limite`), tempos de resposta e resiliência:
     - Implementar cabeçalho canônico `User-Agent: TransparenciaCivicaBot/1.0 (+https://transparencia.porciuncula.rj.gov.br)`.
     - Implementar tolerância a falhas com retries e tratamento de timeouts HTTP (identificando rotas com lentidão excessiva de resposta > 10s ou indisponibilidade).
     - Implementar suíte de testes unitários automatizados em `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` mockando respostas e garantindo cobertura das funções de consulta e normalização do spike.
     - Executar via CLI com argumentos parametrizáveis (ex: `--municipio PORCIUNCULA --ano 2024 --sample-output`).

3. **Matriz Comparativa Multidimensional:**
   - Construir uma matriz analítica rigorosa comparando as 3 fontes potenciais:
     1. **Extração Direta do Portal Municipal (atual / scrapers locais)**
     2. **TCE-RJ Dados Abertos / SIGFIS (esfera estadual)**
     3. **SICONFI / STN (esfera federal)**
   - Comparar sob 6 dimensões essenciais:
     - **Granularidade:** Detalhamento por item, favorecido (CPF/CNPJ anonimizado/aberto), empenho, liquidação, pagamento, histórico contratual e folha nominal de servidores com cargos.
     - **Defasagem Temporal e Data Freshness:** Frequência de atualização e frescor dos dados. Contrastar a exigência de tempo real (até 24h) da LRF (Art. 48-A da LC 101/2000) nos portais municipais com os prazos regulamentares do SICONFI (Portarias STN) e TCE-RJ (Deliberação nº 200/96), que permitem até 60 dias de defasagem (evidência empírica: em Setembro/2026, a competência mais recente disponível no SICONFI para saldos bancários é Julho/2026).
     - **Estabilidade & Confiabilidade da API:** Taxa de erro, timeouts, paginação, suporte a SLA e limites de requisição.
     - **Cobertura Histórica:** Profundidade de exercícios fiscais disponíveis (ex: 2018–2026).
     - **Esforço de Integração & Manutenção:** Custo de engenharia de novos adaptadores versus quebras de layout/API.
     - **Adesão às Normas e Leis:** Fundamentação legal (Art. 37 CF/88, Lei 12.527/2011 - LAI, Art. 48-A da Lei Complementar 101/2000 - LRF, Lei 14.133/2021).

4. **Relatório Técnico Canônico (`docs/tce-rj-sigfis-viability-report.md`):**
   - Consolidar todas as descobertas em `docs/tce-rj-sigfis-viability-report.md` contendo:
     - Sumário executivo com veredito claro sobre viabilidade de substituição total versus modelo híbrido.
     - Dicionário de endpoints auditados com exemplos de payloads e esquemas JSON reais extraídos do TCE-RJ e SICONFI.
     - Tabela comparativa visual e detalhada de granularidade por domínio (Despesas, Receitas, Contratos, Licitações, Pessoal).
     - Análise de riscos técnicos (gargalos de performance em queries sem índices no TCE-RJ, ausência de dados de pessoal nominal, defasagem temporal de até 60 dias).
     - Recomendação arquitetural oficial ("Hub & Spoke Híbrido") com plano de ação para suportar múltiplos municípios no pipeline ELT.

---

## Tasks / Subtasks

- [x] Task 1: Auditoria Técnica de Endpoints e Schemas (AC: 1)
  - [x] Analisar a especificação OpenAPI do TCE-RJ (`https://dados.tcerj.tc.br/api/v1/openapi.json`) e catalogar parâmetros suportados por rota municipal.
  - [x] Executar chamadas exploratórias em rotas prioritárias (`/licitacoes`, `/contratos_municipio`, `/compras_diretas_municipio`, `/empenho_municipio`, `/receitas_municipio`, `/situacao_funcional`, `/gastos_com_pessoal`).
  - [x] Verificar granularidade e microdados em Porciúncula e municípios de referência (Varre-Sai, Natividade, Itaperuna).
  - [x] Mapear o escopo do SICONFI (`apidatalake.tesouro.gov.br`), confirmando que MSC e demonstrativos contêm apenas saldos contábeis agregados PCASP e não dados transacionais de favorecido/item.

- [x] Task 2: Implementação do Script Protótipo / Spike de Extração (AC: 2)
  - [x] Criar o diretório `elt/spikes/` e o script `elt/spikes/tce_rj_sigfis_spike.py`.
  - [x] Implementar cliente HTTP robusto com headers customizados, tratamento de timeouts (backoff/retry), e normalização dos formatos polimórficos do TCE-RJ.
  - [x] Implementar opções de CLI (`--municipio`, `--ano`, `--limite`, `--output-dir`).
  - [x] Criar testes unitários em `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` validando tratamento de erros, paginação e parsing de respostas.
  - [x] Executar `make check` e `make test` para garantir integridade e padrões de código (PEP8, ruff, mypy/pytest).

- [x] Task 3: Análise de Desempenho, Estabilidade, Defasagem Temporal e Data Freshness (AC: 3)
  - [x] Medir tempo de resposta (RTT) para consultas com diferentes volumes de registros.
  - [x] Documentar comportamento sob sobrecarga e parâmetros não indexados no backend do TCE-RJ.
  - [x] Analisar a defasagem temporal empírica e regulamentar:
    - SICONFI: Registrar a defasagem observada na prática (ex: em Setembro/2026, a competência mais recente disponível para saldos bancários na MSC é Julho/2026, representando ~60 dias de defasagem permitida pelos calendários da STN).
    - Portais Municipais: Fundamentar a obrigatoriedade legal de liberação em tempo real (até 24 horas) para a execução orçamentária e financeira conforme o [Art. 48-A, I da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a).
    - TCE-RJ (SIGFIS): Analisar os prazos da [Deliberação TCE-RJ nº 200/96](https://www.tcerj.tc.br) (art. 7º - remessa da PCM até o último dia útil do mês subsequente) e o histórico de atrasos de homologação municipal.

- [x] Task 4: Redação do Relatório Canônico de Viabilidade (AC: 3, 4)
  - [x] Criar o arquivo de documentação canônica `docs/tce-rj-sigfis-viability-report.md`.
  - [x] Preencher a matriz comparativa completa (Portal Municipal vs. TCE-RJ vs. SICONFI) com seção dedicada a Data Freshness.
  - [x] Incluir schemas reais extraídos do spike para licitações, compras diretas e contratos.
  - [x] Formular a recomendação arquitetural oficial (Modelo Híbrido: Portal Municipal para tempo real/granularidade + SICONFI para conciliação contábil + TCE-RJ para auditoria, histórico e compras).
  - [x] Adicionar links oficiais para todas as legislações mencionadas (LAI, LRF, Lei 4.320/64, Lei 14.133/2021, Deliberação TCE-RJ 200/96).

---

## Dev Notes

### 1. Contexto e Descobertas Técnicas Preliminares

Durante a análise exploratória deste spike, foram realizadas sondagens ativas na infraestrutura de dados abertos do TCE-RJ e na API do SICONFI:

1. **API de Dados Abertos do TCE-RJ (`https://dados.tcerj.tc.br/api/v1/`):**
   - A API é implementada em FastAPI / OpenAPI 1.0 e disponibiliza 41 endpoints públicos.
   - **Formato das Respostas:** Os endpoints municipais possuem estruturas polimórficas. Ex:
     - `/api/v1/licitacoes` retorna `{"Licitacoes": [...], "Count": int}`.
     - `/api/v1/compras_diretas_municipio` retorna `{"Compras": [...], "Count": int}`.
     - `/api/v1/prestacao_contas_municipio` retorna diretamente uma lista `[...]`.
     - `/api/v1/situacao_funcional` retorna `{"SituacoesFuncionais": [...], "Count": int}`.
   - **Casos de Timeout e Performance:**
     - Algumas tabelas volumosas e sem índices compostos adequados no backend do TCE-RJ (como `/api/v1/empenho_municipio` e `/api/v1/receitas_municipio`) sofrem **timeouts frequentes (> 15 segundos)** quando consultadas apenas por município e ano.
     - Rotas de licitações (`/api/v1/licitacoes`) e compras diretas (`/api/v1/compras_diretas_municipio`) respondem com alta confiabilidade (1s a 11s).
   - **Granularidade de Pessoal:**
     - A rota `/api/v1/situacao_funcional` e `/api/v1/gastos_com_pessoal` trazem contagens ou agregados de vínculos funcionais, mas **não fornecem a folha de pagamento nominal individualizada** (nome completo, matrícula, proventos e descontos detalhados por servidor). A folha nominal continua sendo prerrogativa da LAI disponibilizada diretamente nos portais municipais.

2. **API do SICONFI / STN (`https://apidatalake.tesouro.gov.br/`):**
   - O SICONFI consolida as informações fiscais e contábeis padronizadas para todo o Brasil (MSC, RREO, RGF, DCA).
   - **Limitação de Granularidade:** O SICONFI opera no nível contábil PCASP (Classes 1 a 8, códigos de conta, fontes de recursos e poderes/órgãos). Não possui detalhamento no nível de empenho individual, nota de empenho, favorecido (credor), contrato ou licitação.
   - **Papel Ideal:** O SICONFI já foi integrado com êxito na Story 9.3 (`elt/extract/siconfi_msc.py`) e atua com excelência como **Autoridade Contábil Canônica** para validação de disponibilidades financeiras e saldos de caixa.

3. **Prazos Legais, Defasagem Temporal e Data Freshness:**
   - **Portais Municipais (ex: Fiorilli, Betha, sistemas de gestão locais):** Atualização diária ou em tempo real (até 24h após a emissão do ato orçamentário), conforme mandamento explícito do [Art. 48-A, I da LC 101/2000 (LRF)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a). É a única fonte que permite ao cidadão auditar empenhos emitidos ontem ou pagamentos de hoje.
   - **SICONFI (STN):** O envio da MSC pelos municípios obedece ao calendário da Portaria STN, permitindo remessa mensal com tolerância regulamentar de até 60 dias. Na prática do projeto (constatada em Setembro/2026), o dado contábil mais recente para saldos em contas bancárias é de **Julho/2026**.
   - **TCE-RJ (SIGFIS):** A remessa da Prestação de Contas Mensal (PCM) pelas prefeituras e câmaras fluminenses é regida pela [Deliberação TCE-RJ nº 200/96](https://www.tcerj.tc.br) (art. 7º), com envio até o último dia útil do mês seguinte (defasagem regulamentar de 30 a 60 dias). Além disso, há rotineiros atrasos de homologação ou prorrogações concedidas pelo tribunal a municípios de menor porte.

---

### 2. Matriz Comparativa Resumida

| Dimensão | Portal Municipal Direto | TCE-RJ (SIGFIS / Dados Abertos) | SICONFI (STN) |
| :--- | :--- | :--- | :--- |
| **Granularidade de Despesas** | Linha a linha (empenho, liquidação, pagamento, itens, credor) | Por empenho (quando endpoint responde sem timeout) | Agregado por conta PCASP e fonte |
| **Folha de Pagamento** | Nominal detalhada (servidor, cargo, proventos, descontos) | Agregada/Vínculos (não nominal) | Agregada (RGF Despesa de Pessoal) |
| **Licitações e Contratos** | Editais, aditivos, atas e contratos locais | Estruturado por processo, licitantes e contratos | Inexistente no SICONFI |
| **Data Freshness / Latência** | **Tempo Real / Diário (até 24h)** por força do Art. 48-A da LRF | **Mensal com defasagem de 30 a 60 dias** (Deliberação 200/96) | **60 dias de defasagem típica** (em Set/2026 o dado mais recente é Jul/2026) |
| **Estabilidade Técnica** | Sujeito a instabilidade/captcha do portal municipal | API REST aberta, porém com timeouts em queries pesadas | API pública estável com rate limiting (1 req/s) |
| **Escalabilidade Multi-Cidade** | Baixa (requer adaptadores por fornecedor de software) | Alta para o Estado do RJ (padrão unificado estadual) | Alta para todo o Brasil (padrão nacional STN) |

---

### 3. Recomendação Arquitetural: Modelo Híbrido "Hub & Spoke"

A constatação sobre **Data Freshness** é o principal argumento técnico contra qualquer tentativa de substituir a extração direta dos portais municipais:
1. **Comprometimento da Missão Cívica por Perda de Freshness:** Se a plataforma dependesse unicamente de fontes centralizadas (SICONFI ou TCE-RJ), o cidadão consultaria um portal com dados de até 2 meses atrás. Denúncias de desvios recentes, pagamentos suspeitos em andamento e empenhos de calamidades ficariam invisíveis.
2. **Perda de Granularidade Cívica:** Impossibilidade de exibir a folha nominal dos servidores municipais e detalhes operacionais de notas fiscais/favorecidos.

**Solução Arquitetural Recomendada:**
- **Tier 1 (Operacional / Fresco — Portais Municipais):** Ingestão contínua direta dos portais municipais para despesas diárias (frescor de 24h), restos a pagar, folha nominal e contratos em vigor.
- **Tier 2 (Auditoria Contábil Consolidada — SICONFI):** Ingestão do SICONFI para consolidação patrimonial (MSC), saldo de caixa real e demonstrativos fiscais oficiais (RREO/RGF), atuando como âncora de verdade contábil mesmo com defasagem bimestral.
- **Tier 3 (Enriquecimento & Cross-Auditoria — TCE-RJ):** Ingestão do TCE-RJ para processos licitatórios padronizados, histórico consolidado de contratos estaduais/municipais, compras diretas, obras paralisadas e auditoria cruzada (auditar se o município declarou ao Tribunal de Contas exatamente o mesmo valor empenhado no portal da transparência).

---

### 4. Requisitos de Código e Guardrails do Projeto (`AGENTS.md`)

- **Regra 1 (Economia Extrema de Contexto):** Focar os testes e a documentação estritamente nos dados necessários, sem gerar scripts de scrape gigantescos desnecessários.
- **Regra 4 (Baseline de Qualidade):** Todo código Python novo em `elt/` deve ser testado via `make test` e validado via linters com `make check`.
- **Regra 15 (Segurança de Produção):** Execuções e testes de protótipos devem rodar localmente sem alterar dados de produção.
- **Regra 20 (Fundamentação Legal e Links Oficiais):** Todos os textos legais citados nos relatórios devem conter links diretos oficiais da Presidência da República (ex: [Art. 37 da Constituição Federal](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37), [Lei de Acesso à Informação nº 12.527/2011](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm), [Lei de Responsabilidade Fiscal LC 101/2000](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm), [Lei 14.133/2021 de Licitações](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)).

---

### Project Structure Notes

- Novo diretório para spikes técnicos: `elt/spikes/`
- Script de spike de extração: `elt/spikes/tce_rj_sigfis_spike.py`
- Testes automatizados do spike: `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py`
- Relatório técnico de entrega: `docs/tce-rj-sigfis-viability-report.md`
- Não há necessidade de alterações nas tabelas de staging dbt ou fixtures Kysely para esta história, uma vez que se trata de um Spike de Pesquisa e Desenvolvimento (R&D) cujos artefatos são protótipos de extração e documentação estratégica.

---

### References

- [TCE-RJ Portal de Dados Abertos](https://dados.tcerj.tc.br)
- [TCE-RJ Especificação OpenAPI v1](https://dados.tcerj.tc.br/api/v1/openapi.json)
- [SICONFI - API Dados Abertos STN](https://apidatalake.tesouro.gov.br/docs/siconfi/)
- [Constituição Federal de 1988, Art. 37](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art37)
- [Lei Complementar nº 101/2000 (Lei de Responsabilidade Fiscal)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm)
- [Lei nº 12.527/2011 (Lei de Acesso à Informação - LAI)](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm)
- [Lei nº 14.133/2021 (Lei de Licitações e Contratos Administrativos)](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.8 Flash (Medium)

### Debug Log References

- Probagem HTTP de endpoints do TCE-RJ em `dados.tcerj.tc.br` com sucesso HTTP 200 na OpenAPI v1.0.
- Identificação de endpoints operacionais (`/licitacoes`, `/compras_diretas_municipio`, `/prestacao_contas_municipio`) e diagnóstico de latência elevada (> 15s) em `/empenho_municipio` e `/receitas_municipio`.
- Confirmação de suporte a case-insensitive para o parâmetro `municipio` (ex: `PORCIUNCULA` e `Porciuncula`).

### Completion Notes List

- Spike de R&D concluído com sucesso e 100% dos critérios de aceitação cumpridos.
- Cliente de probe e benchmark implementado com tipagem estrita e testes mockados cobrindo 24 cenários (`elt/spikes/tce_rj_sigfis_spike.py` e `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py`).
- Relatório técnico canônico consolidado em `docs/tce-rj-sigfis-viability-report.md`.
- **Decisão Estratégica e Arquitetural Formal:**
  - O projeto manterá no momento a integração consolidada do **SICONFI MSC** (implementada na Story 9.3) estritamente para a conferência oficial dos saldos bancários e disponibilidades de caixa da administração municipal de Porciúncula.
  - A ingestão contínua de dados do TCE-RJ (SIGFIS) fica **congelada / em espera (on hold)**, dado que a substituição de scrapers municipais é inviável no curto prazo pela perda de *data freshness* (defasagem regulamentar de até 60 dias vs. 24h na LRF) e ausência de folha nominal de servidores.
  - A arquitetura híbrida recomendada ("Hub & Spoke") e os protótipos em `elt/spikes/` e `docs/tce-rj-sigfis-viability-report.md` ficam preservados na branch `feature/epic11-story-11-1` e no repositório GitHub como **referência canônica congelada** para guiar o onboarding quando novos municípios fluminenses forem integrados à plataforma.

### File List

- `elt/spikes/tce_rj_sigfis_spike.py` (Criado e verificado)
- `elt/spikes/__tests__/test_tce_rj_sigfis_spike.py` (Criado e verificado)
- `docs/tce-rj-sigfis-viability-report.md` (Criado e canônico)
