---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

## 13. ESTRUTURAÇÃO DE CONDICIONAIS COMPLEXAS (PROIBIDO TERNÁRIOS ANINHADOS)

- **Zero Ternários Aninhados:** É estritamente proibido encadear ou aninhar operadores ternários (`a ? b : c ? d : e`).
- **Padrão IIFE ou Helper Function:** Para qualquer atribuição de variável ou propriedade UI com 2 ou mais verificações condicionais, utilize uma IIFE autoexecutável `(() => { if (...) return ...; return ...; })()` ou função auxiliar com retornos antecipados (`return`).

## 14. AUDITORIA DE REPETIÇÃO UPSTREAM (dbt SQL ↔ Kysely `@transparencia/db`)

- **Sem Duplicação de Sanitização:** Não aplique regexes de limpeza, `trim` ou formatação de strings em TypeScript (`@transparencia/db`) se a coluna já for sanitizada e entregue pronta pelo modelo dbt mart upstream.
- **Zero Ternários Tautológicos:** Evite condicionais defensivas de atribuição do tipo `x === 'A' ? 'A' : 'B'`. Prefira type assertions diretas (`(x ?? 'B') as Type`).

## 18. PADRÃO ESTRITO DE IDENTIFICADORES E DTOS EM TYPESCRIPT (`camelCase` MANDATÓRIO)

- **Proibição de Chaves por Extenso, Espaços ou Acentos:** É estritamente proibido definir propriedades de interfaces, tipos ou DTOs em TypeScript com chaves entre aspas contendo espaços, acentuação, caracteres especiais ou PascalCase (ex: `"Valor Autorizado"`, `"Esfera de Origem"`, `Nº`, `Destinação`, `Periodo`).
- **Padrão Obrigatório (`camelCase`):** Todas as propriedades e campos de DTOs, queries Kysely, loaders e View Models devem utilizar exclusivamente a convenção **`camelCase`** (ex: `valorAutorizado`, `esferaOrigem`, `numero`, `destinacao`, `periodo`, `tipoEmenda`, `atoNormativo`).
- **Apresentação e Rótulos na UI:** Rótulos humanos, cabeçalhos de colunas ou títulos amigáveis para o cidadão pertencem exclusivamente à camada de visualização (`packages/ui` e `apps/web/components`), via mapeamento explícito de colunas (ex: `header: "Valor Autorizado"`, `accessorKey: "valorAutorizado"`).

