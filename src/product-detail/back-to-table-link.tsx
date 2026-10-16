import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { categoryLabels, type CategorySlug } from "@/categories";

/**
 * Back to the Categoria table with every search param of the current URL,
 * whichever the table declares, so its Filtros and ordem come back as left.
 */
export function BackToTableLink({ category }: { category: CategorySlug }) {
  return (
    <Link
      to="/$categoria"
      params={{ categoria: category }}
      search={true}
      className="-ms-1 inline-flex min-h-8 touch-manipulation items-center gap-1.5 self-start rounded-md px-1 font-medium text-fg-secondary hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      Voltar para {categoryLabels[category]}
    </Link>
  );
}
