import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import type { CategoryData, Field, Product } from "@/data/schema";
import { fieldLabel, manufacturerName } from "@/i18n/labels";
import { cn } from "@/lib/utils";
import {
  productFieldGroups,
  productFieldValue,
  type ProductFieldGroup,
} from "@/product-fields/field-groups";
import { FieldValueText } from "@/product-fields/field-value-text";
import { ProductPhoto } from "@/product-photo/product-photo";
import { MissingValue } from "@/product-table/table-cells";
import { productIdsParam } from "./compare-selection";
import { ComparisonMark } from "./comparison-mark";
import { comparisonMarks } from "./highlight-rules";

type ComparisonTableProps = {
  data: CategoryData;
  /** 2 to 4 Produtos of `data`, one column each, in the link's order. */
  products: readonly Product[];
  /** Id of the heading that names the table. */
  labelledBy: string;
  onRemove: (id: string) => void;
};

type ComparisonGroup = Omit<ProductFieldGroup, "id"> & {
  id: ProductFieldGroup["id"] | "medicoes-por-conexao";
  foldable: boolean;
};

/**
 * Mouse Medições taken on one connection (com fio, sem fio, Bluetooth) or
 * Motion Sync setting. The Resumo de desempenho already reads the fastest of
 * them, so they start folded under their own group.
 */
const perConnectionFieldPattern = /Wired|Wireless|Bluetooth|MotionSync/;

function isPerConnection(field: Field): boolean {
  return perConnectionFieldPattern.test(field.key);
}

function comparisonGroups(data: CategoryData, products: readonly Product[]): ComparisonGroup[] {
  const groups = productFieldGroups(data, products).map((group) => ({
    ...group,
    foldable: false,
  }));
  if (data.category !== "mouse") return groups;
  return groups.flatMap((group): ComparisonGroup[] => {
    if (group.id !== "medicoes") return [group];
    const overall = group.fields.filter((field) => !isPerConnection(field));
    const perConnection = group.fields.filter(isPerConnection);
    const splits: ComparisonGroup[] = [
      { ...group, fields: overall },
      {
        id: "medicoes-por-conexao",
        title: "Medições por conexão",
        fields: perConnection,
        foldable: true,
      },
    ];
    return splits.filter((split) => split.fields.length > 0);
  });
}

/**
 * One column per Produto and one row per field, in Especificações and
 * Medições. The labels stay fixed at the start; Produto columns scroll
 * sideways, two at a time on a phone, up to four on a wide screen.
 */
