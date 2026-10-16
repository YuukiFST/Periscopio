import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import type { Product } from "@/data/schema";
import { fieldLabel } from "@/i18n/labels";
import { cn } from "@/lib/utils";
import { compareSortValues, isCountEnum, sortValueOf } from "./cell-values";
import { ProductCell, TableCellValue } from "./table-cells";
import type { SortEntry, TableColumn } from "./table-columns";

/** The shortest row; rows with long names or values grow and are measured. */
const rowHeight = 60;

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const columnHelper = createColumnHelper<typeof features, Product>();

function headerLabel(column: TableColumn): string {
  switch (column.kind) {
    case "product":
      return "Produto";
    case "aliexpress":
      return "AliExpress";
    case "price":
      return "Preço";
    case "field":
      return fieldLabel(column.field);
  }
}

/** Width in px of every column but the Product one, which follows the viewport. */
function columnWidth(column: TableColumn): number {
  if (column.kind === "aliexpress" || column.kind === "price") return 120;
  if (column.kind !== "field") return 0;
  if (column.slug === "nota") return 112;
  if (column.slug === "mcu") return 200;
  if (column.field.type === "number") return column.deviation ? 168 : 128;
  return 160;
}

export function isNumericColumn(column: TableColumn): boolean {
  if (column.kind === "price") return true;
  return column.kind === "field" && (column.field.type === "number" || isCountEnum(column.field));
}

type ProductTableProps = {
  columns: TableColumn[];
  products: Product[];
  sorting: SortEntry[];
  /** Changes whenever the rows change, to bring the list back to its top. */
  resultKey: string;
  /** Id of the heading that names the table. */
  labelledBy: string;
  onSortClick: (slug: string) => void;
};

