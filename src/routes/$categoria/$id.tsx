import { createFileRoute } from "@tanstack/react-router";

/**
 * A Produto's details, named in the URL. The Categoria layout draws them in
 * its side panel (`ProductSidebar`), which stays mounted to slide out after
 * this route is left; the table's search params pass through untouched.
 */
export const Route = createFileRoute("/$categoria/$id")({
  component: () => null,
});
