# Guia Técnico: Consulta de Caixa e Disponibilidade Financeira via API SICONFI (MSC)

> **Status:** Referência Técnica / Arquitetura de Dados  
> **Órgão Responsável:** Secretaria do Tesouro Nacional (STN) / Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro (SICONFI)  
> **Objetivo:** Documentar a integração com a API da Matriz de Saldos Contábeis (MSC) para aferição exata (sem estimativas) de saldos bancários, caixas e disponibilidades por entidade pública municipal.

---

## 1. Contexto Contábil e Limitação das Estimativas Orçamentárias

Nos portais municipais de transparência de despesas e receitas correntes, o cálculo de disponibilidade de caixa é comumente estimado por fluxo orçamentário:

$$\text{Saldo Estimado} = \text{Receitas Arrecadadas} - (\text{Despesas Pagas} + \text{Restos a Pagar Pagos})$$

Essa abordagem é apenas uma **estimativa de fluxo**, pois ignora:
1. **Saldo de Abertura:** O superávit financeiro acumulado de exercícios anteriores existente na conta bancária no dia 1º de janeiro.
2. **Transferências Financeiras Internas:** Movimentações de tesouraria entre contas da mesma entidade ou repasses intergovernamentais (duodécimo do Legislativo, aportes ao RPPS/CAPREM).
3. **Movimentações Extraorçamentárias:** Retenções em folha (INSS, IRRF, consignações), depósitos judiciais, cauções de contratos e fianças.

Para obter o saldo bancário **real, auditado e exato**, a fonte oficial canônica é a **Matriz de Saldos Contábeis (MSC)** enviada mensalmente pelos entes federativos à Secretaria do Tesouro Nacional (STN).

---

## 2. Visão Geral da API SICONFI

