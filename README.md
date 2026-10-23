# EyeJoker PWA

Consultar e comparar, em português, os benchmarks de monitores, teclados e mouses do [EyeJoker](https://eyejokerdb.com/ko), num app instalável que funciona offline.

## Comandos

- `pnpm install` instala as dependências (Node 24, pnpm via Corepack).
- `pnpm dev` abre o app em modo de desenvolvimento.
- `pnpm build` gera o site estático em `dist/`; `pnpm preview` o serve com os mesmos cabeçalhos da Vercel.
- `pnpm test` roda Vitest e Playwright; `pnpm exec playwright install chromium` antes da primeira vez.
- O Playwright testa o build de produção com dados que o pipeline gera do recorte gravado do EyeJoker (`tests/e2e/serve-fixture-build.ts`, saída em `dist-e2e/`), não com `public/data`.
- O mesmo servidor faz um segundo build com a próxima Atualização (`meta.json` uma semana depois) e serve os dois builds na mesma origem, na porta `E2E_PORT` + 1000, para o teste de atualização trocar de um deploy para o outro (`tests/e2e/release-server.ts`); o build seguinte fica na porta `E2E_PORT` + 2000.
- `pnpm exec playwright test --update-snapshots` regenera os snapshots de acessibilidade.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`.

## Instalável e offline

- `vite-plugin-pwa` gera o service worker (`sw.js`) no build: o app e `data/*.json` entram no precache no primeiro acesso, e as fotos em `/images/` ficam em cache quando aparecem pela primeira vez (até 2000).
- Cada deploy instala o novo service worker sozinho, e o app aberto recarrega uma vez com os dados novos.
- Os ícones PNG saem de `public/favicon.svg`: depois de mudar o SVG, `node scripts/render-app-icons.ts` os regera.

## Atualização dos dados

- `pnpm update-data` busca no EyeJoker os Produtos das três Categorias e `/api/company`, valida, normaliza e grava `public/data/{mouse,teclado,monitor}.json`, `public/data/meta.json` e as fotos novas em `public/images/<uuid>.avif`, apagando as que nenhum Produto usa.
- A Atualização é recusada, sem mudar nenhum arquivo e com saída de erro, se o EyeJoker falhar 3 vezes seguidas, mudar o formato, citar um fabricante fora de `/api/company`, se uma Categoria cair abaixo de 90% dos Produtos publicados antes, se mais de 10% dos Produtos com foto de uma Categoria vierem com endereço que não é `/<uuid>.avif` ou se mais de 10% dos Produtos publicados com foto que continuam na Categoria ficarem sem foto; foto que falha só fica nula.
- Variáveis de ambiente: `EYEJOKER_API_URL` (padrão `https://eyejokerdb.com`), `EYEJOKER_CDN_URL` (padrão `https://cdn.eyejokerdb.com`), `EYEJOKER_OUT_DIR` (padrão `public/`) e `GITHUB_STEP_SUMMARY` (o resumo vai para a saída padrão quando ela não existe).
- A Atualização também grava em `meta.json` a Cotação KRW→BRL (`krwBrl: { rate, date, source }`) do Banco Central Europeu, pela API pública e sem chave do [Frankfurter](https://frankfurter.dev) (`/v2/providers/ECB/rate/KRW/BRL`); o app mostra "≈ R$" abaixo do Preço em won. Se a Cotação falhar, a publicada antes continua em `meta.json`, o resumo avisa e a Atualização segue; sem nenhuma Cotação, o app mostra só o won. `FRANKFURTER_API_URL` (padrão `https://api.frankfurter.dev`) troca o endereço.
- O resumo lista cada chave sem tradução pt (`campo:`, `unidade:`, `valor:`); a tabela fica em `src/i18n/`.
- O workflow `.github/workflows/update-data.yml` roda toda segunda às 09:00 UTC (e à mão por `workflow_dispatch`), commita em `main` só se algo mudou e chama o Deploy Hook do segredo `VERCEL_DEPLOY_HOOK_URL`.
- `pnpm exec vitest run tests/pipeline -u` regenera os dourados do pipeline em `tests/pipeline/golden/`; `node tests/pipeline/record-eyejoker-excerpt.ts` regrava o recorte do EyeJoker em `tests/pipeline/fixtures/`.
