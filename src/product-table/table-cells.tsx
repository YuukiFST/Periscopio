import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/schema";
import { manufacturerName } from "@/i18n/labels";
import { ProductPhoto } from "@/product-photo/product-photo";
import {
  formatDeviation,
  formatFieldValue,
  formatPrice,
  isCountEnum,
  priceOf,
} from "./cell-values";
import type { TableColumn } from "./table-columns";

export function MissingValue() {
  return (
    <>
      <span aria-hidden="true" className="text-fg-secondary">
        —
      </span>
      <span className="sr-only">Sem dado</span>
    </>
  );
}

export function ProductCell({ product }: { product: Product }) {
  const manufacturer = manufacturerName(product.manufacturer);
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ProductPhoto key={product.image} src={product.image} alt="" size="row" loading="lazy" />
      <div className="min-w-0">
        <p className="leading-[1.125rem] font-medium wrap-break-word text-fg-primary">
          {/* The table's search params ride along, so the detail screen can lead back to this view. */}
          <Link
            from="/$categoria/"
            to="/$categoria/$id"
            params={(current) => ({ ...current, id: product.id })}
            search={true}
            className="underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
          >
            {product.name}
          </Link>
        </p>
        <p className="text-caption-lg wrap-break-word text-fg-secondary">{manufacturer}</p>
      </div>
    </div>
  );
}

export function TableCellValue({ column, product }: { column: TableColumn; product: Product }) {
  switch (column.kind) {
    case "product":
      return <ProductCell product={product} />;
    case "aliexpress":
      return product.aliUrl ? (
        <a
          href={product.aliUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${product.name} no AliExpress`}
          className="inline-flex min-h-8 touch-manipulation items-center font-medium text-brand-fg underline-offset-4 hover:underline active:underline"
        >
          AliExpress
        </a>
      ) : (
        <MissingValue />
      );
    case "price": {
      const price = priceOf(product);
      return price === undefined ? (
        <MissingValue />
      ) : (
        <span className="whitespace-nowrap">{formatPrice(price)}</span>
      );
    }
    case "field": {
      const value = product.values[column.field.key];
      if (value === undefined) return <MissingValue />;
      const text = formatFieldValue(column.field, value);
      if (column.field.type !== "number" && !isCountEnum(column.field)) {
        return <span className="wrap-break-word">{text}</span>;
      }
      const deviation = column.deviation
        ? formatDeviation(column.deviation, product.values[column.deviation.key])
        : undefined;
      return (
        <span className="font-mono text-code-xs whitespace-nowrap">
          {text}
          {deviation !== undefined && (
            <span className="text-fg-secondary">
              {" "}
              <span aria-hidden="true">σ</span>
              <span className="sr-only">desvio padrão</span> {deviation}
            </span>
          )}
        </span>
      );
    }
  }
}
