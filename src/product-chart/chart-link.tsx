import { Link } from "@tanstack/react-router";
import { ChartScatter } from "lucide-react";
import type { CategorySlug } from "@/categories";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Ver gráfico" with every search param of the table, so the Gráfico shows the same Produtos. */
export function ChartLink({ category }: { category: CategorySlug }) {
  return (
    <Link
      to="/grafico/$categoria"
      params={{ categoria: category }}
      search={true}
      className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
    >
      <ChartScatter aria-hidden="true" strokeWidth={1.5} />
      Ver gráfico
    </Link>
  );
}
