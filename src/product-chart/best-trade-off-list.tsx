import { Link } from "@tanstack/react-router";
import { useId } from "react";
import type { CategorySlug } from "@/categories";
import { ProductPhoto } from "@/product-photo/product-photo";
import type { TableSearch } from "@/product-table/table-search";
import { axisValueText, type ChartAxis } from "./chart-axes";
import type { ChartPoint } from "./chart-points";

type BestTradeOffListProps = {
  category: CategorySlug;
  bestTradeOffs: readonly ChartPoint[];
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  tableSearch: TableSearch;
  /** The Produto under the pointer or the focus, marked on the plot too. */
  onEmphasize: (productId: string | undefined) => void;
};

/**
 * The Melhores relações by name, in the order the line joins them, each
 * opening its detail; pointing at one marks its dot on the plot.
 */
export function BestTradeOffList({
  category,
  bestTradeOffs,
  xAxis,
  yAxis,
  tableSearch,
  onEmphasize,
}: BestTradeOffListProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-title font-medium">
        Melhores relações
      </h3>
      <ul className="-mx-3 grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        {bestTradeOffs.map((point) => (
          <li key={point.product.id} className="min-w-0">
            <Link
              to="/$categoria/$id"
              params={{ categoria: category, id: point.product.id }}
              search={tableSearch}
              onPointerEnter={() => onEmphasize(point.product.id)}
              onPointerLeave={() => onEmphasize(undefined)}
              onFocus={() => onEmphasize(point.product.id)}
              onBlur={() => onEmphasize(undefined)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-hover focus-visible:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-active"
            >
              <ProductPhoto
                key={point.product.image}
                src={point.product.image}
                alt=""
                size="row"
                loading="lazy"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium wrap-anywhere">{point.product.name}</span>
                <span className="text-muted-foreground tabular-nums group-active:text-foreground">
                  {axisValueText(xAxis, point.product)}
                  <span aria-hidden="true"> · </span>
                  <span className="sr-only">, </span>
                  {axisValueText(yAxis, point.product)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
