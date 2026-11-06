---
status: in-review
baseline_commit: 034622215800403d31b1c06ae521bde0984777f4
---

# Story 25.1: Spike de Fontes Oficiais dos Indicadores de Saúde

Critérios de aceite completos: `planning-artifacts/epics.md`, Story 25.1 (Epic 25). Este arquivo guarda só o contexto de execução.

## Entregável

`planning-artifacts/spike-saude-fontes-indicadores.md`, no modelo de `spike-siope-valor-por-aluno.md` (resposta curta, como o acesso funciona, comparação, limites e riscos, recomendação, evidências guardadas). **Sem código de produção.**

## Contexto já apurado (não refazer)

- Epic 25, descoberto em 2026-11-01: a API de Dados Abertos do Ministério da Saúde (`apidadosabertos.saude.gov.br`, a mesma da farmácia SUS, Story 19.1) tem produção ambulatorial (SIA) e hospitalar (SIH), Previne Brasil, PNI (2026), CNES e população residente. **Não tem** mínimo constitucional, fila de espera, repasses fundo a fundo nem emendas.
- Emendas **já saíram** desta spike: método em `planning-artifacts/spike-emendas-fonte-federal.md` (25.1a) e `spike-emendas-estaduais.md` (25.1c). Não repetir.
- O seed `elt/transform/seeds/seed_constantes_fiscais.csv` **ainda não tem** o limite de saúde (15% para municípios). Quem fixa a base legal é o `jurista-fiscal`; sem link oficial verificado, registrar "NÃO VERIFICADO" (Regra 20).
- O método de spike de uma fonte com API própria está em `spike-siope-valor-por-aluno.md` e na carga `elt/extract/siope.py` (User-Agent de navegador, 1 requisição por vez, validação estrita).

## Ordem de trabalho sugerida

1. **Mínimo constitucional (prioridade, destrava 25.2 e 25.3):** comparar Siconfi (RREO, anexo de saúde), SIOPS e o cálculo próprio pelo dbt. Para cada um: endpoint ou arquivo, periodicidade, defasagem, cobertura de um município integrado e valor real de pelo menos um ano fechado e um em andamento. `contador-publico` valida base de cálculo, exclusões e a diferença entre repasse ao fundo e despesa aplicada com recursos próprios.
2. **Origem do dinheiro por esfera (25.4):** testar o Fundo Nacional de Saúde (repasses fundo a fundo), hoje candidato NÃO VERIFICADO. Recurso federal e estadual fica fora da base do mínimo.
3. **Indicadores da API da Saúde (25.6):** para cada candidato (procedimentos ambulatoriais e hospitalares, atenção primária, imunização, leitos e profissionais por habitante, transporte e hemodiálise), registrar endpoint, periodicidade, régua e resposta real de município integrado.
4. **Fila de espera e regulação:** dizer se existe fonte aberta. Se não, registrar a alternativa (pedido LAI) e deixar fora do primeiro corte.
5. **Teste a partir do CI:** a API deu timeout em 2026-11-01 e respondeu 200 em outra tentativa. Registrar timeouts, limite de taxa e necessidade de repetição, rodando do ambiente da carga diária.
6. **Fechamento:** tabela por indicador (pergunta do cidadão, fonte, endpoint, periodicidade, defasagem, régua, teste de contrato, decisão entrar/adiar/descartar), divisão recomendada das Stories 25.2 a 25.6 e perguntas abertas para o Julio.

## Regras que valem aqui

- Regra 15: nenhuma execução contra produção ou banco remoto. Chamadas HTTP de leitura às APIs oficiais são o escopo; qualquer gravação é no Docker local.
- Regra 23: nenhum literal de município, UF ou ano no que a spike propuser; o município de teste vem de `cod_ibge` do portal.
- Regra 27: toda linha da tabela começa pela pergunta do cidadão. Indicador sem fonte oficial recorrente, sem teste de contrato ou sem régua vai para o backlog com o motivo.
- Nenhum número da planilha da audiência pública é fonte.
- Pareceres: `jurista-fiscal` (base legal), `contador-publico` (cálculo), `editor-cidadao` (perguntas).

## Fora do escopo

Ingestão em produção; usar a planilha da audiência; fila de WhatsApp; comparação ou ranking entre municípios.

## Definição de pronto

Documento da spike entregue e revisado pelos três pareceres, 25.2 a 25.6 reescritas ou ajustadas no `epics.md` conforme a recomendação, sprint-status atualizado.
