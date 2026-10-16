# EyeJoker PWA

Consultar e comparar, em português, os benchmarks de monitores, teclados e mouses do [EyeJoker](https://eyejokerdb.com/ko), num app instalável que funciona offline.

## Comandos

- `pnpm install` instala as dependências (Node 24, pnpm via Corepack).
- `pnpm dev` abre o app em modo de desenvolvimento.
- `pnpm build` gera o site estático em `dist/`; `pnpm preview` o serve com os mesmos cabeçalhos da Vercel.
- `pnpm test` roda Vitest e Playwright; `pnpm exec playwright install chromium` antes da primeira vez.
- `pnpm exec playwright test --update-snapshots` regenera os snapshots de acessibilidade.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`.
