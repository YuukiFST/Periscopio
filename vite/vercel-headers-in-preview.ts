import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

type VercelHeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

/**
 * Applies the `headers` rules of `vercel.json` to `vite preview`, so the
 * production build is served locally with the same headers Vercel sends.
 * Supports the `/(.*)`-style sources this project uses.
 */
export function vercelHeadersInPreview(): Plugin {
  const vercelConfig: { headers: VercelHeaderRule[] } = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  const rules = vercelConfig.headers.map((rule) => ({
    pattern: new RegExp(`^${rule.source}$`),
    headers: rule.headers,
  }));

  return {
    name: "vercel-headers-in-preview",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? "/", "http://preview").pathname;
        for (const rule of rules) {
          if (!rule.pattern.test(path)) continue;
          for (const header of rule.headers) response.setHeader(header.key, header.value);
        }
        next();
      });
    },
  };
}
