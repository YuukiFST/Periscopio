import { useMatch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isCategorySlug, type CategorySlug } from "@/categories";
import type { CategoryData } from "@/data/schema";
import { ProductDetail } from "@/product-detail/product-detail";
import { ProductNotFound } from "@/product-detail/product-not-found";
import { ProductPanel } from "@/product-detail/product-panel";
import { recordRecentProduct } from "@/recent-products/recent-products";

/** A Produto of any Categoria, as the Fila's URL names it. */
type QueuedProductKey = { category: CategorySlug; id: string };

export const testQueueHeadingId = "fila-titulo";

/** The `data-produto` of a Produto's row in the Fila, where focus goes back when the panel closes. */
export function queuedProductAttribute({ category, id }: QueuedProductKey): string {
  return `${category}/${id}`;
}

function queueFocusTarget(key: QueuedProductKey | undefined): HTMLElement | null {
  const row =
    key === undefined
      ? null
      : document.querySelector<HTMLElement>(`a[data-produto="${queuedProductAttribute(key)}"]`);
  return row ?? document.getElementById(testQueueHeadingId);
}

/**
 * The open Produto's details in the side panel over the Fila de testes. It
 * opens once the Categorias load, so a shared link never shows an empty panel.
 */
export function TestQueueProductPanel({
  categories,
}: {
  /** Undefined until every Categoria loads. */
  categories: readonly CategoryData[] | undefined;
}) {
  const params = useMatch({ from: "/fila/$categoriaProduto/$id", shouldThrow: false })?.params;
  const openKey: QueuedProductKey | undefined =
    params && isCategorySlug(params.categoriaProduto)
      ? { category: params.categoriaProduto, id: params.id }
      : undefined;
  // The last Produto stays drawn while the panel slides out.
  const [shownKey, setShownKey] = useState(openKey);
  if (openKey && (openKey.category !== shownKey?.category || openKey.id !== shownKey.id)) {
    setShownKey(openKey);
  }

  const data = categories?.find(({ category }) => category === shownKey?.category);
  const product = data?.products.find((candidate) => candidate.id === shownKey?.id);
  const isOpen = openKey !== undefined && categories !== undefined;
  useEffect(() => {
    if (isOpen && data && product) recordRecentProduct(data.category, product.id);
  }, [isOpen, data, product]);

  const navigate = useNavigate();
  function close() {
    // Replaces the entry: the Fila comes back with the Categoria it was filtered by.
    void navigate({ to: "/fila", search: true, replace: true });
  }

  return (
    <ProductPanel
      open={isOpen}
      onClose={close}
      onClosed={() => setShownKey(undefined)}
      returnFocusTo={() => queueFocusTarget(shownKey)}
    >
      {data && product ? (
        <ProductDetail key={`${data.category}/${product.id}`} data={data} product={product} />
      ) : (
        shownKey !== undefined && <ProductNotFound category={shownKey.category} />
      )}
    </ProductPanel>
  );
}
