import "@fontsource-variable/inter";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const appElement = document.getElementById("app");
if (!appElement) throw new Error("index.html is missing the #app element");

createRoot(appElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
