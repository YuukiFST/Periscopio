import type { RegisteredRouter, RouteById } from "@tanstack/react-router";

/** The Categoria table's search params: its Filtros, Status de teste, busca, ordem and columns. */
export type TableSearch = RouteById<
  RegisteredRouter["routeTree"],
  "/$categoria"
>["types"]["fullSearchSchema"];
