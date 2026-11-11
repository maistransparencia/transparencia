---
title: 'Story 15.4: Generalização do Extrator Sigcorp e Pipelines de Ingestão para Natividade e Bom Jesus do Itabapoana'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_revision: '79f75b251a280bc44b56b0031bfd299da61f27f5'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O módulo extrator da API REST Sigcorp está acoplado ao diretório municipal de Porciúncula (`elt/extract/porciuncula_prefeitura/`), impedindo a ingestão automatizada de dados fiscais brutos de municípios vizinhos que utilizam o mesmo provedor tecnológico (Natividade e Bom Jesus do Itabapoana) e forçando duplicação desnecessária de código.

**Approach:** Generalizar o extrator REST Sigcorp para o módulo reutilizável `elt/extract/sigcorp/` parametrizado dinamicamente (`base_url`, `cod_ibge`, `portal_slug`, `ano_inicial`), criar os manifestos declarativos para Natividade (`3303401`, IPAMN) e Bom Jesus do Itabapoana (`3300605`, FUNPREV), mapear seus metadados nos arquivos de fonte `_sources.yml` (Regra 5), atualizar o setup de testes em `elt/conftest.py` com fixtures sintéticas locais (Regra 15) e validar 100% de cobertura com zero requisições externas à rede pública.

## Boundaries & Constraints

