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

## Comportamento de falha

HTML (erro 99), JSON/formato inesperado, indicador fora do pedido, repetido, ou ano com apenas parte dos indicadores: `SiopeError`, nada é gravado e o comando termina com código 1. Ano sem nenhuma linha (ainda não publicado) é ignorado com aviso.

## Auto Run Result

Status: done
