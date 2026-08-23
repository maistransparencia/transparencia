# Estimativa de Consumo de Tokens & Capacidade no Gemini Free Tier

Este documento apresenta o dimensionamento técnico de consumo de tokens, análise de capacidade no **Gemini Free Tier** (modelo `gemini-2.5-flash-lite` / `gemini-1.5-flash`) e estratégias de limitação e caching para o assistente de transparência pública.

---

## 1. Parâmetros e Limites do Gemini Free Tier

A API do Gemini no plano gratuito (*Free Tier*) estabelece as seguintes restrições de uso:

| Métrica | Limite Gratuito |
| :--- | :--- |
| **RPM** (*Requests Per Minute*) | **15** requisições por minuto |
| **RPD** (*Requests Per Day*) | **1.000** requisições por dia |
| **TPM** (*Tokens Per Minute*) | **1.000.000** tokens por minuto |

---

## 2. Estimativa de Tokens por Interação no ReAct Engine

Cada turno de conversa entre o cidadão e o assistente fiscal consome tokens em duas etapas (Input e Output):

### 2.1. Tokens de Input (Entrada)
- **Prompt de Sistema + Taxonomia Fiscal (`FISCAL_TAXONOMY`)**: ~1.500 a 2.000 tokens
- **Pergunta do Usuário** (limitada a 300 caracteres): ~60 a 100 tokens
- **Retorno da Consulta SQL/Kysely** (dados consolidados): ~300 a 800 tokens
- **Subtotal Input**: **~2.500 a 3.000 tokens**

### 2.2. Tokens de Output (Saída)
- **Tool Calls (JSON de busca/query)** + **Resposta Final Formatada**: ~200 a 400 tokens
- **Subtotal Output**: **~200 a 400 tokens**

👉 **Consumo Médio Total por Turno**: **~3.000 tokens**

---

## 3. Modelo de Demanda para Porciúncula (20.000 Habitantes)

Porciúncula é um município pequeno de aproximadamente 20.000 habitantes. Com base nos padrões de adoção de serviços públicos digitais:

- **Usuários Ativos Diários (DAU) Estimados**:
  - **Dias Normais**: ~30 a 50 cidadãos ativos/dia
  - **Picos de Interesse** (notícias locais, divulgação de folha/balanços): ~100 a 200 cidadãos ativos/dia
- **Média de Perguntas por Sessão**: 3 perguntas/usuário

### 📊 Volume Diário de Requisições (RPD):
- **Cenário Normal**: 40 usuários × 3 perguntas = **120 requisições/dia** (12% do limite diário do Free Tier)
- **Cenário de Pico**: 150 usuários × 3 perguntas = **450 requisições/dia** (45% do limite diário do Free Tier)

> [!NOTE]
> **Conclusão de Capacidade**: O plano gratuito do Gemini atende 100% da demanda de Porciúncula em dias de pico extremo usando **menos da metade da cota diária (1.000 RPD)**.

---

## 4. Estratégias de Proteção e Escalabilidade

### 4.1. Rate Limiting por Perfil de Usuário
Para evitar exaustão da cota por scrapers maliciosos ou loops acidentais:
- **Usuários Anônimos (sem autenticação)**: Máximo de **5 perguntas por IP / dia**.
- **Usuários Autenticados (via Gov.br / Login)**: Máximo de **20 perguntas por usuário / dia**.

### 4.2. Caching de Perguntas Frequentes (KV / Redis Cache)
Perguntas com alta concorrência (ex: *"Quanto a prefeitura arrecadou em 2024?"* ou *"Qual o orçamento da Saúde?"*) têm os resultados das queries SQL cacheados no backend.
- O retorno cacheado consome **0 tokens** da API do Gemini nas chamadas subsequentes.
- Reduz o consumo do Free Tier em até 50% adicionais.

### 4.3. Custo em Caso de Estouro (*Pay-as-you-go*)
Caso o município atinja picos extraordinários acima de 1.000 requisições/dia:
- O custo do Gemini 2.5 Flash-Lite é de **US$ 0,075 por 1M tokens de input**.
- 1.000 requisições excedentes custariam aproximadamente **US$ 0,22 (R$ 1,20/mês)**.

---

## 5. Matriz de Escalabilidade Multi-Município

| Quantidade de Municípios (porte ~20k hab) | Estimativa de RPD Total | Cobertura do Free Tier | Necessidade de Plano Pago |
| :--- | :--- | :--- | :--- |
| **1 Município (Porciúncula)** | 120 – 450 RPD | **100% Coberto** | R$ 0,00 |
| **2 a 3 Municípios** | 360 – 900 RPD | **100% Coberto** | R$ 0,00 |
| **4+ Municípios** | 1.200+ RPD | Excede 1.000 RPD | ~R$ 3,00 a R$ 10,00/mês |
