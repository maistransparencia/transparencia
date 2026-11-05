---
status: done
---

# Story 24.1: Ingestão do Relatório Gerencial do SIOPE

## O que foi feito

- `elt/extract/siope.py`: extrator (User-Agent/Referer de navegador, limite de taxa de 1 req/s, retry só em falha transitória, validação estrita de formato). Código SIOPE = `cod_ibge` sem o dígito verificador; UF também derivada do IBGE (Regra 23). IDs internos dos indicadores resolvidos por `listarIndicador` a partir do código de exibição.
- `elt/load/siope.py`: tabela `raw_<portal>.siope_indicadores`, PK (`portal_slug`, `ano`, `periodo`, `codigo_indicador`), com `valor` anulável (nunca zero presumido), `codigo_siope` e `coletado_em`.
- `make elt/siope PORTAL=... [YEARS=...] [DRY_RUN=1]`; testes em `elt/extract/__tests__/test_siope.py`.
- Verificado no Docker local: Porciúncula 4.9 = 16.789,15 (2024) e 16.767,14 (2025), iguais ao conferido pelo contador; 1.1 = 29,01% e 25,07%.

## Desvio do critério de aceite (lote de 2+ municípios)

Em 2026-11-01 a API, pedida em lote de 2 ou 3 municípios, devolveu **a média** com `codEnte` zerado (Porciúncula 16.789,15 + Natividade 19.463,73 → 18.126,44). Pedido de um município por vez devolve o valor exato dele. Por isso a carga pede **um município por requisição** e rejeita linha repetida (sinal de resposta agregada). A premissa do spike ("com dois ou mais vem o código de cada município") não se confirmou.

## Procedência dos dados (verificada em 2026-11-01)

- `tipo_periodo`: `anual` (código `A` da API; `B` é bimestral, conforme a tela do Relatório Gerencial). `periodo` 6 é o 6º bimestre, o fechamento do ano (acumulado). Na consulta anual a API devolve o 6º bimestre qualquer que seja o `numPeri` pedido (1.1 de Porciúncula: 29,01 em 2024 nos dois modos).
- Ano em andamento (2026, até o 4º bimestre) volta **sem linhas** na consulta anual: não é gravado como parcial, apenas fica ausente, com aviso. Se a 24.2 precisar mostrar parcial, será preciso ingerir a consulta bimestral (fora desta story).
- `unidade` vem de `idnTipoValr` da lista oficial de indicadores (`P` percentual, `M` monetário). `nomes_oficiais_indicador` guarda todos os `nomIndi` do código: o 1.2 traz quatro nomes de normas diferentes (FUNDEF/FUNDEB "magistério, mínimo de 60%" e FUNDEB "profissionais da educação, mínimo de 70%", este com base no inciso XI do art. 212-A da CF/88 e na Portaria Conjunta MGI/MF/CGU nº 33/2023). A API não informa a fórmula, só o valor.
- Reprodução manual: tela pública `https://www.fnde.gov.br/siope/relatorio-gerencial/dist/` com os mesmos filtros.
- A tabela raw ainda não é lida pelo dbt, então `_sources.yml` não foi alterado (Story 24.2).

## Comportamento de falha

HTML (erro 99), JSON/formato inesperado, indicador fora do pedido, repetido, ou ano com apenas parte dos indicadores: `SiopeError`, nada é gravado e o comando termina com código 1. Ano sem nenhuma linha (ainda não publicado) é ignorado com aviso.

## Auto Run Result

Status: done
