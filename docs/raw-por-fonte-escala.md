# Raw por fonte: desenho e limiares de escala

## Desenho

- Um schema `raw_<fonte>` por provedor (`raw_fiorilli`, `raw_siconfi`, ...), nunca um schema por município.
- Toda tabela migrada leva `portal_slug` na chave primária; municípios novos entram como linhas, não como schemas.
- Motivo: o número de schemas e de modelos dbt cresce com os provedores, não com os municípios.

## Limiares

Definidos em `elt/core/config.py` (`SCALE_*`) e conferidos no log da carga mensal (`elt/load/scale_monitor.py`):

| Limiar | Valor |
|--------|-------|
| Municípios por provedor | 20 |
| Linhas por tabela | 5 milhões |
| Duração da carga | 10 min |
| Colunas por tabela | 150 |

Ultrapassar um limiar só gera um aviso no log; não derruba a carga nem abre issue. Calibrar com 5 a 10 municípios e reavaliar o desenho
(particionar por `portal_slug`, índices, separar tabelas largas) quando o primeiro limiar for atingido ou o provedor passar de 5 municípios.

O teste estrutural `elt/tests/test_raw_fonte_escala.py` falha se uma tabela migrada perder `portal_slug` da chave ou passar de 150 colunas.