export function ComparisonTable({ data, products, labelledBy, onRemove }: ComparisonTableProps) {
  const groups = comparisonGroups(data, products);
  const [isUnfolded, setIsUnfolded] = useState(false);
  const comparedIdsParam = productIdsParam(products.map((product) => product.id));
  const columnCount = products.length;
  const layout: CSSProperties & Record<`--${string}`, string | number> = {
    "--compared-count": columnCount,
    // With more Produtos than fit, the next column peeks in by 1.5rem as the cue to scroll.
    "--peek": "calc(clamp(0, var(--compared-count) - var(--visible-columns), 1) * 1.5rem)",
    "--product-column":
      "calc((100cqw - var(--label-column) - var(--peek)) / min(var(--visible-columns), var(--compared-count)))",
  };
  // The border sits on a wrapper, so the scroll fade dissolves the columns and not the frame;
  // the fade waits for a touch screen, where it would not hide a scrollbar at the end.
  return (
    <div
      // Two Produtos on a wide screen keep readable columns instead of stretching across it.
      style={{ maxWidth: `calc(var(--label-column) + ${columnCount} * 24rem + 2px)` }}
      className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-lg border border-border [--label-column:7.5rem] [--visible-columns:2] sm:[--label-column:11rem] md:[--visible-columns:3] lg:[--label-column:14rem] lg:[--visible-columns:4]"
    >
      <div
        style={layout}
        className="relative @container min-h-0 flex-1 scroll-ps-(--label-column) overflow-auto overscroll-contain pointer-coarse:scroll-fade-e"
      >
        <table
          aria-labelledby={labelledBy}
          className="table-fixed border-separate border-spacing-0 text-body-sm"
          style={{
            width: `calc(var(--label-column) + ${columnCount} * var(--product-column))`,
            minWidth: "100%",
          }}
        >
          <colgroup>
            <col style={{ width: "var(--label-column)" }} />
            {products.map((product) => (
              <col key={product.id} style={{ width: "var(--product-column)" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <td className="sticky start-0 top-0 z-30 border-e border-b border-border bg-page" />
              {products.map((product) => (
                <ProductColumnHeader
                  key={product.id}
                  category={data.category}
                  product={product}
                  comparedIdsParam={comparedIdsParam}
                  onRemove={() => onRemove(product.id)}
                />
              ))}
            </tr>
          </thead>
          {groups.map((group) => {
            const groupHeadingId = `comparacao-${group.id}`;
            const groupBodyId = `${groupHeadingId}-linhas`;
            const showsFields = !group.foldable || isUnfolded;
            return (
              <tbody key={group.id} aria-labelledby={groupHeadingId}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={columnCount + 1}
                    className="border-b border-border-subtle bg-component p-0 text-start"
                  >
                    <span className="sticky start-0 inline-flex items-center gap-2 px-2 py-1.5 sm:px-3">
                      <span id={groupHeadingId} className="font-serif text-body-base font-medium">
                        {group.title}
                      </span>
                      {group.foldable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={isUnfolded}
                          aria-controls={isUnfolded ? groupBodyId : undefined}
                          onClick={() => setIsUnfolded(!isUnfolded)}
                          className="font-sans text-fg-secondary"
                        >
                          {isUnfolded ? "Ocultar" : `Mostrar (${group.fields.length})`}
                          <ChevronDown
                            aria-hidden="true"
                            className={cn("transition-transform", isUnfolded && "rotate-180")}
                          />
                        </Button>
                      )}
                    </span>
                  </th>
                </tr>
                {showsFields &&
                  group.fields.map((field, index) => (
                    <FieldRow
                      key={field.key}
                      id={index === 0 && group.foldable ? groupBodyId : undefined}
                      field={field}
                      products={products}
                    />
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

function ProductColumnHeader({
  category,
  product,
  comparedIdsParam,
  onRemove,
}: {
  category: CategorySlug;
  product: Product;
  comparedIdsParam: string | undefined;
  onRemove: () => void;
}) {
  return (
    <th
      scope="col"
      // Named by the Produto alone: screen readers repeat this name on every cell of the column.
      aria-label={product.name}
      className="sticky top-0 z-20 border-b border-border bg-page px-2 py-2 text-start align-top font-normal sm:px-3 sm:py-3"
    >
      <div className="flex flex-col items-start gap-2">
        <ProductPhoto key={product.image} src={product.image} alt="" size="compare" />
        <div className="min-w-0">
          <p className="leading-[1.125rem] font-medium wrap-break-word text-fg-primary">
            <Link
              to="/$categoria/$id"
              params={{ categoria: category, id: product.id }}
              search={{ cmp: comparedIdsParam }}
              className="underline-offset-4 hover:underline"
            >
              {product.name}
            </Link>
          </p>
          <p className="text-caption-lg wrap-break-word text-fg-secondary">
            {manufacturerName(product.manufacturer)}
          </p>
        </div>
        {product.aliUrl && (
          <a
            href={product.aliUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${product.name} no AliExpress (abre em nova aba)`}
            className="-my-1 inline-flex min-h-8 touch-manipulation items-center gap-1 font-medium text-brand-fg underline-offset-4 hover:underline"
          >
            AliExpress
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          </a>
        )}
      </div>
      {/* Last in the tab order, after the Produto's own links; shown in the corner by the photo. */}
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onRemove}
        aria-label={`Remover ${product.name} da comparação`}
        className="absolute end-0.5 top-3.5 text-fg-secondary hover:text-fg-primary sm:end-1 sm:top-6.5"
      >
        <X aria-hidden="true" />
      </Button>
    </th>
  );
}

function FieldRow({
  id,
  field,
  products,
}: {
  id?: string;
  field: Field;
  products: readonly Product[];
}) {
  const values = products.map((product) => productFieldValue(product, field));
  const marks = comparisonMarks(field, values);
  return (
    <tr id={id}>
      <th
        scope="row"
        className="sticky start-0 z-10 border-e border-b border-border-subtle bg-page px-2 py-2 text-start align-top font-normal text-pretty text-fg-secondary sm:px-3"
      >
        {fieldLabel(field)}
      </th>
      {values.map((value, position) => {
        const mark =
          marks.kind !== "none" && marks.positions.has(position) ? marks.kind : undefined;
        return (
          <td
            key={products[position]?.id ?? position}
            className={cn(
              "border-b border-border-subtle px-2 py-2 align-top tabular-nums hyphens-auto sm:px-3",
              mark === "best" && "bg-highlight font-medium text-highlight-fg",
              mark === "tie" && "bg-tie font-medium text-tie-fg",
            )}
          >
            {value === undefined ? (
              <MissingValue />
            ) : (
              <>
                <FieldValueText field={field} value={value} />
                {/* Inline after the value, so a long word wraps whole and the mark follows it. */}
                {mark && <ComparisonMark kind={mark} />}
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}
