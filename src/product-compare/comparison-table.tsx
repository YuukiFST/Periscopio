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
import { MarkIcon, markCellClass } from "./comparison-mark";
import { GroupHeaderRow, RowLabel, valueCellClass } from "./comparison-rows";
import { comparisonMarks } from "./highlight-rules";
import { fieldConnection, isPerConnectionField, type Connection } from "./mouse-connection";
import type { ResponseSummary } from "./response-summary";
import { SummaryRowGroup } from "./summary-rows";

type ComparisonTableProps = {
  data: CategoryData;
  /** 2 to 4 Produtos of `data`, one column each, in the link's order. */
  products: readonly Product[];
  /** Id of the heading that names the table. */
  labelledBy: string;
  /** The mouse Resumo de desempenho, shown as the first rows. */
  summary: ResponseSummary | undefined;
  /** The connection chosen for mouses; undefined when any counts. */
  connection: Connection | undefined;
  onRemove: (id: string) => void;
};

type ComparisonGroup = Omit<ProductFieldGroup, "id"> & {
  id: ProductFieldGroup["id"] | "medicoes-por-conexao";
  foldable: boolean;
};

function isPerConnection(field: Field): boolean {
  return isPerConnectionField(field.key);
}

/**
 * Especificações and Medições; for mouses, the Medições taken on one
 * connection or Motion Sync setting leave the Medições. With any connection,
 * they start folded under their own group, since each repeats a headline
 * Medição. With one chosen, its own show open and the others leave.
 */
function comparisonGroups(
  data: CategoryData,
  products: readonly Product[],
  connection: Connection | undefined,
): ComparisonGroup[] {
  const groups = productFieldGroups(data, products).map((group) => ({
    ...group,
    foldable: false,
  }));
  if (data.category !== "mouse") return groups;
  return groups.flatMap((group): ComparisonGroup[] => {
    if (group.id !== "medicoes") return [group];
    const perConnection =
      connection === undefined
        ? group.fields.filter(isPerConnection)
        : // Motion Sync times name no connection, and on a mouse with only this one they count for it.
          group.fields.filter((field) => {
            const measuredOn = fieldConnection(field.key);
            return (
              isPerConnection(field) && (measuredOn === connection || measuredOn === undefined)
            );
          });
    const splits: ComparisonGroup[] = [
      { ...group, fields: group.fields.filter((field) => !isPerConnection(field)) },
      {
        id: "medicoes-por-conexao",
        title: connection === undefined ? "Medições por conexão" : `Medições ${connection}`,
        fields: perConnection,
        foldable: connection === undefined,
      },
    ];
    return splits.filter((split) => split.fields.length > 0);
  });
}

/**
 * One column per Produto and one row per field, in Especificações and
 * Medições, after the Resumo de desempenho for mouses. The labels stay fixed
 * at the start; Produto columns scroll sideways, two at a time on a phone, up
 * to four on a wide screen. The table is the page's one scroll area, so
 * nothing above it may grow tall.
 */
export function ComparisonTable({
  data,
  products,
  labelledBy,
  summary,
  connection,
  onRemove,
}: ComparisonTableProps) {
  const groups = comparisonGroups(data, products, connection);
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
  // The 11rem scroll padding clears the tallest sticky header measured (photo, wrapped name, link),
  // so a control scrolled into view at the top never lands under it.
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
        className="relative @container min-h-0 flex-1 scroll-ps-(--label-column) scroll-pt-44 overflow-auto pointer-coarse:scroll-fade-e"
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
              <td className="sticky start-0 top-0 z-30 border-e border-b border-border bg-page p-2 align-bottom text-caption-lg text-pretty text-fg-secondary sm:p-3">
                O preço fica de fora da comparação porque preços mudam, e o EyeJoker não registra o
                preço da sua região.
              </td>
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
          {summary && <SummaryRowGroup summary={summary} />}
          {groups.map((group) => {
            const headingId = `comparacao-${group.id}`;
            const rows = group.fields.map((field) => (
              <FieldRow key={field.key} field={field} products={products} />
            ));
            if (!group.foldable) {
              return (
                <tbody key={group.id} aria-labelledby={headingId}>
                  <GroupHeaderRow
                    headingId={headingId}
                    title={group.title}
                    columnCount={columnCount}
                  />
                  {rows}
                </tbody>
              );
            }
            // The folded rows are a tbody of their own, so the button's aria-controls names them all.
            const rowsId = `${headingId}-linhas`;
            return [
              <tbody key={group.id} aria-labelledby={headingId}>
                <GroupHeaderRow headingId={headingId} title={group.title} columnCount={columnCount}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={isUnfolded}
                    aria-controls={rowsId}
                    aria-describedby={headingId}
                    onClick={() => setIsUnfolded(!isUnfolded)}
                    className="font-sans text-fg-secondary"
                  >
                    {isUnfolded ? "Ocultar" : `Mostrar (${group.fields.length})`}
                    <ChevronDown
                      aria-hidden="true"
                      data-icon="inline-end"
                      className={cn("motion-safe:transition-transform", isUnfolded && "rotate-180")}
                    />
                  </Button>
                </GroupHeaderRow>
              </tbody>,
              <tbody key={rowsId} id={rowsId} aria-labelledby={headingId} hidden={!isUnfolded}>
                {rows}
              </tbody>,
            ];
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
        {/* Below 21rem of table the photo and the remove button no longer fit side by side; the name stays. */}
        <div className="@max-[21rem]:hidden">
          <ProductPhoto key={product.image} src={product.image} alt="" size="compare" />
        </div>
        <div className="min-w-0">
          <p className="leading-[1.125rem] font-medium wrap-anywhere text-fg-primary">
            <Link
              to="/$categoria/$id"
              params={{ categoria: category, id: product.id }}
              search={{ cmp: comparedIdsParam }}
              className="underline-offset-4 hover:underline active:underline"
            >
              {product.name}
            </Link>
          </p>
          <p className="text-caption-lg wrap-anywhere text-fg-secondary">
            {manufacturerName(product.manufacturer)}
          </p>
        </div>
        {product.aliUrl && (
          <a
            href={product.aliUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${product.name} no AliExpress (abre em nova aba)`}
            className="-my-1 inline-flex min-h-8 max-w-full touch-manipulation flex-wrap items-center gap-1 font-medium wrap-anywhere text-brand-fg underline-offset-4 hover:underline active:underline"
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
        className="absolute end-0.5 top-3.5 text-fg-secondary hover:text-fg-primary @max-[21rem]:static @max-[21rem]:mt-1 @max-[21rem]:-ms-2.5 sm:end-1 sm:top-6.5"
      >
        <X aria-hidden="true" />
      </Button>
    </th>
  );
}

function FieldRow({ field, products }: { field: Field; products: readonly Product[] }) {
  const values = products.map((product) => productFieldValue(product, field));
  const marks = comparisonMarks(field, values);
  return (
    <tr>
      <RowLabel>{fieldLabel(field)}</RowLabel>
      {values.map((value, position) => (
        <td
          key={products[position]?.id ?? position}
          className={cn(valueCellClass, markCellClass(marks[position]))}
        >
          {value === undefined ? (
            <MissingValue />
          ) : (
            <>
              <FieldValueText field={field} value={value} className="whitespace-normal" />
              {/* Inline after the value, so a long word wraps whole and the mark follows it. */}
              <MarkIcon mark={marks[position]} />
            </>
          )}
        </td>
      ))}
    </tr>
  );
}