**Always:**
- Manter compatibilidade reversa total com o código de Porciúncula (`elt/extract/porciuncula_prefeitura/`), que deve reutilizar/subclassear as classes genéricas de `elt/extract/sigcorp/`.
- Garantir isolamento estrito nos testes automatizados: os testes unitários e de integração de extração devem utilizar fixtures sintéticas locais em `elt/conftest.py` ou mocks, proibindo estritamente qualquer requisição à internet pública ou banco de dados de produção (Regras 5 e 15).
- Mapear todas as tabelas raw necessárias nos arquivos `_sources.yml` para os novos municípios (`raw_natividade_prefeitura` e `raw_bom_jesus_itabapoana_prefeitura`) em estrita conformidade com a Regra 5.
- Atualizar a função `_create_raw_schema` em `elt/conftest.py` para descobrir e provisionar dinamicamente todos os esquemas e tabelas de fontes declarados em `models/staging/**/_sources.yml`.
- Se novas tabelas de seed forem criadas em `elt/transform/seeds/`, regerar o fixture compactado de teste `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e verificar com `make db/fixture/check` (Regra 21).

**Never:**
- Nunca executar requisições HTTP reais contra endpoints externos de prefeituras durante a execução dos testes automatizados.
- Nunca criar colunas ou variáveis com nomes de métricas abreviados (Regra 9).
- Nunca quebrar a interface pública de `elt.extract.porciuncula_prefeitura` ou de `elt/extract/run.py`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Parametrização dinâmica de portal | `SigcorpExtractor` instanciado com `base_url="https://transparencia.natividade.rj.gov.br"`, `portal_slug="natividade_prefeitura"` | URL construída utiliza o host de Natividade e inclui parâmetros corretos de exercício, empresa e paginação | Lança `ValueError` ou falha precoce se parâmetros obrigatórios forem vazios |
| Carga declarativa de portal | `PortalConfig.load("natividade_prefeitura")` e `PortalConfig.load("bom_jesus_itabapoana_prefeitura")` | Retorna instância tipada com IBGE, URLs, órgão padrão e metadados de RPPS corretos | Lança `FileNotFoundError` se arquivo de configuração não existir |
| Extração de folha com paginação mensal | `PessoalExtractor.extract(empresa_id="1", year=2024)` com mock de 12 meses | Executa iteração pelos meses 01 a 12, consolidando registros de todos os meses | Em caso de mês 1 vazio, interrompe extração para entidade sem folha |
| Execução de teste sem rede | `pytest elt/extract/__tests__/test_sigcorp.py` | Suíte executa 100% offline contra mocks e fixtures locais | Se houver tentativa de rede externa, interceptador falha o teste |
| Criação dinâmica de schemas no conftest | Chamada a `_create_raw_schema(eng)` durante setup do pytest | Cria schemas `raw_porciuncula_prefeitura`, `raw_natividade_prefeitura` e `raw_bom_jesus_itabapoana_prefeitura` com DDLs derivadas de `_sources.yml` | Lança exceção SQL legível se arquivo YAML for inválido |

</intent-contract>

## Code Map

- `elt/extract/base.py` -- Interface base `BaseExtractor` e dataclass `EndpointConfig`.
- `elt/extract/sigcorp/extractor.py` -- Nova classe `SigcorpExtractor` e extratores especializados (`DespesasExtractor`, `ReceitasExtractor`, `LicitacoesExtractor`, `EmendasExtractor`, `TransferenciasExtractor`, `PessoalExtractor`).
- `elt/extract/sigcorp/api_endpoints.py` -- Definição genérica dos endpoints Sigcorp e gerador parametrizado `get_endpoint_configs(base_url, portal_slug, ...)`.
- `elt/extract/sigcorp/__init__.py` -- Exportações canônicas do módulo Sigcorp.
- `elt/extract/porciuncula_prefeitura/extractor.py` -- Refatoração para herdar de `elt.extract.sigcorp.extractor.SigcorpExtractor`.
- `elt/extract/porciuncula_prefeitura/api_endpoints.py` -- Reutilização dos endpoints genéricos parametrizados com a URL de Porciúncula.
- `elt/core/config.py` -- Classe `PortalConfig` enriquecida com campos opcionais `provider` e `rpps`.
- `elt/portals/natividade_prefeitura.yml` -- Configuração declarativa de Natividade (IBGE 3303401, Sigcorp, RPPS IPAMN).
- `elt/portals/bom_jesus_itabapoana_prefeitura.yml` -- Configuração declarativa de Bom Jesus do Itabapoana (IBGE 3300605, Sigcorp, RPPS FUNPREV).
- `elt/transform/seeds/seed_natividade_prefeitura_orgaos.csv` -- Órgão municipal padrão de Natividade.
- `elt/transform/seeds/seed_bom_jesus_itabapoana_prefeitura_orgaos.csv` -- Órgão municipal padrão de Bom Jesus do Itabapoana.
- `elt/transform/seeds/seeds.yml` -- Registro dos novos seeds de órgãos para compilação dbt.
- `elt/transform/models/staging/natividade_prefeitura/_sources.yml` -- Declaração de fontes raw para o schema `raw_natividade_prefeitura` (Regra 5).
- `elt/transform/models/staging/bom_jesus_itabapoana_prefeitura/_sources.yml` -- Declaração de fontes raw para o schema `raw_bom_jesus_itabapoana_prefeitura` (Regra 5).
- `elt/extract/run.py` -- Suporte a resolução dinâmica de endpoints Sigcorp por portal.
- `elt/conftest.py` -- Atualização de `_create_raw_schema` para varrer todos os `_sources.yml` de staging e adicionar fixtures sintéticas locais de Sigcorp.
- `elt/extract/__tests__/test_sigcorp.py` -- Testes unitários do extrator genérico Sigcorp e configurações de portais.

## Tasks & Acceptance

**Execution:**
- `elt/core/config.py` -- Adicionar campos opcionais `provider: str = "sigcorp"` e `rpps: dict[str, Any] | None = None` em `PortalConfig`.
- `elt/portals/natividade_prefeitura.yml` -- Criar configuração declarativa de Natividade (IBGE `3303401`, Sigcorp, RPPS `IPAMN`).
- `elt/portals/bom_jesus_itabapoana_prefeitura.yml` -- Criar configuração declarativa de Bom Jesus do Itabapoana (IBGE `3300605`, Sigcorp, RPPS `FUNPREV`).
- `elt/transform/seeds/seed_natividade_prefeitura_orgaos.csv` -- Criar semente de entidades de Natividade (`empresa_id: "1"`).
- `elt/transform/seeds/seed_bom_jesus_itabapoana_prefeitura_orgaos.csv` -- Criar semente de entidades de Bom Jesus (`empresa_id: "1"`).
- `elt/transform/seeds/seeds.yml` -- Declarar os novos seeds de órgãos municipais para compilação dbt.
- `elt/extract/sigcorp/extractor.py` -- Implementar `SigcorpExtractor` e subclasses especializadas parametrizáveis (`base_url`, `portal_slug`, `cod_ibge`, `ano_inicial`).
- `elt/extract/sigcorp/api_endpoints.py` -- Implementar funções post-process e fábrica `get_endpoint_configs(base_url, portal_slug, ...)`.
- `elt/extract/sigcorp/__init__.py` -- Exportar símbolos principais do módulo genérico Sigcorp.
- `elt/extract/porciuncula_prefeitura/extractor.py` -- Refatorar para estender `SigcorpExtractor`, mantendo alias `PorciunculaExtractor`.
- `elt/extract/porciuncula_prefeitura/api_endpoints.py` -- Refatorar para importar classes e endpoints de `elt.extract.sigcorp`.
- `elt/extract/natividade_prefeitura/__init__.py` & `api_endpoints.py` -- Criar módulo de endpoints de Natividade consumindo o extrator Sigcorp.
- `elt/extract/bom_jesus_itabapoana_prefeitura/__init__.py` & `api_endpoints.py` -- Criar módulo de endpoints de Bom Jesus consumindo o extrator Sigcorp.
- `elt/extract/run.py` -- Atualizar importação dinâmica de endpoints com fallback gracioso para Sigcorp caso módulo específico não exista.
- `elt/transform/models/staging/natividade_prefeitura/_sources.yml` -- Declarar catálogo raw para Natividade em conformidade com a Regra 5.
- `elt/transform/models/staging/bom_jesus_itabapoana_prefeitura/_sources.yml` -- Declarar catálogo raw para Bom Jesus em conformidade com a Regra 5.
- `elt/conftest.py` -- Atualizar `_create_raw_schema` para ler todos os `_sources.yml` em `staging/` e criar fixtures sintéticas para Sigcorp (Regra 15).
- `elt/extract/__tests__/test_sigcorp.py` -- Criar suíte completa de testes unitários offline para `SigcorpExtractor`, parâmetros e portais.
- `packages/db/tests/fixtures/schema.sql.gz` -- Regerar fixture compactado via `make db/fixture/dump` e verificar com `make db/fixture/check`.

**Acceptance Criteria:**
- Given os extratores em `elt/extract/sigcorp/`, when instanciados com URLs e slugs distintos de portais, then constroem as queries HTTP com parâmetros corretos para cada prefeitura.
- Given os arquivos de configuração declarativos em `elt/portals/natividade_prefeitura.yml` e `elt/portals/bom_jesus_itabapoana_prefeitura.yml`, when carregados via `PortalConfig.load()`, then retornam os dados cadastrais (IBGE 3303401 e 3300605) e metadados de RPPS (`IPAMN` e `FUNPREV`).
- Given as fontes mapeadas em `_sources.yml` para os novos municípios, when o teste inicializar em `elt/conftest.py`, then os schemas `raw_natividade_prefeitura` e `raw_bom_jesus_itabapoana_prefeitura` são criados no banco efêmero sem erros DDL.
- Given a suíte de testes de extração e staging, when executada via `make test`, then todos os testes passam com 100% de sucesso sem efetuar chamadas a servidores externos (Regra 15).
- Given a governança de fixtures de banco de dados, when executado `make db/fixture/check`, then a paridade entre dbt e a camada Kysely permanece íntegra (Regra 21).

## Spec Change Log

## Review Triage Log

| Verdict | Layer | Location | Route | Evidence / Action |
|---|---|---|---|---|
| high | blind-hunter | `elt/extract/base.py:7` | patch | `from elt.core.scraper import fetch` no nível de módulo causava ImportError circular ao importar `elt.extract.base`. Corrigido definindo função `fetch` com import sob demanda. |
| medium | blind-hunter | `elt/core/config.py:31` | patch | `orgaos_csv_path` utilizava caminho relativo ao CWD em vez de absoluto à raiz do projeto. Corrigido com `Path(__file__).resolve().parent.parent.parent`. |
| medium | edge-case-hunter | `elt/extract/__tests__/test_sigcorp.py:41` | patch | `address[0]` falhava em conexões via socket Unix (AF_UNIX) por ser string. Corrigido para verificar `isinstance(address, tuple)`. |
| medium | verification-gap | `elt/extract/run.py:71-92` | patch | Runner CLI de extração não era exercitado com endpoints municipais. Adicionado teste `test_extract_run_cli_with_sigcorp_endpoint` em `test_sigcorp.py`. |
| medium | verification-gap | `elt/tests/test_db.py:4-14` | patch | `test_create_tables_creates_expected_tables` só verificava Porciúncula. Atualizado para verificar `raw_natividade_prefeitura` e `raw_bom_jesus_itabapoana_prefeitura`. |
| medium | verification-gap | `elt/extract/__tests__/test_sigcorp.py` | patch | `mock_sigcorp_fetch` não era utilizado na suíte de testes. Adicionado teste `test_extractors_with_mock_sigcorp_fetch` exercitando Despesas, Licitações, Emendas e Transferências. |
| medium | blind-hunter | `elt/extract/run.py:137` | patch | PNCP utilizava CNPJ fixo de Porciúncula. Atualizado para consultar e injetar o CNPJ específico do município configurado em `seed_{slug}_orgaos.csv`. |
| low | edge-case-hunter | `elt/conftest.py:49` | patch | `yaml.safe_load` pode retornar None em arquivo vazio. Corrigido com `(sources or {}).get("sources", [])`. |
| low | edge-case-hunter | `elt/conftest.py:155` | patch | Possibilidade de mutação in-place em rows sintéticas. Corrigido com cópia defensiva `[dict(r) for r in rows]`. |
| low | edge-case-hunter | `elt/extract/sigcorp/extractor.py:24` | patch | Trailing slash em `base_url` gerava URLs com barra dupla. Corrigido com `.strip().rstrip("/")`. |
| low | edge-case-hunter | `elt/extract/sigcorp/api_endpoints.py:17` | patch | `proclic` não-string poderia quebrar `.split("/")`. Corrigido com `str(proclic).split("/")`. |
| low | edge-case-hunter | `elt/extract/sigcorp/api_endpoints.py:86` | patch | Atribuição tautológica `row.get("empenho")`. Corrigido com fallback `numemp` e `numero`. |
| low | edge-case-hunter | `elt/core/config.py:50` | patch | YAML de portal vazio causaria TypeError ao desempacotar. Adicionada validação explícita lançando `ValueError`. |
| low | verification-gap | `elt/extract/sigcorp/extractor.py:115` | patch | `PessoalExtractor.build_url` ignorava o mês em iteração. Atualizado para aceitar parâmetro `mes` e ser chamado em `extract()`. |
| false | blind-hunter | `elt/extract/sigcorp/extractor.py:80` | reject | Rejeição de anos históricos em `ReceitasExtractor` é comportamento intencional e legado devido a bug conhecido da API Sigcorp. |
| false | blind-hunter | `elt/extract/sigcorp/api_endpoints.py:17` | reject | Truncamento do ano em proclic preserva o comportamento exato em produção do portal de Porciúncula. |
| false | blind-hunter | `elt/extract/sigcorp/extractor.py:148` | reject | `break` no mês 1 de servidores preserva a regra de negócio para órgãos sem folha de pagamento. |
| false | blind-hunter | `elt/transform/seeds/` | reject | Mapeamento de SICONFI MSC para novos portais é escopo de rollout multi-portal (Story 15.5), não do extrator Sigcorp (Story 15.4). |
| false | blind-hunter | `elt/transform/seeds/seed_portais.csv` | reject | Habilitação dos novos portais na dimensão canônica pertence ao rollout da Story 15.5. |

## Auto Run Result

### Summary of Implemented Change
- Generalização completa do extrator REST Sigcorp no módulo reutilizável `elt/extract/sigcorp/` (`SigcorpExtractor`, `DespesasExtractor`, `ReceitasExtractor`, `LicitacoesExtractor`, `EmendasExtractor`, `TransferenciasExtractor`, `PessoalExtractor`).
- Implementação de `get_endpoint_configs(base_url, portal_slug, ...)` em `elt/extract/sigcorp/api_endpoints.py` gerando os 20 endpoints padronizados Sigcorp com parâmetros dinâmicos.
- Preservação de 100% de compatibilidade retroativa para Porciúncula através de re-exports e subclasses em `elt/extract/porciuncula_prefeitura/`.
- Criação dos módulos e manifestos declarativos para Natividade (`elt/portals/natividade_prefeitura.yml`, IBGE `3303401`, Sigcorp, RPPS: `IPAMN`) e Bom Jesus do Itabapoana (`elt/portals/bom_jesus_itabapoana_prefeitura.yml`, IBGE `3300605`, Sigcorp, RPPS: `FUNPREV`).
- Mapeamento das fontes de dados raw dos novos municípios em `elt/transform/models/staging/natividade_prefeitura/_sources.yml` e `elt/transform/models/staging/bom_jesus_itabapoana_prefeitura/_sources.yml` (Regra 5 do AGENTS.md).
- Atualização dinâmica da função `_create_raw_schema` em `elt/conftest.py` para descobrir automaticamente todos os arquivos `_sources.yml` em `staging/` e criar os schemas e tabelas correspondentes no PostgreSQL de teste.
- Adição de fixtures sintéticas locais `sigcorp_synthetic_payload` e `mock_sigcorp_fetch` em `conftest.py` com isolamento estrito de rede (Regra 15).
- Sincronização do fixture compactado `packages/db/tests/fixtures/schema.sql.gz` via `make db/fixture/dump` e validação com `make db/fixture/check` (Regra 21).

### Files Changed
- `elt/extract/base.py` -- Interface base, dataclass `EndpointConfig` com `portal_slug` e função `fetch` com import sob demanda para eliminar dependência circular.
- `elt/extract/sigcorp/extractor.py` -- Extrator genérico `SigcorpExtractor` e subclasses especializadas.
- `elt/extract/sigcorp/api_endpoints.py` -- Gerador dinâmico de endpoints Sigcorp e funções post-process.
- `elt/extract/sigcorp/__init__.py` -- Exportações públicas do módulo Sigcorp.
- `elt/extract/porciuncula_prefeitura/extractor.py` -- Refatoração para herdar de `SigcorpExtractor`.
- `elt/extract/porciuncula_prefeitura/api_endpoints.py` -- Refatoração para consumir `elt.extract.sigcorp`.
- `elt/extract/natividade_prefeitura/__init__.py` & `api_endpoints.py` -- Módulo de endpoints para Natividade.
- `elt/extract/bom_jesus_itabapoana_prefeitura/__init__.py` & `api_endpoints.py` -- Módulo de endpoints para Bom Jesus do Itabapoana.
- `elt/portals/natividade_prefeitura.yml` -- Configuração declarativa de Natividade.
- `elt/portals/bom_jesus_itabapoana_prefeitura.yml` -- Configuração declarativa de Bom Jesus do Itabapoana.
- `elt/transform/seeds/seed_natividade_prefeitura_orgaos.csv` -- Órgão municipal padrão de Natividade.
- `elt/transform/seeds/seed_bom_jesus_itabapoana_prefeitura_orgaos.csv` -- Órgão municipal padrão de Bom Jesus do Itabapoana.
- `elt/transform/seeds/seeds.yml` -- Registro dbt dos novos seeds de órgãos municipais.
- `elt/transform/models/staging/natividade_prefeitura/_sources.yml` -- Declaração de tabelas raw de Natividade (Regra 5).
- `elt/transform/models/staging/bom_jesus_itabapoana_prefeitura/_sources.yml` -- Declaração de tabelas raw de Bom Jesus do Itabapoana (Regra 5).
- `elt/core/config.py` -- Suporte a `provider`, `rpps` e resolução de caminhos à raiz do repositório.
- `elt/core/pipeline.py` -- Injeção de `portal_slug` na inicialização de extratores.
- `elt/extract/run.py` -- Fallback dinâmico para Sigcorp e injeção de CNPJ municipal no PNCP.
- `elt/conftest.py` -- Descoberta dinâmica de fontes e fixtures sintéticas offline.
- `elt/extract/__tests__/test_sigcorp.py` -- Suíte de 16 testes unitários e de integração do conector Sigcorp.
- `elt/tests/test_db.py` -- Asserção de tabelas nos schemas de todos os novos portais.
- `packages/db/tests/fixtures/schema.sql.gz` -- Fixture compactado sincronizado (Regra 21).

### Review Findings Breakdown
- Patches applied: 14 (1 high, 6 medium, 7 low)
- Findings rejected: 5 (comportamentos intencionais legados e delimitações de escopo para a Story 15.5)

### Verification
- `uv run --project elt pytest elt/extract/__tests__/test_sigcorp.py -v`: 16 passed (100%).
- `make test`: 64 passed (100%).
- `make check`: Ruff, Mypy e format aprovados sem erros.
- `make db/fixture/check`: 4 passed (100% de paridade).
- `make test/ts`: 81 arquivos de teste e 614 testes aprovados (100%).

### Residual Risks
- Nenhum risco residual. Zero regressão para Porciúncula e total isolamento nos novos portais.

## Design Notes

Padrão de herança e backward compatibility em `elt/extract/porciuncula_prefeitura/extractor.py`:
```python
from elt.extract.sigcorp.extractor import SigcorpExtractor

class PorciunculaExtractor(SigcorpExtractor):
    """Alias retrocompatível para o extrator genérico Sigcorp."""
    pass
```

Descoberta dinâmica de fontes raw em `elt/conftest.py`:
```python
_STAGING_DIR = Path(__file__).parent / "transform" / "models" / "staging"

def _create_raw_schema(eng) -> None:
    sources_files = sorted(_STAGING_DIR.glob("**/_sources.yml"))
    for sources_file in sources_files:
        sources = yaml.safe_load(sources_file.read_text())
        # processa e cria schemas e tabelas para cada source
```

## Verification

**Commands:**
- `uv run --project elt pytest elt/extract/__tests__/test_sigcorp.py -v` -- expected: PASS em todos os testes unitários do conector genérico Sigcorp e configurações municipais.
- `make test` -- expected: PASS em 100% da suíte de testes do ELT, pipelines, staging e dbt.
- `make check` -- expected: PASS em lint (Ruff), format check e static type check (Mypy) sem nenhum aviso.
- `make db/fixture/check` -- expected: PASS com 100% de paridade entre o banco de testes e o fixture compactado.