* **Portal da Documentação:** [http://apidatalake.tesouro.gov.br/docs/siconfi/](http://apidatalake.tesouro.gov.br/docs/siconfi/)
* **Especificação OpenAPI/Swagger:** [http://apidatalake.tesouro.gov.br/docs/siconfi.yaml](http://apidatalake.tesouro.gov.br/docs/siconfi.yaml)
* **URL Base de Serviços:** `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/`
* **Autenticação:** **Pública e aberta** (sem token, chave de API ou cadastro prévio obrigatório).
* **Formato de Retorno:** JSON padronizado em envelope Oracle REST Data Services (ORDS).
* **Paginação:** Suporte nativo a `limit` e `offset` (limite padrão de até 5.000 itens por página).
* **Políticas de Consumo (Rate Limit):** Recomenda-se cadência máxima de **1 requisição por segundo** (30 a 60 requisições/minuto) e envio de cabeçalho `User-Agent` descritivo da aplicação.

---

## 3. Especificação do Endpoint Patrimonial (`/msc_patrimonial`)

Para apuração de saldos de contas bancárias e caixa, utiliza-se a dimensão **patrimonial** da MSC (classes 1 a 4 do PCASP).

```http
GET /ords/siconfi/tt/msc_patrimonial HTTP/1.1
Host: apidatalake.tesouro.gov.br
```

### 3.1. Parâmetros da Consulta (Query Parameters)

> [!IMPORTANT]
> **Todos os 6 parâmetros abaixo são obrigatórios.** A ausência de qualquer um deles resultará em erro de requisição ou retorno de lista vazia.

| Parâmetro | Tipo | Valores Válidos | Descrição |
| :--- | :--- | :--- | :--- |
| `id_ente` | `integer` | Código IBGE (7 dígitos) | Identificador do ente federativo (ex: `3304102` para Porciúncula/RJ). |
| `an_referencia` | `integer` | Ex: `2024`, `2025` | Exercício contábil de referência da matriz. |
| `me_referencia` | `integer` | `1` a `12` | Mês de referência da declaração mensal. |
| `co_tipo_matriz` | `string` | `MSCC`, `MSCE` | Tipo da matriz enviada: `MSCC` (agregada mensal) ou `MSCE` (encerramento do exercício). |
| `classe_conta` | `integer` | `1`, `2`, `3`, `4` | Classe do Plano de Contas: utilizar **`1` (Ativo)** para Caixa e Bancos. |
| `id_tv` | `string` | `ending_balance`, `beginning_balance`, `period_change` | Tipo de valor: `ending_balance` (saldo final acumulado no encerramento do mês). |

---

## 4. Estrutura do Payload de Retorno

Cada item retornado na coleção `items` representa um detalhamento contábil no nível de conta PCASP estendida, órgão e fonte de recurso:

```json
{
  "tipo_matriz": "MSCC",
  "cod_ibge": 3304102,
  "classe_conta": 1,
  "conta_contabil": "111110200",
  "poder_orgao": "10131",
  "financeiro_permanente": 1,
  "ano_fonte_recursos": 1,
  "fonte_recursos": "1500",
  "exercicio": 2024,
  "mes_referencia": 12,
  "data_referencia": "2024-12-31T00:00:00Z",
  "entrada_msc": 580,
  "valor": 9791641.21,
  "natureza_conta": "D",
  "tipo_valor": "ending_balance"
}
```

### 4.1. Dicionário de Campos Críticos

* **`conta_contabil`:** Código da conta no PCASP estendido.
  * `11111.01.xx` — Caixa Geral (numerário em tesouraria).
  * `11111.02.xx` — Bancos Conta Movimento (contas-correntes bancárias ativas).
  * `11111.06.xx` ou `11111.50.xx` — Aplicações Financeiras de Liquidez Imediata.
* **`poder_orgao`:** Código numérico identificador da entidade/órgão contábil (ex: Prefeitura/Administração Direta, Fundo Municipal de Saúde, RPPS, Câmara Municipal).
* **`fonte_recursos`:** Código da destinação/fonte de recursos STN (ex: `1500` Recursos Ordinários Livres, `1540` FUNDEB, `1501` Ações e Serviços Públicos de Saúde).
* **`natureza_conta`:**
  * `"D"` (Devedora): Representa o saldo financeiro positivo e disponível.
  * `"C"` (Credora): Representa saldos credores momentâneos ou ajustes a regularizar.
* **`financeiro_permanente`:** Atributo F/P (`1` = Ativo Financeiro, `2` = Ativo Permanente). Para disponibilidade de caixa, filtrar apenas `financeiro_permanente = 1`.

---

## 5. Exemplos Práticos de Integração

### 5.1. Consulta via cURL
```bash
curl -s "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/msc_patrimonial?id_ente=3304102&an_referencia=2024&me_referencia=12&co_tipo_matriz=MSCC&classe_conta=1&id_tv=ending_balance" \
  -H "User-Agent: TransparenciaPublica/1.0"
```

### 5.2. Script em Python (Extração e Agregação do Caixa)
```python
import json
import urllib.request

def extrair_caixa_entidade(
    ibge: int, 
    ano: int, 
    mes: int, 
    poder_orgao: str | None = None
) -> dict[str, float]:
    """
    Extrai o saldo exato em caixa e bancos da MSC do SICONFI por fonte de recurso.
    """
    url = (
        f"https://apidatalake.tesouro.gov.br/ords/siconfi/tt/msc_patrimonial?"
        f"id_ente={ibge}&an_referencia={ano}&me_referencia={mes}&"
        f"co_tipo_matriz=MSCC&classe_conta=1&id_tv=ending_balance"
    )
    
    headers = {"User-Agent": "TransparenciaFiscal/1.0"}
    req = urllib.request.Request(url, headers=headers)
    
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    
    itens = data.get("items", [])
    
    # Filtra contas 1.1.1 (Caixa e Equivalentes de Caixa)
    caixa_itens = [
        item for item in itens
        if str(item.get("conta_contabil", "")).startswith("111")
        and item.get("financeiro_permanente") == 1
    ]
    
    if poder_orgao:
        caixa_itens = [i for i in caixa_itens if str(i.get("poder_orgao")) == str(poder_orgao)]
    
    saldos_por_fonte: dict[str, float] = {}
    for item in caixa_itens:
        fonte = item.get("fonte_recursos") or "sem_fonte"
        valor = float(item.get("valor", 0.0))
        # Ajusta pelo sinal da natureza da conta
        if item.get("natureza_conta") == "C":
            valor = -valor
        saldos_por_fonte[fonte] = saldos_por_fonte.get(fonte, 0.0) + valor
        
    return saldos_por_fonte

# Exemplo de execução para Porciúncula (Dezembro/2024):
# resultado = extrair_caixa_entidade(3304102, 2024, 12)
# print("Saldo total em caixa:", sum(resultado.values()))
```

---

## 6. Endpoints Complementares Relacionados

1. **`GET /extrato_entregas`:** Consulta o calendário e status das remessas entregues pelo município, permitindo verificar previamente se a declaração de determinado mês já foi homologada pela STN.
2. **`GET /msc_patrimonial` (`classe_conta=2`):** Permite extrair o Passivo Financeiro Circulante (Restos a Pagar Processados e Obrigações a Curto Prazo) para apuração da **Disponibilidade de Caixa Líquida**.
3. **`GET /msc_controle` (`classe_conta=8`):** Consulta as contas de controle da disponibilidade financeira por destinação de recursos (contas `8.2.1.1.1` e `8.2.1.1.2` do PCASP).
