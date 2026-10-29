import { Popover } from "@base-ui/react/popover";
import { useMatch } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { useAllCategories } from "@/data/use-all-categories";
import { productCount } from "@/product-table/table-toolbar";
import { RecentProductLink } from "./recent-product-link";
import { clearRecentProducts, recentProductItems, useRecentProducts } from "./recent-products";

/** Lets a button outside the header, like the home page's, open the same list. */
export const recentProductsPopover = Popover.createHandle();

/**
 * The header's "Recentes" button, shown once a Produto has been opened, and
 * the list of the last Produtos opened in the panel, across Categorias.
 */
export function RecentProductsButton() {
  const recent = useRecentProducts();
  const tableCategory = useMatch({ from: "/$categoria", shouldThrow: false })?.params.categoria;
  const [isOpen, setIsOpen] = useState(false);
  // The history goes at once and for good, so the first press only asks.
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const openedProduct = useRef(false);
  // Set by the confirmed clearing, which waits for the list to finish closing.
  const clearsOnClose = useRef(false);
  const [load, ensureLoaded] = useAllCategories();
  const questionId = useId();
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  if (recent.length === 0) return null;
  const items = load.status === "loaded" ? recentProductItems(recent, load.categories) : [];

  return (
    <Popover.Root
      handle={recentProductsPopover}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setIsConfirmingClear(false);
        if (!open) return;
        openedProduct.current = false;
        ensureLoaded();
      }}
      // Clearing unmounts the button and the list with it, so it waits for the list's exit.
      onOpenChangeComplete={(open) => {
        if (open || !clearsOnClose.current) return;
        clearsOnClose.current = false;
        clearRecentProducts();
      }}
    >
      <Popover.Trigger
        render={
          <Button
            variant="tertiary"
            leadingIcon={History}
            className="max-sm:aspect-square max-sm:gap-0 max-sm:px-0"
          />
        }
      >
        {/* A phone keeps the icon only, so the header fits on the title's row. */}
        <span className="max-sm:sr-only">Recentes</span>
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
            // Clearing leaves it on the page's title, since the button goes with the history.
            finalFocus={() => !openedProduct.current && !clearsOnClose.current}
            className="flex max-h-[min(var(--available-height),32rem)] w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden rounded-2xl border border-transparent bg-popover text-popover-foreground shadow-surface-5 transition-[opacity,scale] duration-150 ease-out-quint outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
          >
            <Popover.Title className="border-b border-border px-5 py-3 text-subtitle font-medium">
              Vistos recentemente
            </Popover.Title>
            {/* The fade shows only on a side with more Produtos past the edge. */}
            <div className="min-h-0 scroll-fade-y overflow-y-auto overscroll-contain">
              {/* Mounted all along, so a screen reader hears the loading end either way. */}
              <div role="status" className="empty:sr-only">
                {load.status === "failed" && (
                  <p className="px-5 pt-6 pb-3 text-body text-muted-foreground">
                    Não deu para carregar os produtos. Verifique a conexão e tente de novo.
                  </p>
                )}
                {load.status === "loading" && (
                  <p className="px-5 py-6 text-body text-muted-foreground">Carregando produtos…</p>
                )}
                {load.status === "loaded" && items.length === 0 && (
                  <p className="px-5 py-6 text-body text-muted-foreground">
                    Os produtos que você viu não estão mais nos dados. Os próximos que você abrir
                    aparecem aqui.
                  </p>
                )}
              </div>
              {load.status === "failed" && (
                <div className="px-5 pb-6">
                  <Button variant="tertiary" onClick={ensureLoaded}>
                    Tentar de novo
                  </Button>
                </div>
              )}
              {items.length > 0 && (
                <ul className="p-2">
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
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-2">
                {isConfirmingClear ? (
                  <>
                    {/* On its own line, so a phone keeps the question whole above its buttons. */}
                    <p id={questionId} className="basis-full ps-3 text-body text-muted-foreground">
                      Limpar o histórico de {productCount(recent.length)}? Não dá para desfazer.
                    </p>
                    <Button
                      // The keyboard lands on the safe answer, so a repeated Enter keeps the history.
                      autoFocus
                      variant="ghost"
                      aria-describedby={questionId}
                      onClick={() => {
                        // Cancelar leaves with the question; the keyboard goes back to the button that asked it.
                        flushSync(() => setIsConfirmingClear(false));
                        clearButtonRef.current?.focus();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      aria-describedby={questionId}
                      onClick={() => {
                        // The button goes with the list; focus moves on to the page's title.
                        document.querySelector<HTMLElement>("main h1")?.focus();
                        clearsOnClose.current = true;
                        setIsOpen(false);
                      }}
                    >
                      Limpar histórico
                    </Button>
                  </>
                ) : (
                  <Button
                    ref={clearButtonRef}
                    variant="ghost"
                    onClick={() => setIsConfirmingClear(true)}
                  >
                    Limpar histórico
                  </Button>
                )}
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
