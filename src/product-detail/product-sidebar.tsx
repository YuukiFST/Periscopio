import { useLocation, useMatch, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { CategoryData } from "@/data/schema";
import { comparedIdsFromParam, productIdsParam } from "@/product-compare/compare-selection";
import { ProductDetail } from "./product-detail";
import { ProductNotFound } from "./product-not-found";

/**
 * The open Produto's details in a panel on the right, over the table. It is not
 * modal: the table stays usable, and another Produto clicked there takes the panel.
 */
export function ProductSidebar({ data }: { data: CategoryData }) {
  const openId = useMatch({ from: "/$categoria/$id", shouldThrow: false })?.params.id;
  // The last Produto stays drawn while the panel slides out.
  const [shownId, setShownId] = useState(openId);
  if (openId !== undefined && openId !== shownId) setShownId(openId);

  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const router = useRouter();
  const fromCategoryTable = useLocation({
    select: (location) => location.state.fromCategoryTable === true,
  });
  const productIds = useMemo(
    () => new Set(data.products.map((product) => product.id)),
    [data.products],
  );
  const comparedIds = comparedIdsFromParam(search.cmp, productIds);
  const product = data.products.find((candidate) => candidate.id === shownId);

  function close() {
    // Replaces the entry: the table comes back as the panel left it, and back undoes the visit.
    void navigate({
      to: "/$categoria",
      params: { categoria: data.category },
      search: true,
      replace: true,
    });
  }

  // Opened from the table, the browser's back from here lands on the table with the old marks,
  // and the marks live only in the link: this entry becomes the table with the new marks and
  // the panel opens again above it, so back returns to the table as the panel left it.
  // Opened from anywhere else (the Comparação, a link), back keeps leading there.
  function changeComparedIds(ids: readonly string[]) {
    if (shownId === undefined) return;
    const nextSearch = { ...search, cmp: productIdsParam(ids) };
    if (!fromCategoryTable) {
      void navigate({ to: ".", search: nextSearch, replace: true });
      return;
    }
    void navigate({
      to: "/$categoria",
      params: { categoria: data.category },
      search: nextSearch,
      replace: true,
    });
    // The browser history batches writes in a microtask; unflushed, the two become one push.
    router.history.flush();
    void navigate({
      to: "/$categoria/$id",
      params: { categoria: data.category, id: shownId },
      search: nextSearch,
      state: { fromCategoryTable: true },
    });
  }

  return (
    <Drawer
      open={openId !== undefined}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setShownId(undefined);
      }}
      swipeDirection="right"
      modal={false}
      // A click on the table picks another Produto instead of closing the panel.
      disablePointerDismissal
    >
      {/* The details move focus to their title themselves, on every Produto they show;
          closing hands it back to the Produto's row while the table still shows it. */}
      <DrawerContent
        initialFocus={false}
        finalFocus={() =>
          document.querySelector<HTMLElement>(`tr[data-row-id="${shownId}"] a[href]`) ?? true
        }
        className="w-full text-body-sm sm:w-lg"
      >
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <Button variant="ghost" size="icon-lg" aria-label="Fechar detalhes" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="scroll-fade-y relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
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
