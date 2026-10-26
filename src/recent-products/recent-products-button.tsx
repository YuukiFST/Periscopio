import { Popover } from "@base-ui/react/popover";
import { Link, useMatch } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useRef, useState } from "react";
import { categoryLabels, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import type { CategoryData, Product } from "@/data/schema";
import { useAllCategories } from "@/data/use-all-categories";
import { formatPrice, priceOf } from "@/product-table/cell-values";
import { ProductPhoto } from "@/product-photo/product-photo";
import { clearRecentProducts, useRecentProducts, type RecentProduct } from "./recent-products";

type RecentProductItem = { category: CategorySlug; product: Product };

/** The recorded Produtos the current data still has, in the recorded order. */
function recentProductItems(
  recent: readonly RecentProduct[],
  categories: readonly CategoryData[],
): RecentProductItem[] {
  const productsByCategory = new Map(
    categories.map(({ category, products }) => [
      category,
      new Map(products.map((product) => [product.id, product])),
    ]),
  );
  return recent.flatMap(({ category, id }): RecentProductItem[] => {
    const product = productsByCategory.get(category)?.get(id);
    return product ? [{ category, product }] : [];
  });
}

/**
 * The header's "Recentes" button, shown once a Produto has been opened, and
 * the list of the last Produtos opened in the panel, across Categorias.
 */
export function RecentProductsButton() {
  const recent = useRecentProducts();
  const tableCategory = useMatch({ from: "/$categoria", shouldThrow: false })?.params.categoria;
  const [isOpen, setIsOpen] = useState(false);
  const openedProduct = useRef(false);
  const [load, ensureLoaded] = useAllCategories();

  if (recent.length === 0) return null;
  const items = load.status === "loaded" ? recentProductItems(recent, load.categories) : [];

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) return;
        openedProduct.current = false;
        ensureLoaded();
      }}
    >
      <Popover.Trigger render={<Button variant="outline" size="lg" />}>
        <History aria-hidden="true" strokeWidth={1.5} />
        Recentes
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            // Opening a Produto leaves focus to its details, which move it to their title.
            finalFocus={() => !openedProduct.current}
            className="flex max-h-[min(var(--available-height),32rem)] w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-large transition-[opacity,scale] duration-150 ease-out-quint outline-none origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
          >
            <Popover.Title className="border-b border-border px-4 py-3 text-body-sm font-medium">
              Vistos recentemente
            </Popover.Title>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              {load.status === "failed" && (
                <p className="px-4 py-6 text-body-sm text-fg-secondary">
                  Não deu para carregar os produtos. Verifique a conexão e tente de novo.
                </p>
              )}
              {load.status === "loading" && (
                <p className="px-4 py-6 text-body-sm text-fg-secondary">Carregando produtos…</p>
              )}
              {load.status === "loaded" && items.length === 0 && (
                <p className="px-4 py-6 text-body-sm text-fg-secondary">
                  Os produtos vistos não estão mais nos dados.
                </p>
              )}
              {items.length > 0 && (
                <ul className="p-1">
                  {items.map(({ category, product }) => {
                    const price = priceOf(product);
                    return (
                      <li key={`${category}/${product.id}`}>
                        <Link
                          to="/$categoria/$id"
                          params={{ categoria: category, id: product.id }}
                          // Over its own Categoria's table, the details keep the table's search params like a row link does.
                          search={category === tableCategory ? true : undefined}
                          state={
                            category === tableCategory ? { fromCategoryTable: true } : undefined
                          }
                          onClick={() => {
                            openedProduct.current = true;
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm hover:bg-component-hover focus-visible:bg-component-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-component-active"
                        >
                          <ProductPhoto
                            key={product.image}
                            src={product.image}
                            alt=""
                            size="row"
                            loading="lazy"
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{product.name}</span>
                            <span className="text-fg-secondary">{categoryLabels[category]}</span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap tabular-nums text-fg-secondary">
                            {price === undefined ? "Sem preço" : formatPrice(price)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {/* Last, so opening the list focuses the newest Produto rather than the clearing. */}
            {load.status !== "loading" && (
              <div className="flex justify-end border-t border-border p-1.5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    // The button goes with the list; focus moves on to the page's title.
                    document.querySelector<HTMLElement>("main h1")?.focus();
                    setIsOpen(false);
                    clearRecentProducts();
                  }}
                >
                  Limpar histórico
                </Button>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
