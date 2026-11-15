---
title: 'Fix App Title Formatting and Eliminate Duplicate Prefixes'
type: 'bugfix'
created: '2026-08-20T00:11:45-03:00'
status: 'done'
route: 'one-shot'
---

# Fix App Title Formatting and Eliminate Duplicate Prefixes

## Intent

**Problem:** Quando o app era instalado como PWA, o nome configurado no manifesto (`MaisTransparencia - Transparência Pública Municipal`) somado ao título da página (`MaisTransparencia - Visão Geral | Prefeitura de Porciúncula`) resultava em um título de janela extremamente poluído e redundante (`MaisTransparencia - Transparencia Publica Municipal - MaisTransparencia - Visao Geral | Prefeitura de Porciuncula`).

**Approach:** Simplificar o nome do PWA em `manifest.ts` de `MaisTransparencia - Transparência Pública Municipal` para `MaisTransparencia`. Mantém-se o prefixo `MaisTransparencia - %s` em `layout.tsx` para garantir a exibição da marca no navegador web sem instalar.

## Suggested Review Order

1. [apps/web/app/manifest.ts](../../apps/web/app/manifest.ts) — Simplificação do nome do PWA no manifesto web para `MaisTransparencia`.
2. [apps/web/app/manifest.spec.ts](../../apps/web/app/manifest.spec.ts) — Atualização da asserção de teste unitário do manifesto.
3. [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx) — Manutenção do `title.template` (`MaisTransparencia - %s`) para exibição no navegador web.
