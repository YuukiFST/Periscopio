import { Link } from "@tanstack/react-router";
import { ChartScatter } from "lucide-react";
import type { CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";

/** "Ver gráfico" with every search param of the table, so the Gráfico shows the same Produtos. */
export function ChartLink({ category }: { category: CategorySlug }) {
  return (
    <Button
      variant="tertiary"
      leadingIcon={ChartScatter}
      render={<Link to="/grafico/$categoria" params={{ categoria: category }} search={true} />}
      // A phone keeps the icon only, so the view actions fit on the count's row.
      className="max-sm:aspect-square max-sm:gap-0 max-sm:px-0"
    >
      <span className="max-sm:sr-only">Ver gráfico</span>
    </Button>
  );
}
