import { Check, ExternalLink, Plus } from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { CompareBar, compareStatusId } from "@/product-compare/compare-bar";
import { maxComparedProducts, toggleComparedId } from "@/product-compare/compare-selection";
import { ProductPhoto } from "@/product-photo/product-photo";

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
          <p className="max-w-prose text-fg-secondary">
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
          className="sticky bottom-0 border-transparent shadow-large"
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
            className="font-serif text-heading-5 text-balance wrap-break-word outline-none"
          >
            {product.name}
          </DrawerTitle>
          <p className="text-body-base text-fg-secondary wrap-break-word">
            {manufacturerName(product.manufacturer)}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <HeaderFact label="Preço">
            {price === undefined ? (
              <span className="text-fg-secondary">Sem preço</span>
            ) : (
              <span className="whitespace-nowrap tabular-nums">{formatPrice(price)}</span>
            )}
          </HeaderFact>
          {status !== undefined && <HeaderFact label="Status de teste">{status}</HeaderFact>}
        </dl>
        <div className="flex flex-wrap gap-2">
          {product.aliUrl && (
            <a
              href={product.aliUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg" })}
            >
              Ver no AliExpress
              <span className="sr-only">(abre em nova aba)</span>
              <ExternalLink aria-hidden="true" data-icon="inline-end" />
            </a>
          )}
          <CompareToggleButton
            isCompared={comparedIds.includes(product.id)}
            isFull={comparedIds.length >= maxComparedProducts}
            onToggle={() => onComparedIdsChange(toggleComparedId(comparedIds, product.id))}
          />
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
      <Button variant="outline" size="lg" onClick={onToggle}>
        <Check aria-hidden="true" data-icon="inline-start" />
        Remover da comparação
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onToggle}
      disabled={isFull}
      focusableWhenDisabled
      aria-describedby={isFull ? compareStatusId : undefined}
    >
      <Plus aria-hidden="true" data-icon="inline-start" />
      Adicionar à comparação
    </Button>
  );
}

function HeaderFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption-lg text-fg-secondary">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function FieldGroupSection({ group, product }: { group: ProductFieldGroup; product: Product }) {
  const headingId = `grupo-${group.id}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="font-serif text-heading-6 font-medium">
        {group.title}
      </h3>
      <dl className="divide-y divide-border-subtle">
        {group.fields.map((field) => {
          const value = productFieldValue(product, field);
          if (value === undefined) return null;
          return (
            <div key={field.key} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="min-w-0 text-pretty text-fg-secondary">{fieldLabel(field)}</dt>
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
