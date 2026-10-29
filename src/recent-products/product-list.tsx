import { RecentProductLink } from "./recent-product-link";
import type { RecentProductItem } from "./recent-products";

/** Produtos of any Categoria, each opening its details. */
export function ProductList({
  items,
  showsCategory = true,
  opensInTestQueue = false,
}: {
  items: readonly RecentProductItem[];
  /** Off under a heading that already names the Categoria. */
  showsCategory?: boolean;
  /** The details open over the Fila de testes instead of over the Categoria table. */
  opensInTestQueue?: boolean;
}) {
  return (
    <ul className="-mx-3 flex flex-col">
      {items.map((item) => (
        <li key={`${item.category}/${item.product.id}`}>
          <RecentProductLink
            item={item}
            showsCategory={showsCategory}
            opensInTestQueue={opensInTestQueue}
          />
        </li>
      ))}
    </ul>
  );
}
