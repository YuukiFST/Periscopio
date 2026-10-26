import { Link } from "@tanstack/react-router";
import { categoryLabels } from "@/categories";
import { formatPrice, priceOf } from "@/product-table/cell-values";
import { ProductPhoto } from "@/product-photo/product-photo";
import type { RecentProductItem } from "./recent-products";

/** One recent Produto: its photo, name, Categoria and Preço, opening its details. */
export function RecentProductLink({
  item: { category, product },
  keepsTableSearch = false,
  onClick,
}: {
  item: RecentProductItem;
  /** Over its own Categoria's table, the details keep the table's search params like a row link does. */
  keepsTableSearch?: boolean;
  onClick?: () => void;
}) {
  const price = priceOf(product);
  return (
    <Link
      to="/$categoria/$id"
      params={{ categoria: category, id: product.id }}
      search={keepsTableSearch ? true : undefined}
      state={keepsTableSearch ? { fromCategoryTable: true } : undefined}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm hover:bg-component-hover focus-visible:bg-component-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-component-active"
    >
      <ProductPhoto key={product.image} src={product.image} alt="" size="row" loading="lazy" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{product.name}</span>
        <span className="text-fg-secondary">{categoryLabels[category]}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-fg-secondary">
        {price === undefined ? "Sem preço" : formatPrice(price)}
      </span>
    </Link>
  );
}
