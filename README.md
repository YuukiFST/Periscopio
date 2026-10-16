# EyeJoker PWA

Consultar e comparar, em português, os benchmarks de monitores, teclados e mouses do [EyeJoker](https://eyejokerdb.com/ko), num app instalável que funciona offline.

## Comandos

- `pnpm install` instala as dependências (Node 24, pnpm via Corepack).
- `pnpm dev` abre o app em modo de desenvolvimento.
- `pnpm build` gera o site estático em `dist/`; `pnpm preview` o serve com os mesmos cabeçalhos da Vercel.
- `pnpm test` roda Vitest e Playwright; `pnpm exec playwright install chromium` antes da primeira vez.
- O Playwright testa o build de produção com dados que o pipeline gera do recorte gravado do EyeJoker (`tests/e2e/serve-fixture-build.ts`, saída em `dist-e2e/`), não com `public/data`.
- `pnpm exec playwright test --update-snapshots` regenera os snapshots de acessibilidade.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`.

## Atualização dos dados

- `pnpm update-data` busca no EyeJoker os Produtos das três Categorias e `/api/company`, valida, normaliza e grava `public/data/{mouse,teclado,monitor}.json`, `public/data/meta.json` e as fotos novas em `public/images/<uuid>.avif`, apagando as que nenhum Produto usa.
- A Atualização é recusada, sem mudar nenhum arquivo e com saída de erro, se o EyeJoker falhar 3 vezes seguidas, mudar o formato, citar um fabricante fora de `/api/company` ou se uma Categoria cair abaixo de 90% dos Produtos publicados antes; foto que falha só fica nula.
- Variáveis de ambiente: `EYEJOKER_API_URL` (padrão `https://eyejokerdb.com`), `EYEJOKER_CDN_URL` (padrão `https://cdn.eyejokerdb.com`), `EYEJOKER_OUT_DIR` (padrão `public/`) e `GITHUB_STEP_SUMMARY` (o resumo vai para a saída padrão quando ela não existe).
- O resumo lista cada chave sem tradução pt (`campo:`, `unidade:`, `valor:`); a tabela fica em `src/i18n/`.
- O workflow `.github/workflows/update-data.yml` roda toda segunda às 09:00 UTC (e à mão por `workflow_dispatch`), commita em `main` só se algo mudou e chama o Deploy Hook do segredo `VERCEL_DEPLOY_HOOK_URL`.
- `pnpm exec vitest run tests/pipeline -u` regenera os dourados do pipeline em `tests/pipeline/golden/`; `node tests/pipeline/record-eyejoker-excerpt.ts` regrava o recorte do EyeJoker em `tests/pipeline/fixtures/`.
