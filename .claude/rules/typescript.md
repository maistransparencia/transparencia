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

## 26. IDIOMA DOS IDENTIFICADORES (DOMÍNIO EM PORTUGUÊS, INFRAESTRUTURA EM INGLÊS)

- **Domínio em Português:** termos de administração pública, contabilidade e jurídico permanecem em português (`empenhado`, `liquidado`, `restosAPagar`, `licitacao`, `valorAutorizado`, `portalSlug`). Vale para DTOs, queries, métricas e view models, em conjunto com as regras 9, 10 e 18.
- **Infraestrutura em Inglês:** nomes de funções utilitárias, helpers, constantes técnicas, variáveis locais, props de componentes de UI, tipos genéricos e specs de arquitetura usam inglês (`listFiles`, `nextImportPattern`, `linkComponent`, `currentPathname`, `DefaultLink`). Proibido português para verbos e substantivos técnicos como `listar`, `obter`, `caminho`, `arquivo`, `referencia`.
- **Teste de Fronteira:** "um contador ou advogado reconheceria este termo?" Se sim, português; se não, inglês.
- **Texto Humano em Português:** rótulos da UI, comentários, descrições de `it(...)`/`describe(...)` e mensagens ao cidadão continuam em português. Códigos de dados seguem a regra 10.
- **Nomes de Arquivo:** arquivos de domínio podem usar português; arquivos de infraestrutura usam inglês em kebab-case.
- **Escopo Incremental:** a regra vale para código novo e para código tocado; renomeação em massa do legado é feita em story própria.

