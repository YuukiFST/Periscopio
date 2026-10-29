import { useMatch, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { CategoryData } from "@/data/schema";
import { comparedIdsFromParam } from "@/product-compare/compare-selection";
import { recordRecentProduct } from "@/recent-products/recent-products";
import { ProductDetail } from "./product-detail";
import { ProductNotFound } from "./product-not-found";
import { ProductPanel } from "./product-panel";
import { useChangeComparedIds } from "./use-change-compared-ids";

/** Where keyboard focus goes back to the table: the Produto's row, else the Categoria's title. */
function tableFocusTarget(productId: string | undefined): HTMLElement | null {
  const row =
    productId === undefined
      ? null
      : document.querySelector<HTMLElement>(`tr[data-row-id="${productId}"] a[href]`);
  return row ?? document.getElementById("categoria-titulo");
}

/**
 * The open Produto's details in the side panel over the Categoria table.
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
  const productIds = useMemo(
    () => new Set(data.products.map((product) => product.id)),
    [data.products],
  );
  const comparedIds = comparedIdsFromParam(search.cmp, productIds);
  const product = data.products.find((candidate) => candidate.id === shownId);
  useEffect(() => {
    if (openId !== undefined && productIds.has(openId)) recordRecentProduct(data.category, openId);
  }, [openId, productIds, data.category]);

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
    <ProductPanel
      open={openId !== undefined}
      onClose={close}
      onClosed={() => setShownId(undefined)}
      returnFocusTo={() => tableFocusTarget(product?.id)}
    >
      {product ? (
        <ProductDetail
          key={product.id}
          data={data}
          product={product}
          comparison={{
            comparedIds,
            onComparedIdsChange: changeComparedIds,
            showsCompareBar: openId !== undefined,
          }}
        />
      ) : (
        shownId !== undefined && <ProductNotFound category={data.category} />
      )}
    </ProductPanel>
  );
}
