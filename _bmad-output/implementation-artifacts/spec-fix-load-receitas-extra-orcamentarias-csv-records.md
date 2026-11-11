---
title: 'Fix record loading for receitas_extra_orcamentarias CSVs'
type: 'bugfix'
created: '2026-08-08'
status: 'done'
baseline_commit: '2e9100c6ceb450d636379fc80097e1cdf4143e32'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `elt/load/porciuncula_prefeitura/load_receitas_csv.py` was deduplicating records for `receita_extra_orcamentaria` using a restrictive key `(ano, empresa, codigo)`. Because `receita_extra_orcamentaria` contains individual transaction entries across the year for the same rubric code, over 65,000 records (7,932 loaded out of 73,912 CSV rows) were being discarded during ETL loading.

**Approach:** Update `api_endpoints.py` and `load_receitas_csv.py` to include transaction details (`dtlan`, `descricao`, `valor`) in `key_cols` for `receita_extra_orcamentaria`, update `_sources.yml` accordingly, and synchronize the dbt mart model `fct_receita_extra_orcamentaria.sql` so all 73,876 CSV records are preserved in the database.

## Boundaries & Constraints

**Always:** Maintain exact versioning, update `_sources.yml` when raw primary key columns change, and verify via `make test`.

**Ask First:** Any changes to non-extra budgetary receita endpoints.

**Never:** Truncate raw database tables without replacing them with full CSV datasets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Load all extra receitas | 36 CSV files in `data/csv/receitas` containing 73,912 records | All ~73,876 rows loaded into `raw_porciuncula_prefeitura.receita_extra_orcamentaria` | Skip corrupt CSVs with error log |
| Re-running ETL script | Re-execution of `load_receitas_csv.py` | Idempotent upsert without duplicating or discarding valid rows | N/A |

</frozen-after-approval>

## Code Map

- `elt/extract/porciuncula_prefeitura/api_endpoints.py` -- Endpoint configuration defining `table` and `key_cols` for raw loading.
- `elt/load/porciuncula_prefeitura/load_receitas_csv.py` -- ETL script reading CSV files and upserting into PostgreSQL `raw_porciuncula_prefeitura`.
- `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- dbt source definitions and primary key metadata for raw tables.

## Tasks & Acceptance

**Execution:**
- [x] `elt/extract/porciuncula_prefeitura/api_endpoints.py` -- Update `key_cols` for `receita_extra_orcamentaria` to include `dtlan`, `descricao`, `valor` -- Allow storing individual transactions rather than grouping by rubric code alone.
- [x] `elt/load/porciuncula_prefeitura/load_receitas_csv.py` -- Update PK/upsert handling for `receita_extra_orcamentaria` -- Ensure all CSV records are loaded without deduplication loss.
- [x] `elt/transform/models/staging/porciuncula_prefeitura/_sources.yml` -- Update `meta.primary_key` for `receita_extra_orcamentaria` -- Keep dbt source definitions synchronized.

**Acceptance Criteria:**
- Given CSV files in `data/csv/receitas`, when `python3 elt/load/porciuncula_prefeitura/load_receitas_csv.py` is executed, then the total row count in `raw_porciuncula_prefeitura.receita_extra_orcamentaria` matches the total number of valid CSV rows (~73,876).
- Given updated raw table data, when `make test` is executed, then all integration tests pass cleanly.

## Design Notes

`receita_extra_orcamentaria` represents transactional receipts (retencões/consignações/débitos extra-orçamentários), unlike `receita_orcamentaria` which contains aggregated yearly totals per rubric.

## Verification

**Commands:**
- `python3 elt/load/porciuncula_prefeitura/load_receitas_csv.py` -- expected: `✓` for all CSV files with full row counts (~73k total) loaded into DB
- `make test` -- expected: pytest and dbt test suite passes with exit code 0
- `make test/ts` -- expected: vitest parity tests pass with exit code 0
- `pnpm build` -- expected: workspace build passes cleanly

## Suggested Review Order

**ETL Endpoint & Key Configuration**

- Expanded natural key_cols for receita_extra_orcamentaria to preserve transactional entries
  [`api_endpoints.py:278`](../../elt/extract/porciuncula_prefeitura/api_endpoints.py#L278)

- Cleaned up CSV ingestion column mapping for extra-budgetary receitas
  [`load_receitas_csv.py:133`](../../elt/load/porciuncula_prefeitura/load_receitas_csv.py#L133)

**dbt Schema & Mart Models**

- Synchronized raw primary key metadata in dbt sources
  [`_sources.yml:203`](../../elt/transform/models/staging/porciuncula_prefeitura/_sources.yml#L203)

- Added codigo and descricao grouping to fct_receita_extra_orcamentaria mart model
  [`fct_receita_extra_orcamentaria.sql:8`](../../elt/transform/models/marts/fct_receita_extra_orcamentaria.sql#L8)

- Updated fct_receita_extra_orcamentaria schema contract and unit test assertions
  [`_fct_receita_extra_orcamentaria.yml:43`](../../elt/transform/models/marts/_fct_receita_extra_orcamentaria.yml#L43)

