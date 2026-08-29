---
name: changelog-transparencia
description: Use when updating CHANGELOG.md, adding release notes, preparing new releases, or documenting unreleased changes in this project
---

# Padrões de Changelog e Gestão de Releases — Transparência

Este guia estabelece o padrão canônico para redação, atualização e manutenção contínua do [CHANGELOG.md](file:///CHANGELOG.md) e o fluxo automatizado de releases do projeto.

---

## 1. Princípios Fundamentais

- **Padrão Canônico:** Baseado estritamente em [Keep a Changelog 1.0.0](https://keepachangelog.com/pt-BR/1.0.0/) e [Semantic Versioning 2.0.0](https://semver.org/).
- **Arquivo Único Centralizado:** Todas as versões passadas, presentes e futuras residem exclusivamente no arquivo `CHANGELOG.md` na raiz do repositório.
- **Ordem Cronológica Reversa:** A versão mais recente (ou `## [Unreleased]`) fica sempre no topo do arquivo.
- **Duplo Foco (Cidadão + Engenharia):** Todo release deve conter um resumo executivo compreensível por jornalistas e cidadãos (*Destaques da Versão*), seguido do detalhamento técnico estruturado por camadas (UI, DB, dbt, Governança).
- **Linguagem Cidadã e Não-Acusatória:** Neutralidade técnica absoluta. Descrever desvios ou opacidades com base nos limites legais (Lei 4.320/64, LRF, STN), sem adjetivos acusatórios ou opinativos.

---

## 2. Estrutura Padrão de um Release

Cada versão adicionada ao `CHANGELOG.md` deve seguir rigorosamente o seguinte esqueleto:

```markdown
## [X.Y.Z] - AAAA-MM-DD

### 🌟 Destaques da Versão (Epic N: Título da Épica)
* Resumo executivo em 2 a 4 bullets de alto nível explicando o impacto público das principais entregas.

### ✨ Novas Funcionalidades (Added)
* **Nome do Recurso / Componente:** Descrição objetiva da funcionalidade entregue na interface ou API.

### 🏛️ Engenharia de Dados & Modelagem dbt (Data & Analytics)
* **Novos Seeds / Modelos:** Especificação dos marts (`fct_*`), modelos intermediários (`int_*`) ou sementes (`seed_*`) criados/modificados e suas regras de negócio.

### 🔧 Melhorias & Otimizações (Changed / Perf)
* **Refatorações e Ganhos:** Mudanças de arquitetura, desacoplamento, melhorias de performance ou padronização de código.

### ⚖️ Governança & Documentação Pública (Governance & Docs)
* **Manuais e Leis:** Atualizações nos guias de IA (`llms.txt`, `llms-full.txt`), protocolos de governança (`docs/`) e parâmetros em seeds fiscais.

### 🐛 Correções & Refinamentos (Fixed & Polish)
* **Ajustes:** Correções de bugs, responsividade mobile, alinhamento visual ou tratamento defensivo de dados (safe bounding).

### 🗑️ Depreciações & Remoções (Removed) - *Opcional*
* **Expurgos:** Código legado, componentes ou colunas descontinuadas.
```

---

## 3. Classificação das Seções Semânticas

| Seção | Emoji | Quando Utilizar |
|---|---|---|
| `🌟 Destaques da Versão` | 🌟 | Sempre no topo da versão. Resumo executivo para o público geral. |
| `✨ Novas Funcionalidades` | ✨ | Novos componentes UI, novas telas, novos filtros ou novos endpoints/queries. |
| `🏛️ Engenharia de Dados` | 🏛️ | Novos modelos dbt (staging, intermediate, marts), seeds, macros ou SQL de analytics. |
| `🔧 Melhorias & Otimizações` | 🔧 | Refatorações sem alteração de comportamento externo, ganhos de performance, desacoplamento. |
| `⚖️ Governança & Documentação` | ⚖️ | Atualização de `llms.txt`, `AGENTS.md`, `docs/*.md` ou bases legais em seeds. |
| `🐛 Correções & Refinamentos` | 🐛 | Bugfixes, safe bounding, fixes de CSS/mobile, neutralização de termos. |
| `🗑️ Remoções` | 🗑️ | Remoção de código morto, componentes órfãos ou views legadas. |

---

## 4. Ciclo de Vida: de `[Unreleased]` ao Deploy de Release

### Durante o Desenvolvimento (Dia a Dia):
1. Quando uma Story ou pull request for concluído, adicione os itens correspondentes sob a seção `## [Unreleased]` no topo do `CHANGELOG.md`:
   ```markdown
   ## [Unreleased]

   ### ✨ Novas Funcionalidades (Added)
   * **Termômetro de Opacidade Fiscal:** Adicionado medidor de gastos em .99.
   ```

### No Momento do Fechamento da Release:
1. **Listar commits desde a última tag:**
   ```bash
   git log $(git describe --tags --abbrev=0)..HEAD --oneline
   ```
2. **Promover `[Unreleased]` para a Nova Versão:**
   - Altere o cabeçalho no `CHANGELOG.md` para `## [X.Y.Z] - AAAA-MM-DD` com a data atual.
   - Deixe uma linha vazia `## [Unreleased]` acima da nova versão para os próximos ciclos.
3. **Atualizar `package.json`:**
   - Atualize o campo `"version": "X.Y.Z"` no arquivo raiz.
4. **Commitar e Criar a Tag:**
   ```bash
   git add CHANGELOG.md package.json
   git commit -m "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   ```
5. **Enviar para o Repositório Remoto:**
   ```bash
   git push origin dev
   git push origin vX.Y.Z
   ```
6. **Automação GitHub Actions:**
   - O workflow `.github/workflows/release.yml` captura a tag `vX.Y.Z`, recorta o bloco exato correspondente no `CHANGELOG.md` e publica automaticamente a GitHub Release oficial.

---

## 5. Checklist de Qualidade do Changelog

Antes de fechar a versão no `CHANGELOG.md`, certifique-se de que:

- [ ] Todos os commits relevantes da sprint/épica estão representados.
- [ ] Os nomes de métricas, modelos e componentes citados correspondem exatamente ao código real.
- [ ] A linguagem usada é neutra, técnica e cidadã.
- [ ] A versão declarada no cabeçalho é idêntica à versão do `package.json` e da tag git.
