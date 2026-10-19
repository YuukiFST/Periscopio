import "@fontsource-variable/inter";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { routeTree } from "./routeTree.gen";
import { parseFlatSearch, stringifyFlatSearch } from "./search-params";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  parseSearch: parseFlatSearch,
  stringifySearch: stringifyFlatSearch,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    /** The entry below this detail entry is the Categoria's table. */
    fromCategoryTable?: boolean;
  }
}

const appElement = document.getElementById("app");
if (!appElement) throw new Error("index.html is missing the #app element");

createRoot(appElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// A new deploy (each Atualização) installs in the background and reloads the open app once.
registerSW({ immediate: true });
