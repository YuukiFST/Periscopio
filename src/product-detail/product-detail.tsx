import { Link } from "@tanstack/react-router";
import { Check, ExternalLink, GitCompareArrows, Plus, Star } from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DrawerTitle } from "@/components/ui/drawer";
import type { CategoryData, Product } from "@/data/schema";
import { fieldLabel, manufacturerName, valueLabel } from "@/i18n/labels";
import { FieldValueText, isFigureField } from "@/product-fields/field-value-text";
import {
  productFieldGroups,
  productFieldValue,
  type ProductFieldGroup,
} from "@/product-fields/field-groups";
import { formatPrice, priceOf } from "@/product-table/cell-values";
import { useFavoriteIds } from "@/product-table/favorite-products";
import { PriceInReais } from "@/product-table/table-cells";
import { cn } from "@/lib/utils";
import { CompareBar, compareStatusId } from "@/product-compare/compare-bar";
import {
  maxComparedProducts,
  productIdsParam,
  toggleComparedId,
} from "@/product-compare/compare-selection";
import { similarProducts } from "@/product-compare/similar-products";
import { ProductPhoto } from "@/product-photo/product-photo";
import { PriceHistorySparkline } from "./price-history";

type ProductDetailProps = {
  data: CategoryData;
  product: Product;
  /** The Produtos marked for the Comparação, carried in the link from the table. */
  comparedIds: readonly string[];
  onComparedIdsChange: (ids: readonly string[]) => void;
  /** Off while the panel slides out: the table's own bar is back by then. */
  showCompareBar: boolean;
};

export function ProductDetail({
  data,
  product,
  comparedIds,
  onComparedIdsChange,
  showCompareBar,
}: ProductDetailProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${product.name} · Periscópio`;
    // A new view in a single-page app: screen readers and the keyboard start from its title.
    headingRef.current?.focus();
  }, [product.name]);
  const groups = productFieldGroups(data, [product]);
  const hasMeasurements = groups.some((group) => group.id === "medicoes");
  return (
    <article aria-labelledby="produto-titulo" className="flex w-full flex-col gap-8">
      <ProductHeader
        data={data}
        product={product}
        headingRef={headingRef}
        comparedIds={comparedIds}
        onComparedIdsChange={onComparedIdsChange}
      />
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <FieldGroupSection key={group.id} group={group} product={product} />
        ))}
        {!hasMeasurements && (
          <p className="max-w-prose text-muted-foreground">
            O EyeJoker ainda não publicou medições deste produto.
          </p>
        )}
      </div>
      {showCompareBar && (
        <CompareBar
          category={data.category}
          comparedIds={comparedIds}
          onClear={() => onComparedIdsChange([])}
          focusAfterClearId="produto-titulo"
          className="sticky bottom-0 border-transparent shadow-surface-5"
        />
      )}
    </article>
  );
}

function ProductHeader({
  data,
  product,
  headingRef,
  comparedIds,
  onComparedIdsChange,
}: Omit<ProductDetailProps, "showCompareBar"> & {
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const price = priceOf(product);
  const statusField = data.fields.find((field) => field.key === "status");
  const status =
    product.status && statusField ? valueLabel(statusField, product.status) : undefined;
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <ProductPhoto key={product.image} src={product.image} alt="" size="detail" />
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <DrawerTitle
            ref={headingRef}
            id="produto-titulo"
            tabIndex={-1}
            className="text-display text-balance wrap-break-word outline-none"
          >
            {product.name}
          </DrawerTitle>
          <p className="text-subtitle text-muted-foreground wrap-break-word">
            {manufacturerName(product.manufacturer)}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <HeaderFact label="Preço">
            {price === undefined ? (
              <span className="text-muted-foreground">Sem preço</span>
            ) : (
              <>
                <span className="whitespace-nowrap tabular-nums">
                  {formatPrice(price)}
                  <PriceInReais priceKrw={price} />
                </span>
                <PriceHistorySparkline
                  category={data.category}
                  productId={product.id}
                  priceKrw={price}
                />
              </>
            )}
          </HeaderFact>
          {status !== undefined && <HeaderFact label="Status de teste">{status}</HeaderFact>}
        </dl>
        <div className="flex flex-wrap gap-2">
          {product.aliUrl && (
            <Button
              trailingIcon={ExternalLink}
              render={<a href={product.aliUrl} target="_blank" rel="noopener noreferrer" />}
            >
              Ver no AliExpress
              <span className="sr-only">(abre em nova aba)</span>
            </Button>
          )}
          <CompareToggleButton
            isCompared={comparedIds.includes(product.id)}
            isFull={comparedIds.length >= maxComparedProducts}
            onToggle={() => onComparedIdsChange(toggleComparedId(comparedIds, product.id))}
          />
          <CompareSimilarLink data={data} product={product} />
          <FavoriteToggleButton data={data} product={product} />
        </div>
      </div>
    </header>
  );
}

function CompareToggleButton({
  isCompared,
  isFull,
  onToggle,
}: {
  isCompared: boolean;
  isFull: boolean;
  onToggle: () => void;
}) {
  if (isCompared) {
    return (
      <Button variant="tertiary" leadingIcon={Check} onClick={onToggle}>
        Remover da comparação
      </Button>
    );
  }
  return (
    <Button
      variant="tertiary"
      leadingIcon={Plus}
      onClick={onToggle}
      disabled={isFull}
      focusableWhenDisabled
      aria-describedby={isFull ? compareStatusId : undefined}
    >
      Adicionar à comparação
    </Button>
  );
}

/** The detail's star for the Favoritos, in step with the table's. */
function FavoriteToggleButton({ data, product }: { data: CategoryData; product: Product }) {
  const [favoriteIds, toggleFavorite] = useFavoriteIds(data.category);
  const isFavorite = favoriteIds.has(product.id);
  return (
    <Button
      variant="tertiary"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remover dos favoritos" : `Favoritar ${product.name}`}
      onClick={() => toggleFavorite(product.id)}
    >
      <Star
        aria-hidden="true"
        data-icon="inline-start"
        className={isFavorite ? "fill-current text-blue-600 dark:text-blue-400" : undefined}
      />
      {isFavorite ? "Remover dos favoritos" : "Favoritar"}
    </Button>
  );
}

/** "Comparar com parecidos": a Comparação of `product` and the nearest Produtos, hidden without any. */
function CompareSimilarLink({ data, product }: { data: CategoryData; product: Product }) {
  const similar = similarProducts(data, product, maxComparedProducts - 1);
  if (similar.length === 0) return null;
  const ids = [product.id, ...similar.map((candidate) => candidate.id)];
  return (
    <Button
      variant="tertiary"
      leadingIcon={GitCompareArrows}
      render={
        <Link
          to="/comparar/$categoria"
          params={{ categoria: data.category }}
          search={{ p: productIdsParam(ids) }}
        />
      }
    >
      Comparar com parecidos
    </Button>
  );
}

function HeaderFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function FieldGroupSection({ group, product }: { group: ProductFieldGroup; product: Product }) {
  const headingId = `grupo-${group.id}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="text-title font-medium">
        {group.title}
      </h3>
      <dl className="divide-y divide-border/60">
        {group.fields.map((field) => {
          const value = productFieldValue(product, field);
          if (value === undefined) return null;
          return (
            <div key={field.key} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="min-w-0 text-pretty text-muted-foreground">{fieldLabel(field)}</dt>
              <dd
                className={cn(
                  "min-w-0 text-end",
                  isFigureField(field) ? "shrink-0" : "max-w-[60%] font-medium text-pretty",
                )}
              >
                <FieldValueText field={field} value={value} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
