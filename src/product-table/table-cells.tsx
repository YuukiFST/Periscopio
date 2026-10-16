import { ImageOff } from "lucide-react";
import type { Product } from "@/data/schema";
import { manufacturerName } from "@/i18n/labels";
import {
  formatDeviation,
  formatFieldValue,
  formatPrice,
  isCountEnum,
  priceOf,
} from "./cell-values";
import type { TableColumn } from "./table-columns";

function MissingValue() {
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
      {product.image ? (
        <img
          src={product.image}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className="size-8 shrink-0 rounded-md bg-white object-contain outline-1 -outline-offset-1 outline-border sm:size-10"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-component text-fg-tertiary sm:size-10"
        >
          <ImageOff className="size-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="leading-[1.125rem] font-medium wrap-break-word text-fg-primary">
          {product.name}
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
