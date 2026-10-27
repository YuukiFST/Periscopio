import { useMatch, useNavigate, useSearch } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { CategoryData } from "@/data/schema";
import { comparedIdsFromParam } from "@/product-compare/compare-selection";
import { recordRecentProduct } from "@/recent-products/recent-products";
import { ProductDetail } from "./product-detail";
import { ProductNotFound } from "./product-not-found";
import { useChangeComparedIds } from "./use-change-compared-ids";

/** Where the panel stops covering the whole screen (Tailwind's `sm`). */
const besideTableQuery = "(min-width: 40rem)";

/** Where keyboard focus goes back to the table: the Produto's row, else the Categoria's title. */
function tableFocusTarget(productId: string | undefined): HTMLElement | null {
  const row =
    productId === undefined
      ? null
      : document.querySelector<HTMLElement>(`tr[data-row-id="${productId}"] a[href]`);
  return row ?? document.getElementById("categoria-titulo");
}

/**
 * The open Produto's details in a panel on the right, over the table. It is not
 * modal: the table stays usable, and another Produto clicked there takes the panel.
 * On a phone the panel covers the table, so the keyboard stays inside it.
 * Keyed by Categoria: a new one starts closed, not sliding out a Produto it lacks.
 */
export function ProductSidebar({ data }: { data: CategoryData }) {
  const openId = useMatch({ from: "/$categoria/$id", shouldThrow: false })?.params.id;
  // The last Produto stays drawn while the panel slides out.
  const [shownId, setShownId] = useState(openId);
  if (openId !== undefined && openId !== shownId) setShownId(openId);

  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const changeComparedIds = useChangeComparedIds(data.category);
  const popupRef = useRef<HTMLDivElement>(null);
  const productIds = useMemo(
    () => new Set(data.products.map((product) => product.id)),
    [data.products],
  );
  const comparedIds = comparedIdsFromParam(search.cmp, productIds);
  const product = data.products.find((candidate) => candidate.id === shownId);
  useEffect(() => {
    if (openId !== undefined && productIds.has(openId)) recordRecentProduct(data.category, openId);
  }, [openId, productIds, data.category]);
  const [isBesideTable, setIsBesideTable] = useState(
    () => window.matchMedia(besideTableQuery).matches,
  );
  useEffect(() => {
    const besideTable = window.matchMedia(besideTableQuery);
    const update = () => setIsBesideTable(besideTable.matches);
    besideTable.addEventListener("change", update);
    return () => besideTable.removeEventListener("change", update);
  }, []);

  function close() {
    // Replaces the entry: the table comes back with the search the panel left it.
    void navigate({
      to: "/$categoria",
      params: { categoria: data.category },
      search: true,
      replace: true,
    });
  }

  return (
    <Drawer
      open={openId !== undefined}
      onOpenChange={(open, eventDetails) => {
        // Base UI hears Escape on the whole page; the table's search box and the Filtros drawer
        // keep their own Escape while the panel is open.
        const target = eventDetails.event.target;
        if (
          eventDetails.reason === "escape-key" &&
          target instanceof Element &&
          target !== document.body &&
          !popupRef.current?.contains(target)
        ) {
          eventDetails.cancel();
          return;
        }
        if (!open) close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setShownId(undefined);
      }}
      swipeDirection="right"
      modal={isBesideTable ? false : "trap-focus"}
      // A click on the table picks another Produto instead of closing the panel.
      disablePointerDismissal
    >
      {/* The details move focus to their title themselves, on every Produto they show;
          closing hands it back to the Produto's row while the table still shows it. */}
      <DrawerContent
        ref={popupRef}
        initialFocus={false}
        finalFocus={() => tableFocusTarget(product?.id) ?? true}
        // Beside the table, Tab past the panel's last control goes back to the table it stays
        // over; the panel has no trigger for Base UI to hand focus on to.
        onKeyDown={(event) => {
          if (!isBesideTable || event.key !== "Tab" || event.shiftKey) return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>("a[href], button");
          if (event.target !== controls[controls.length - 1]) return;
          const target = tableFocusTarget(product?.id);
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
        className="w-full border-transparent text-body shadow-surface-5 duration-300 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*300ms)] sm:w-lg"
      >
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <Button variant="ghost" size="icon" aria-label="Fechar detalhes" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="scroll-fade-y relative min-h-0 flex-1 has-[[role=region]]:scroll-fade-b-4 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
          {product ? (
            <ProductDetail
              key={product.id}
              data={data}
              product={product}
              comparedIds={comparedIds}
              onComparedIdsChange={changeComparedIds}
              showCompareBar={openId !== undefined}
            />
          ) : (
            shownId !== undefined && <ProductNotFound category={data.category} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