export function ProductTable({
  columns,
  products,
  sorting,
  resultKey,
  labelledBy,
  onSortClick,
}: ProductTableProps) {
  const tableColumns = useMemo(
    () =>
      columnHelper.columns(
        columns.map((column) =>
          columnHelper.accessor((product) => sortValueOf(column, product), {
            id: column.slug,
            enableSorting: column.kind !== "aliexpress",
            sortUndefined: "last",
            sortFn: (rowA, rowB) =>
              compareSortValues(
                sortValueOf(column, rowA.original),
                sortValueOf(column, rowB.original),
              ),
          }),
        ),
      ),
    [columns],
  );
  const sortingState = useMemo(
    () => sorting.map(({ slug, desc }) => ({ id: slug, desc })),
    [sorting],
  );
  const table = useTable({
    features,
    columns: tableColumns,
    data: products,
    getRowId: (product) => product.id,
    state: { sorting: sortingState },
  });
  const rows = table.getRowModel().rows;

  // Rows outside the scroll window are unmounted, so the focused row and the rows holding the
  // links before and after it stay rendered: Tab and Shift+Tab keep moving through the table.
  const [focusedRowId, setFocusedRowId] = useState<string>();
  const keptIndexes = useMemo(() => {
    const focusedIndex = rows.findIndex((row) => row.id === focusedRowId);
    if (focusedIndex === -1) return [];
    const hasLink = (index: number) => Boolean(rows[index]?.original.aliUrl);
    const kept = [focusedIndex];
    const previous = rows.findLastIndex((_, index) => index < focusedIndex && hasLink(index));
    const next = rows.findIndex((_, index) => index > focusedIndex && hasLink(index));
    if (previous !== -1) kept.push(previous);
    if (next !== -1) kept.push(next);
    return kept;
  }, [rows, focusedRowId]);
  const rangeExtractor = useCallback(
    (range: Range) =>
      [...new Set([...defaultRangeExtractor(range), ...keptIndexes])].toSorted((a, b) => a - b),
    [keptIndexes],
  );
  const handleRowFocus = (event: FocusEvent<HTMLTableSectionElement>) => {
    const row = event.target instanceof Element ? event.target.closest("tr[data-row-id]") : null;
    setFocusedRowId(row?.getAttribute("data-row-id") ?? undefined);
  };
  const handleRowBlur = (event: FocusEvent<HTMLTableSectionElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node && event.currentTarget.contains(next))) setFocusedRowId(undefined);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual returns a mutable instance by design; this app does not run the React Compiler.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
    rangeExtractor,
  });
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resultKey]);

  const virtualRows = virtualizer.getVirtualItems();
  const fixedWidth = columns.reduce((total, column) => total + columnWidth(column), 0);
  const primarySort = sorting[0];

  return (
    <div
      ref={scrollRef}
      className="relative min-h-72 flex-1 scroll-ps-(--product-column) scroll-pt-21 overflow-auto overscroll-contain rounded-lg border border-border [--product-column:9.5rem] min-[22rem]:[--product-column:11rem] sm:[--product-column:17rem]"
    >
      <table
        aria-labelledby={labelledBy}
        aria-rowcount={rows.length + 1}
        className="table-fixed border-separate border-spacing-0 text-body-sm"
        style={{ width: `calc(var(--product-column) + ${fixedWidth}px)`, minWidth: "100%" }}
      >
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.slug}
              style={{
                width: column.kind === "product" ? "var(--product-column)" : columnWidth(column),
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr aria-rowindex={1}>
            {columns.map((column) => {
              const sortIndex = sorting.findIndex(({ slug }) => slug === column.slug);
              const sortEntry = sorting[sortIndex];
              const isPrimary = primarySort?.slug === column.slug;
              const ariaSort = !isPrimary
                ? undefined
                : primarySort.desc
                  ? "descending"
                  : "ascending";
              const SortIcon = !sortEntry ? ChevronsUpDown : sortEntry.desc ? ArrowDown : ArrowUp;
              const label = headerLabel(column);
              return (
                <th
                  key={column.slug}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    "sticky top-0 z-20 border-b border-border bg-page p-0 align-bottom font-medium text-fg-secondary",
                    column.kind === "product" && "start-0 z-30 border-e",
                  )}
                >
                  {column.kind === "aliexpress" ? (
                    <span className="block px-2 py-2.5 text-start sm:px-3">{label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSortClick(column.slug)}
                      className={cn(
                        "flex w-full touch-manipulation items-end gap-1 px-2 py-2.5 text-start text-balance hover:text-fg-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-component-hover sm:px-3",
                        isNumericColumn(column) && "justify-end text-end",
                        sortEntry && "text-fg-primary",
                      )}
                    >
                      {label}
                      <SortIcon
                        aria-hidden="true"
                        className={cn("mb-0.5 size-3.5 shrink-0", !sortEntry && "text-fg-tertiary")}
                      />
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody onFocus={handleRowFocus} onBlur={handleRowBlur}>
          {virtualRows.flatMap((virtualRow, position) => {
            const row = rows[virtualRow.index];
            if (!row) return [];
            const product = row.original;
            // Rows kept for focus can sit apart from the scroll window; a spacer fills each gap.
            const gap = virtualRow.start - (virtualRows[position - 1]?.end ?? 0);
            return [
              <SpacerRow key={`gap-${row.id}`} height={gap} columnCount={columns.length} />,
              <tr
                key={row.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                data-row-id={row.id}
                aria-rowindex={virtualRow.index + 2}
                style={{ height: rowHeight }}
              >
                {columns.map((column) =>
                  column.kind === "product" ? (
                    <th
                      key={column.slug}
                      scope="row"
                      className="sticky start-0 z-10 border-e border-b border-border-subtle bg-page px-2 py-1.5 text-start font-normal sm:px-3"
                    >
                      <ProductCell product={product} />
                    </th>
                  ) : (
                    <td
                      key={column.slug}
                      className={cn(
                        "border-b border-border-subtle px-2 py-1.5 tabular-nums sm:px-3",
                        isNumericColumn(column) && "text-end",
                      )}
                    >
                      <TableCellValue column={column} product={product} />
                    </td>
                  ),
                )}
              </tr>,
            ];
          })}
          <SpacerRow
            height={virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0)}
            columnCount={columns.length}
          />
        </tbody>
      </table>
    </div>
  );
}

function SpacerRow({ height, columnCount }: { height: number; columnCount: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true" style={{ height }}>
      <td colSpan={columnCount} className="p-0" />
    </tr>
  );
}
