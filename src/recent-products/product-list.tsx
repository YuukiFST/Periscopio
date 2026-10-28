import { RecentProductLink } from "./recent-product-link";
import type { RecentProductItem } from "./recent-products";

/** Produtos of any Categoria, each opening its details. */
export function ProductList({ items }: { items: readonly RecentProductItem[] }) {
  return (
    <ul className="-mx-3 flex flex-col">
      {items.map((item) => (
        <li key={`${item.category}/${item.product.id}`}>
          <RecentProductLink item={item} />
        </li>
      ))}
    </ul>
  );
}
