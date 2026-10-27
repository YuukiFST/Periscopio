import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { vercelHeadersInPreview } from "./vite/vercel-headers-in-preview.ts";

/** Light page color, `--surface-1` in `src/styles.css`. */
const pageColorLight = "#fafafa";

export default defineConfig({
  // The E2E build swaps in data the pipeline generated from the recorded excerpt.
  publicDir: process.env.EYEJOKER_PUBLIC_DIR || "public",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Periscópio",
        short_name: "Periscópio",
        description: "Benchmarks de mouses, teclados e monitores do EyeJoker, em português.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // The manifest holds one color; index.html sets theme-color from the chosen or system theme.
        theme_color: pageColorLight,
        background_color: pageColorLight,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // The app shell plus the data, so the last Atualização opens offline;
        // the plugin adds the manifest and its icons itself.
        globPatterns: ["**/*.{js,css,html,json,woff2}"],
        // Photos (~1500 files, ~90 MB) are cached only once seen, below; so is the
        // Histórico de preço, which only a detail reads.
        globIgnores: ["images/**", "data/precos/**"],
        // mouse.json is ~1 MB and grows; the 2 MiB default would drop it silently.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // A photo is named by its UUID and never changes content.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/images/"),
            handler: "CacheFirst",
            options: {
              cacheName: "photos",
              expiration: { maxEntries: 2000 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Fresh after an Atualização online; the last one seen offline.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/data/precos/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "price-history",
              // A slow connection falls back to the copy seen before instead of waiting.
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
    vercelHeadersInPreview(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
