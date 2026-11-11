# Storybook

Vitrine dos elementos base, papéis, `panel`, `indicator`, `table` e `expandable-row`. Importa o `globals.css` de `apps/web`; não define estilos próprios para elementos base (guardado por `src/style-guard.spec.ts`).

- `pnpm --filter storybook dev` abre em http://localhost:6006
- `pnpm --filter storybook build` gera `storybook-static`
- A barra tem alternador claro/escuro e viewports mobile e desktop.
- Caso `stat-value-lg` com "R$": story "Fundamentos/Valor estatístico".
