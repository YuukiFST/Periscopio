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

/**
 * The ids that name the row: the Produto and its manufacturer, so neither link
 * in the cell ("Detalhes de …", "… no AliExpress") repeats on every cell read.
 */
export function productCellLabelIds(product: Product): string {
  return `produto-${product.id} fabricante-${product.id}`;
}

/**
 * The whole cell opens the detail screen; a Produto with the Link AliExpress
 * shows its name in blue as that link, above the cell's.
 */
export function ProductCell({ product }: { product: Product }) {
  const manufacturer = manufacturerName(product.manufacturer);
  const name = <span id={`produto-${product.id}`}>{product.name}</span>;
  return (
    <div className="group/cell flex items-start gap-2 sm:gap-3">
      {/* The table's search params ride along, so the detail screen can lead back to this view. */}
      <Link
        from="/$categoria"
        to="/$categoria/$id"
        params={(current) => ({ ...current, id: product.id })}
        search={true}
        state={{ fromCategoryTable: true }}
        aria-label={`Detalhes de ${product.name}`}
        className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-component-hover"
      />
      <ProductPhoto key={product.image} src={product.image} alt="" size="row" loading="lazy" />
      <div className="min-w-0">
        <p className="leading-[1.4] font-medium wrap-break-word text-fg-primary">
          {product.aliUrl ? (
            <a
              href={product.aliUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative rounded-xs text-brand-fg underline-offset-4 hover:underline active:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {name}
              <span className="sr-only"> no AliExpress (abre em nova aba)</span>
            </a>
          ) : (
            <span className="underline-offset-4 [@media(hover:hover)]:group-has-[a:hover]/cell:underline">
              {name}
            </span>
          )}
        </p>
        <p
          id={`fabricante-${product.id}`}
          className="text-caption-lg wrap-break-word text-fg-secondary"
        >
          {manufacturer}
        </p>
      </div>
    </div>
  );
}

export function TableCellValue({ column, product }: { column: TableColumn; product: Product }) {
  switch (column.kind) {
    case "product":
      return <ProductCell product={product} />;
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
