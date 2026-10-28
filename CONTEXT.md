# Periscópio

App privado para um grupo de amigos consultar e comparar os benchmarks de monitores, teclados e mouses publicados pela Fonte.

## Language

### Fonte e dados

**Fonte**:
O site de benchmarks de onde vêm todos os produtos, medições e preços exibidos no app.
_Avoid_: site original, DB

**Categoria**:
Um dos três tipos de produto do app: monitor, teclado ou mouse.
_Avoid_: tipo, benchmark type, seção

**Produto**:
Um item testado ou listado pela Fonte dentro de uma Categoria.
_Avoid_: item, modelo, linha

**Especificação**:
Um dado declarado do Produto, como peso, sensor, tamanho ou resolução.
_Avoid_: spec, característica

**Medição**:
Um número obtido em teste pela Fonte, como tempo médio de clique ou brilho máximo.
_Avoid_: benchmark, resultado, score

**Resposta do clique**:
A Medição do tempo médio de clique de um mouse, em milissegundos.
_Avoid_: click latency, responsividade, Click Avg

**Status de teste**:
Se o Produto já foi testado pela Fonte ou só está listado, aguardando teste.
_Avoid_: estado, review status

**Preço**:
O valor em won coreano (₩) que a Fonte registra para o Produto.
_Avoid_: valor, custo

**Atualização**:
A cópia semanal dos dados da Fonte para o app.
_Avoid_: sync, scrape, importação

**Cotação**:
Quantos reais valia um won no dia de referência, segundo o Banco Central Europeu (via Frankfurter), registrada a cada Atualização para mostrar o Preço aproximado em reais.
_Avoid_: câmbio, taxa, conversão

**Histórico de preço**:
Os Preços de um Produto nas Atualizações em que mudaram, até 52, mostrados no detalhe do Produto.
_Avoid_: histórico de valores, evolução, price history

### Uso

**Filtro**:
Uma restrição que o usuário aplica para reduzir a lista de Produtos de uma Categoria.
_Avoid_: busca, query

**Comparação**:
A visão lado a lado de dois a quatro Produtos da mesma Categoria.
_Avoid_: comparativo, versus, compare

**Destaque**:
A marca visual, dentro de uma Comparação, do Produto que se sai melhor em uma Medição ou Especificação.
_Avoid_: vencedor, winner, highlight

**Empate**:
A marca visual, dentro de uma Comparação, de uma Medição ou Especificação com um lado melhor em que todos os Produtos com o dado mostram o mesmo valor.
Um empate só no melhor valor, com outro Produto atrás, é Destaque dos empatados.
_Avoid_: igual, tie

**Resumo de desempenho**:
As primeiras linhas da Comparação de mouses: a resposta mais rápida de clique e sensor de cada Produto e uma pontuação de 0 a 100 que os ordena.
Conta qualquer conexão, ou só a escolhida (com fio ou sem fio); só entra na ordem o Produto com todas as medições que algum Produto comparado tem.
_Avoid_: ranking, score, nota de desempenho

**Link AliExpress**:
O único link de compra mostrado em um Produto, quando a Fonte tem um.
_Avoid_: link de afiliado, link de compra

**Novidade**:
Um Produto publicado pela primeira vez (Novo) ou que passou a ser testado (Testado agora) em uma Atualização dos 14 dias antes da mais recente.
_Avoid_: novo produto, lançamento, changelog

**Gráfico**:
A visão dos Produtos de uma Categoria, filtrados como na tabela, como pontos sobre duas colunas numéricas escolhidas.
_Avoid_: scatter, dispersão, plot

**Melhor relação**:
Um Produto do Gráfico sem outro ao menos tão bom nos dois eixos e melhor em um, pelo lado melhor de cada coluna.
_Avoid_: fronteira de Pareto, custo-benefício, trade-off

**Favorito**:
Um Produto que o usuário marcou com a estrela, guardado neste aparelho para a Categoria e mostrado sozinho pelo "Só favoritos" da tabela.
_Avoid_: favorite, salvo, lista
