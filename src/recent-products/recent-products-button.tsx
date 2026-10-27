import { Popover } from "@base-ui/react/popover";
import { useMatch } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAllCategories } from "@/data/use-all-categories";
import { RecentProductLink } from "./recent-product-link";
import { clearRecentProducts, recentProductItems, useRecentProducts } from "./recent-products";

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
            className="flex max-h-[min(var(--available-height),32rem)] w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-surface-5 transition-[opacity,scale] duration-150 ease-out-quint outline-none origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
          >
            <Popover.Title className="border-b border-border px-4 py-3 text-body font-medium">
              Vistos recentemente
            </Popover.Title>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              {load.status === "failed" && (
                <p className="px-4 py-6 text-body text-muted-foreground">
                  Não deu para carregar os produtos. Verifique a conexão e tente de novo.
                </p>
              )}
              {load.status === "loading" && (
                <p className="px-4 py-6 text-body text-muted-foreground">Carregando produtos…</p>
              )}
              {load.status === "loaded" && items.length === 0 && (
                <p className="px-4 py-6 text-body text-muted-foreground">
                  Os produtos vistos não estão mais nos dados.
                </p>
              )}
              {items.length > 0 && (
                <ul className="p-1">
                  {items.map((item) => (
                    <li key={`${item.category}/${item.product.id}`}>
                      <RecentProductLink
                        item={item}
                        keepsTableSearch={item.category === tableCategory}
                        onClick={() => {
                          openedProduct.current = true;
                          setIsOpen(false);
                        }}
                      />
                    </li>
                  ))}
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
