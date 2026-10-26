import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { categoryLabels, type CategorySlug } from "@/categories";
import type { TableSearch } from "@/product-table/table-search";

type BackToTableLinkProps = {
  category: CategorySlug;
  /** The table's search; by default every search param of the current URL. */
  search?: TableSearch;
};

/**
 * Back to the Categoria table with every search param of the current URL,
 * whichever the table declares, so its Filtros and ordem come back as left.
 */
export function BackToTableLink({ category, search }: BackToTableLinkProps) {
  return (
    <Link
      to="/$categoria"
      params={{ categoria: category }}
      search={search ?? true}
      className="-ms-1 inline-flex min-h-8 items-center gap-1.5 self-start rounded-md px-1 font-medium text-fg-secondary hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-ring active:text-fg-primary pointer-coarse:min-h-11"
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      Voltar para {categoryLabels[category]}
    </Link>
  );
}
