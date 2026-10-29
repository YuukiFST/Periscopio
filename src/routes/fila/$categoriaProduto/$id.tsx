import { createFileRoute, notFound } from "@tanstack/react-router";
import { isCategorySlug } from "@/categories";

/**
 * A Produto of the Fila de testes, named in the URL. The Fila draws it in its
 * side panel (`TestQueueProductPanel`), which stays mounted to slide out after
 * this route is left; the Fila's Categoria filter passes through untouched.
 * Not `$categoria`: the app shell reads that param as the Categoria on screen.
 */
export const Route = createFileRoute("/fila/$categoriaProduto/$id")({
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoriaProduto)) throw notFound();
  },
  component: () => null,
});
