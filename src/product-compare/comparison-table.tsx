import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  /** The control that swaps a Produto for another, shown in its column. */
  renderSwapControl: (product: Product) => ReactNode;
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
  renderSwapControl,
}: ComparisonTableProps) {
  const groups = comparisonGroups(data, products, connection);
  const hasMeasurements =
    summary !== undefined || groups.some((group) => group.id !== "especificacoes");
  const [isUnfolded, setIsUnfolded] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  // Long Produto names from the EyeJoker set the sticky header's height, so the scroll padding
  // follows it: a control scrolled into view at the top never lands under the header. A header
  // taller than half the box stops sticking, so the rows keep room to be read.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const header = headerRef.current;
    if (!scroller || !header) return;
    const observer = new ResizeObserver(() => {
      scroller.style.setProperty("--header-height", `${header.offsetHeight}px`);
      scroller.dataset.headerTall = String(header.offsetHeight > scroller.clientHeight / 2);
    });
    observer.observe(header);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);
  const comparedIdsParam = productIdsParam(products.map((product) => product.id));
  const columnCount = products.length;
  const layout: CSSProperties & Record<`--${string}`, string | number> = {
    "--compared-count": columnCount,
    // With more Produtos than fit, the next column peeks in by 1.5rem as the cue to scroll.
    "--peek":
      "calc(clamp(0, var(--compared-count) - var(--visible-columns), 1) * var(--peek-size))",
    "--product-column":
      "calc((100cqw - var(--label-column) - var(--peek)) / min(var(--visible-columns), var(--compared-count)))",
  };
  // The border sits on a wrapper, so the scroll fade dissolves the columns and not the frame;
  // the fade waits for a touch screen, where it would not hide a scrollbar. It softens the
  // peeking column's cut edge, which alone reads as clipped text.
  return (
    <div
      // A short table sizes to its rows; a long one shrinks to the space left and scrolls.
      className={cn(
        "flex flex-initial flex-col overflow-hidden rounded-lg border border-border",
        hasMeasurements && "min-h-72",
      )}
    >
      <div
        ref={scrollerRef}
        style={layout}
        className="group/scroller relative @container min-h-0 flex-1 snap-x snap-mandatory scroll-ps-(--label-column) scroll-pt-(--header-height) overflow-auto pointer-coarse:scroll-fade-be data-[header-tall=true]:scroll-pt-0"
      >
        <table
          aria-labelledby={labelledBy}
          className="table-fixed border-separate border-spacing-0 text-body"
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
          {/* A stuck header control is already on screen: its negative margin cancels the scroll
              padding, so focusing it never scrolls the rows away. */}
          <thead
            ref={headerRef}
            className="[&_*]:scroll-mt-[calc(var(--header-height)*-1)] group-data-[header-tall=true]/scroller:[&_*]:scroll-mt-0"
          >
            <tr>
              <td className="sticky start-0 top-0 z-30 border-e border-b border-border bg-background p-2 align-bottom text-caption text-pretty text-muted-foreground sm:p-3 group-data-[header-tall=true]/scroller:top-auto">
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
                  swapControl={renderSwapControl(product)}
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
                    size="compact"
                    aria-expanded={isUnfolded}
                    aria-controls={rowsId}
                    aria-describedby={headingId}
                    onClick={() => setIsUnfolded(!isUnfolded)}
                    className="font-sans text-muted-foreground pointer-coarse:h-10"
                  >
                    {isUnfolded ? "Ocultar" : `Mostrar (${group.fields.length})`}
                    <ChevronDown
                      aria-hidden="true"
                      data-icon="inline-end"
                      className={cn(
                        "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-in-out-cubic",
                        isUnfolded && "rotate-180",
                      )}
                    />
                  </Button>
                </GroupHeaderRow>
              </tbody>,
              <tbody key={rowsId} id={rowsId} aria-labelledby={headingId} hidden={!isUnfolded}>
                {rows}
              </tbody>,
            ];
          })}
          {!hasMeasurements && (
            <tbody>
              <tr>
                <td
                  colSpan={columnCount + 1}
                  className="px-2 py-3 text-pretty text-muted-foreground sm:px-3"
                >
                  <span className="sticky start-2 block max-w-[calc(100cqw-1rem)] sm:start-3 sm:max-w-[calc(100cqw-1.5rem)]">
                    O EyeJoker ainda não publicou medições destes produtos.
                  </span>
                </td>
              </tr>
            </tbody>
          )}
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
  swapControl,
}: {
  category: CategorySlug;
  product: Product;
  comparedIdsParam: string | undefined;
  onRemove: () => void;
  swapControl: ReactNode;
}) {
  return (
    <th
      scope="col"
      // Named by the Produto alone: screen readers repeat this name on every cell of the column.
      aria-label={product.name}
      // A peeking column scrolls in whole when Tab reaches its links, its start on a snap point.
      // Focus inside the Trocar dialog bubbles here through React's tree, though the dialog is elsewhere.
      onFocus={(event) => {
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
        event.currentTarget.scrollIntoView({ block: "nearest", inline: "start" });
      }}
      className="sticky top-0 z-20 snap-start border-b border-border bg-background px-1.5 py-2 text-start align-top font-normal min-[22rem]:px-2 sm:px-3 sm:py-3 group-data-[header-tall=true]/scroller:top-auto"
    >
      <div className="flex flex-col items-start gap-2">
        {/* Below 21rem of table the photo and the remove button no longer fit side by side; the name stays. */}
        <div className="@max-[21rem]:hidden">
          <ProductPhoto key={product.image} src={product.image} alt="" size="compare" />
        </div>
        <div className="min-w-0">
          <p className="leading-[1.4] font-medium wrap-anywhere text-foreground">
            <Link
              to="/$categoria/$id"
              params={{ categoria: category, id: product.id }}
              search={{ cmp: comparedIdsParam }}
              className="underline-offset-4 hover:underline active:underline"
            >
              {product.name}
            </Link>
          </p>
          <p className="text-caption wrap-anywhere text-muted-foreground">
            {manufacturerName(product.manufacturer)}
          </p>
        </div>
        {product.aliUrl && (
          <a
            href={product.aliUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${product.name} no AliExpress (abre em nova aba)`}
            className="-my-1 inline-flex min-h-8 max-w-full pointer-coarse:min-h-10 flex-wrap items-center gap-1 font-medium wrap-anywhere text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline active:underline"
          >
            Ali{"\u00AD"}Express
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          </a>
        )}
        {swapControl}
      </div>
      {/* Last in the tab order, after the Produto's own links; shown right by its own photo. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remover ${product.name} da comparação`}
        className="absolute start-15 top-3.5 text-muted-foreground hover:text-foreground @max-[21rem]:static @max-[21rem]:mt-1 @max-[21rem]:-ms-2.5 sm:start-20 sm:top-6.5"
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
