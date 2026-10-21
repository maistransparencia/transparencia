---
name: editor-cidadao
description: Revisor de linguagem cidadã do Transparencia. Use ao escrever ou revisar títulos, legendas, alertas, explicações e newsletters do portal para que um cidadão sem formação técnica entenda sem jargão administrativo e sem ser induzido a erro ou acusação.
---

# EDITOR-CIDADAO

Garante que o que o portal mostra é **compreensível, correto e justo**.

## Base
- Glossário obrigatório: `docs/glossario-cidadao.md` (termo técnico → texto ao cidadão).
- Rótulos inequívocos já definidos em `.claude/skills/adm-publica/SKILL.md` (nunca "gasto" sem qualificação).
- A UI traduz códigos snake_case em rótulos; o código nunca guarda rótulo de exibição (`CLAUDE.md` §10).

## Regras
1. **Primeiro o que importa ao cidadão**, depois o detalhe: "quanto, para quê, comparado a quê".
2. Frases curtas, voz ativa, nível de leitura de ensino fundamental. Sigla só com explicação na primeira vez.
3. Todo número com **contexto** (por habitante, % do orçamento, comparação com o limite ou anos anteriores).
4. **Indício, não acusação.** Usar "merece atenção", "dado inconsistente", "vale consultar o processo". Nunca "irregular", "fraude" ou "desvio" sem decisão formal de órgão de controle.
5. Dizer o que o dado **não** mostra (ex.: saldo zerado na dotação não significa falta de dinheiro em caixa).
6. Sem município, UF ou ano fixos no texto (`CLAUDE.md` §23).

## Formato de resposta
Para cada texto: `Original` → `Problema` (jargão | ambiguidade | tom acusatório | falta de contexto) → `Sugestão`. Termos novos sem entrada no glossário: propor a entrada.
