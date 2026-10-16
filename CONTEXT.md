# EyeJoker PWA

App privado para um grupo de amigos consultar e comparar os benchmarks de monitores, teclados e mouses publicados pelo EyeJoker.

## Language

### Fonte e dados

**EyeJoker**:
O site eyejokerdb.com, única fonte dos produtos, medições e preços exibidos no app.
_Avoid_: site original, fonte, DB

**Categoria**:
Um dos três tipos de produto do app: monitor, teclado ou mouse.
_Avoid_: tipo, benchmark type, seção

**Produto**:
Um item testado ou listado pelo EyeJoker dentro de uma Categoria.
_Avoid_: item, modelo, linha

**Especificação**:
Um dado declarado do Produto, como peso, sensor, tamanho ou resolução.
_Avoid_: spec, característica

**Medição**:
Um número obtido em teste pelo EyeJoker, como tempo médio de clique ou brilho máximo.
_Avoid_: benchmark, resultado, score

**Resposta do clique**:
A Medição do tempo médio de clique de um mouse, em milissegundos.
_Avoid_: click latency, responsividade, Click Avg

**Status de teste**:
Se o Produto já foi testado pelo EyeJoker ou só está listado, aguardando teste.
_Avoid_: estado, review status

**Preço**:
O valor em won coreano (₩) que o EyeJoker registra para o Produto.
_Avoid_: valor, custo

**Atualização**:
A cópia semanal dos dados do EyeJoker para o app.
_Avoid_: sync, scrape, importação

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

**Link AliExpress**:
O único link de compra mostrado em um Produto, quando o EyeJoker tem um.
_Avoid_: link de afiliado, link de compra
