# Glossário do Cidadão

Tradução de termos da administração pública para o texto exibido no portal. Usado pelo agente `editor-cidadao`. A coluna "Evitar" lista formulações enganosas. Valores e limites legais **não** ficam aqui: vêm de `seed_constantes_fiscais.csv`.

| Termo técnico | Texto ao cidadão | Evitar |
|---|---|---|
| Empenho | Valor reservado para uma despesa | "Gasto" |
| Liquidação | Serviço ou produto entregue e conferido | |
| Pagamento | Valor efetivamente pago | |
| Dotação orçamentária | Verba prevista para uma finalidade neste ano | "Dinheiro disponível" |
| Dotação atualizada | Verba prevista, já com os ajustes feitos no ano | |
| Restos a pagar | Contas de anos anteriores que ainda estão sendo pagas | "Dívida" sem contexto |
| Restos a pagar processados | Já entregues e conferidos: o fornecedor cumpriu a sua parte e falta o pagamento | "Direito adquirido do credor" |
| Restos a pagar não processados | Ainda em andamento: depende de conferência antes do pagamento | "Pendente de liquidação" |
| LOA (Lei Orçamentária Anual) | Lei que diz quanto a prefeitura pode gastar e quanto espera arrecadar no ano | "Orçamento fixo" |
| FPM | Repasse do governo federal aos municípios | |
| ICMS (cota-parte) | Parte do imposto estadual sobre vendas que o estado repassa ao município | |
| Receita extra-orçamentária | Dinheiro que passa pelo caixa da prefeitura, mas não faz parte do orçamento (retenções e caixas) | "Receita própria" |
| Emenda Pix | Transferência especial de deputado ou senador direto ao município, sem destino fixado | |
| Empenho | Valor reservado para um gasto | "Gasto" sem qualificação |
| Receita Corrente Líquida (RCL) | Receita do município nos últimos 12 meses, usada como base para limites da lei | |
| Limite prudencial | Nível de alerta em que a lei já impede novos aumentos de despesa com pessoal | |
| Dispensa de licitação | Compra feita sem concorrência, nos casos que a lei permite | "Compra irregular" |
| Fracionamento | Dividir uma compra em partes para ficar abaixo do limite que exige licitação | "Fraude" |
| Potencial alerta de fracionamento | Compras parecidas e frequentes que merecem conferência no processo | "Irregularidade" |
| Aditivo contratual | Mudança em um contrato já assinado (prazo ou valor) | |
| RPPS / CAPREM | Fundo de aposentadoria dos servidores do município | |
| Dívida ativa | Valores que pessoas e empresas devem ao município | |
| Transferência constitucional | Parte de impostos federais e estaduais que a lei manda repassar ao município | "Ajuda" |
| Emenda parlamentar | Verba indicada por deputado ou senador para uma obra ou serviço local | |
| Parecer / acórdão | Decisão ou opinião formal de órgão de controle (ex.: Tribunal de Contas) | |
| Sem registro de estoque informado | "Não aparece na lista de estoque": ausência na última lista oficial, não prova de falta | "Esgotado", "zerado" |
| Combinação em dose fixa | Remédio misturado com outro no mesmo comprimido | |
| Unidade ativa (farmácia SUS) | Posto ou unidade de saúde que enviou a lista de estoque recentemente | |
| Posição de estoque | A lista de estoque de um dia específico | |
| SUS (Sistema Único de Saúde) | A rede pública e gratuita de saúde do país: postos, hospitais e farmácias mantidos com dinheiro público | |
| Lote (de remédio) | Remessa de um mesmo remédio com a mesma data de validade | "Lote irregular", "lote vencido" sem dizer que consta com saldo na lista |
| Remédio só com lote vencido | "Na lista de estoque, todos os lotes dele estão com a validade vencida" | "Remédio vencido", "sem estoque", "irregular" |
| IDEB | Nota de 0 a 10 que o governo federal dá às escolas, combinando o que os alunos aprendem nas provas e quantos são aprovados. É medida de dois em dois anos | "Ciclo oficial", "troféu cívico" |

## Como acrescentar um termo
1. Definir o texto ao cidadão em até uma frase, sem sigla não explicada.
2. Listar a formulação enganosa a evitar.
3. Se o termo envolve limite legal, referenciar a chave em `seed_constantes_fiscais.csv`; não copiar o valor.
