# bmad-custom

Integração dos especialistas (`jurista-fiscal`, `contador-publico`, `editor-cidadao`) com o BMad. `_bmad/` e `.claude/skills/bmad-*` ficam fora do git, então a configuração versionada vive aqui e é copiada para o lugar certo após o `npx bmad-method install`.

## O que fica onde

| Parte | Local (versionado) |
|---|---|
| Comportamento dos especialistas | `.claude/skills/<nome>/SKILL.md` |
| Glossário do cidadão | `docs/glossario-cidadao.md` |
| Roster para `bmad-party-mode` | `bmad-custom/config.toml` → `_bmad/custom/config.toml` |
| Regras injetadas nos agentes PM e Dev | `bmad-custom/bmad-agent-*.toml` → `_bmad/custom/` |

## Instalar

```bash
npx bmad-method install          # se ainda não instalou
mkdir -p _bmad/custom
cp bmad-custom/*.toml _bmad/custom/
```

## Verificar

Os TOMLs são **rascunhos não verificados contra o BMad 6.12.4**. Antes de confiar neles:

1. Rode `/bmad-customize` e peça para validar cada arquivo; ele confere se o resultado mesclado contém a mudança.
2. Ou resolva manualmente:
   ```bash
   uv run _bmad/scripts/resolve_customization.py \
     --skill "$PWD/.claude/skills/bmad-agent-pm" --project-root "$PWD" --key agent
   ```
3. Se o schema do `customize.toml` instalado diferir, ajuste os arquivos aqui e commite.

## Uso

- Revisão isolada: invoque o skill (`/jurista-fiscal`, `/contador-publico`, `/editor-cidadao`).
- No BMad (party mode e roster) os especialistas aparecem com nome próprio, como a Amelia do `bmad-agent-dev`; os skills mantêm o nome descritivo:

  | Skill | Nome no BMad |
  |---|---|
  | `jurista-fiscal` | Jurandir |
  | `contador-publico` | Atanagildo |
  | `editor-cidadao` | Creuza |
- Debate entre especialistas: `/bmad-party-mode` (team `transparencia`).
- Os agentes PM e Dev carregam as regras de conformidade automaticamente via `persistent_facts`.

## Limites

Os especialistas **revisam**; advogado e contador responsáveis confirmam o que for publicado como oficial.
