---
baseline_commit: 45826d9
generated_at: 2026-08-04T21:15:00-03:00
---

# Story 3.4: Validação Final e Gate de Encerramento da Story 3.3

## Metadados

- Epic: 3 - Reorganização da UI e Co-localização de Loaders no apps/web
- Story ID: 3.4
- Story Key: 3-4-validacao-final-e-gate-de-encerramento-da-story-3-3
- Status: review
- Arquivo: _bmad-output/implementation-artifacts/3-4-validacao-final-e-gate-de-encerramento-da-story-3-3.md

## User Story

Como mantenedor,
Quero executar o gate final de validação da Story 3.3 e registrar evidências objetivas,
Para que a migração dos loaders web para leitores de métricas seja encerrada com prova verificável de estabilidade antes da próxima expansão de escopo.

## Critérios de Aceitação (BDD)

**Given** a Story 3.3 já implementada e com o artefato de implementação existente em `_bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md`
**When** forem executados os comandos obrigatórios de validação final
**Then** `make test`, `make test/ts` e `pnpm build` devem concluir com sucesso, sem regressões novas.

**And** o artefato da Story 3.3 deve ser atualizado com evidências objetivas de execução e status final concluído.

**And** a Story 3.3 deve ser promovida para `done` apenas após a validação final bem-sucedida.

**And** qualquer falha encontrada no gate deve ser tratada como regressão da Story 3.3, não como novo escopo funcional.

**And** nenhuma alteração de código funcional nova deve ser introduzida por esta story; o foco é fechamento, evidência e rastreabilidade.

## Contexto da Epic e Valor

- A Story 3.3 já realizou a migração arquitetural dos loaders web para leitores de métricas onde há cobertura.
- Esta Story 3.4 existe para formalizar o encerramento técnico da migração com gate de estabilidade, impedindo que a entrega avance sem prova objetiva.
- O valor principal é rastreabilidade: o histórico final precisa registrar que a paridade visual, tipagem e build ficaram verdes após a migração.

## Guardrails Arquiteturais Obrigatórios

### AD-3 e AD-5

1. Não reintroduzir lógica runtime de agregação em TypeScript durante a validação.
2. Preservar o filtro obrigatório por `portalSlug` em qualquer fluxo de leitura já usado pela Story 3.3.
3. O gate não deve alterar a arquitetura de dados; ele apenas confirma que a arquitetura já aplicada permanece estável.

### AD-4 e AD-6

1. Não mover componentes ou loaders nesta story.
2. A validação final deve usar os comandos oficiais do projeto e registrar evidência clara.
3. Se houver falha, o reparo deve permanecer no escopo da Story 3.3 já implementada.

## Arquivos de UPDATE Lidos

### _bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md

- Estado atual: Story 3.3 está documentada como `in-progress`, mas já contém o registro de implementação e as evidências esperadas do fluxo final.
- Mudança desta story: consolidar a validação final, registrar o encerramento e promover o status da Story 3.3 para `done` após os comandos verdes.
- Preservar: todos os detalhes de rastreabilidade por rota, o backlog técnico para Pessoal/Licitações e os prazos de remoção de fallback.

### _bmad-output/implementation-artifacts/sprint-status.yaml

- Estado atual: a chave da Story 3.4 ainda não existe no tracking.
- Mudança desta story: adicionar a Story 3.4 ao desenvolvimento com status `ready-for-dev` e manter o Epic 3 como `in-progress`.
- Preservar: ordem das stories, comentários de status e estrutura completa do arquivo.

## Requisitos de Validação

1. `make test`
2. `make test/ts`
3. `pnpm build`

Todos os comandos acima devem ser executados antes do fechamento da story. Se qualquer um falhar, a causa deve ser documentada como regressão da Story 3.3 e corrigida antes de encerrar o gate.

## Plano de Execução

- [x] Etapa 1 - Executar a suíte completa de validação
  - [x] Rodar `make test`.
  - [x] Rodar `make test/ts`.
  - [x] Rodar `pnpm build`.

- [x] Etapa 2 - Registrar evidências no artefato da Story 3.3
  - [x] Atualizar o arquivo da Story 3.3 com os resultados dos três comandos.
  - [x] Confirmar que a rastreabilidade por rota continua consistente com a implementação existente.

- [x] Etapa 3 - Encerrar a Story 3.3
  - [x] Promover a Story 3.3 para `done` apenas após as validações verdes.
  - [x] Registrar nota final objetiva indicando que o gate foi aprovado.

## Checklist de Conclusão

- [x] Todos os comandos obrigatórios concluíram com sucesso.
- [x] A Story 3.3 foi atualizada com evidência e encerramento.
- [x] O sprint status foi mantido coerente com o estado real do trabalho.
- [x] Nenhuma regressão funcional ou de tipagem foi introduzida pelo fechamento.

## Dev Agent Record

### Implementation Plan

- Executar `make test`, `make test/ts` e `pnpm build` como gate final da Story 3.3.
- Se o build falhasse por leitura de ambiente local do Vercel CLI, repetir com `HOME` e `XDG_CONFIG_HOME` isolados para evitar dependência de configuração pessoal fora do repositório.
- Registrar o fechamento da Story 3.3 como `done` e atualizar o sprint status para refletir o encerramento.

### Completion Notes List

- Gate final validado com sucesso: `make test`, `make test/ts` e `pnpm build` concluídos sem regressões funcionais.
- O build precisou de isolamento de `HOME`/`XDG_CONFIG_HOME` para evitar a leitura do `auth.json` global do Vercel CLI; o resultado do build permaneceu verde.
- Story 3.3 promovida para `done` após evidência objetiva e rastreabilidade atualizada.

### Debug Log

- 2026-08-04T21:25:00-03:00 - Iniciada a validação final da Story 3.3.
- 2026-08-04T21:35:00-03:00 - Build verificado com `HOME`/`XDG_CONFIG_HOME` isolados para contornar leitura do `auth.json` global.

### File List

- _bmad-output/implementation-artifacts/3-3-migracao-completa-dos-loaders-web-para-leitores-de-metricas.md (UPDATED)
- _bmad-output/implementation-artifacts/3-4-validacao-final-e-gate-de-encerramento-da-story-3-3.md (UPDATED)
- _bmad-output/implementation-artifacts/sprint-status.yaml (UPDATED)

### Change Log

- 2026-08-04 - Gate final executado com sucesso e Story 3.3 encerrada como `done` após validação objetiva.

## Status Final

Current Status: review

Completion Note: Gate final concluído com validação objetiva, rastreabilidade completa e Story 3.3 encerrada.