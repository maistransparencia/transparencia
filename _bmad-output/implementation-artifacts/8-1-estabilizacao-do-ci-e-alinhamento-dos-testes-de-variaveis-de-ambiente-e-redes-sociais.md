# Story 8.1: Estabilização do CI e Alinhamento dos Testes de Variáveis de Ambiente e Redes Sociais

Status: done

## Story

As a developer or CI/CD reliability engineer,  
I want the automated test suites (`env.spec.ts` and `social-links.spec.tsx`) to accurately reflect the canonical default fallback URL for Facebook (`https://facebook.com/profile.php?id=`),  
So that continuous integration pipelines run completely green without false-positive failures on default environment configurations.

---

## Acceptance Criteria

1. **Alinhamento da Asserção em `apps/web/env.spec.ts`:**
   - O teste unitário deve verificar que o valor padrão de `NEXT_PUBLIC_FACEBOOK_URL` é `"https://facebook.com/profile.php?id="`, correspondendo à definição do schema em `apps/web/env.ts`.

2. **Alinhamento dos Testes em `apps/web/components/social-links.spec.tsx`:**
   - O teste de renderização do componente `SocialLinks` deve validar o atributo `href` como `"https://facebook.com/profile.php?id="`.
   - O teste de clique com telemetria PostHog deve esperar o payload contendo `url: "https://facebook.com/profile.php?id="`.

3. **Portão de Qualidade:**
   - A execução de `make test/ts` deve concluir com 100% de sucesso (38 arquivos de teste, 187 testes passando).
   - O build de produção (`pnpm build`) deve compilar perfeitamente.

---

## Tasks / Execution Plan

- [x] Task 1: Reverter `apps/web/env.ts` para manter o valor padrão original e correto (`"https://facebook.com/profile.php?id="`).
- [x] Task 2: Atualizar a expectativa de teste em `apps/web/env.spec.ts` (linha 29).
- [x] Task 3: Atualizar as expectativas de teste em `apps/web/components/social-links.spec.tsx` (linhas 46 e 71).
- [x] Task 4: Executar `make test/ts` e confirmar 187/187 testes passando.
- [x] Task 5: Atualizar `epics.md` e `sprint-status.yaml` refletindo o status da Story 8.1.
