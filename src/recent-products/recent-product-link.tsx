import { Link } from "@tanstack/react-router";
import { categoryLabels } from "@/categories";
import { manufacturerName } from "@/i18n/labels";
import { formatPrice, priceOf } from "@/product-table/cell-values";
import { ProductPhoto } from "@/product-photo/product-photo";
import { queuedProductAttribute } from "@/test-queue/test-queue-panel";
import type { RecentProductItem } from "./recent-products";

/** One recent Produto: its photo, name, manufacturer, Categoria and Preço, opening its details. */
export function RecentProductLink({
  item: { category, product },
  keepsTableSearch = false,
  showsCategory = true,
  opensInTestQueue = false,
  onClick,
}: {
  item: RecentProductItem;
  /** Off under a heading that already names the Categoria: the row shrinks to one line. */
  showsCategory?: boolean;
  /** The details open over the Fila de testes, which keeps its Categoria filter, not over the table. */
  opensInTestQueue?: boolean;
  /** Over its own Categoria's table, the details keep the table's search params like a row link does. */
  keepsTableSearch?: boolean;
  onClick?: () => void;
}) {
  const price = priceOf(product);
  // Pressed, the quieter text turns full strength: bg-active over a popover is too close to it.
  const className = `group flex gap-3 rounded-lg px-3 text-body select-none ${showsCategory ? "items-start py-2" : "items-center py-1.5"} hover:bg-hover focus-visible:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-active`;
  const content = (
    <>
      <ProductPhoto
        key={product.image}
        src={product.image}
        alt=""
        size={showsCategory ? "row" : "compactRow"}
        loading="lazy"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        {/* Whole: names that differ only at the end, like PG32UCDM and PG32UCDP, stay apart. */}
        <span className="font-medium wrap-anywhere">{product.name}</span>
        {showsCategory && (
          // The manufacturer tells apart Produtos with the same name, like the two X7 mouses.
          <span className="text-muted-foreground group-active:text-foreground">
            {manufacturerName(product.manufacturer)} · {categoryLabels[category]}
          </span>
        )}
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground group-active:text-foreground">
        {price === undefined ? "Sem preço" : formatPrice(price)}
      </span>
    </>
  );
  if (opensInTestQueue) {
    return (
      <Link
        to="/fila/$categoriaProduto/$id"
        params={{ categoriaProduto: category, id: product.id }}
        search={true}
        data-produto={queuedProductAttribute({ category, id: product.id })}
        onClick={onClick}
        // The Produto open in the panel stays marked in its list.
        className={`${className} data-[status=active]:bg-active`}
      >
        {content}
      </Link>
    );
  }
  return (
    <Link
      to="/$categoria/$id"
      params={{ categoria: category, id: product.id }}
      search={keepsTableSearch ? true : undefined}
      state={keepsTableSearch ? { fromCategoryTable: true } : undefined}
      onClick={onClick}
      className={className}
    >
      {content}
    </Link>
  );
}
