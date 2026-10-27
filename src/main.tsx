// Inter with its optical-size axis: Fluid Functionalism animates weight with opsz, so a label
// gets bolder without getting wider.
import "@fontsource-variable/inter/opsz.css";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { LucideProvider } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { FluidProvider } from "@/lib/fluid-provider";
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
    {/* Icons keep the stroke of the medium-weight text beside them at every size; lucide's own
        stroke thins as an icon shrinks. Icons by regular text set 1.5 themselves. */}
    <LucideProvider strokeWidth={2} nonScalingStroke>
      <FluidProvider>
        <RouterProvider router={router} />
      </FluidProvider>
    </LucideProvider>
  </StrictMode>,
);

// A new deploy (each Atualização) installs in the background and reloads the open app once.
registerSW({ immediate: true });
