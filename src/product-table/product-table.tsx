import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { useTableDensity, type TableDensity } from "@/appearance/appearance";
import type { Product } from "@/data/schema";
import { fieldLabel } from "@/i18n/labels";
import { isSingleKeyShortcut } from "@/keyboard-shortcuts/page-shortcuts";
import { cn } from "@/lib/utils";
import { CompareCheckbox } from "@/product-compare/compare-checkbox";
import { compareSortValues, isCountEnum, sortValueOf } from "./cell-values";
import { ProductCell, productCellLabelIds, TableCellValue } from "./table-cells";
import { favoritesToggleId } from "./table-toolbar";
import type { SortEntry, TableColumn } from "./table-columns";

/** The shortest row per density; rows with long names or values grow and are measured. */
const rowHeights: Record<TableDensity, number> = { confortavel: 60, compacta: 48 };

const rowSteps: Record<string, number> = { j: 1, ArrowDown: 1, k: -1, ArrowUp: -1 };

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const columnHelper = createColumnHelper<typeof features, Product>();

function headerLabel(column: TableColumn): string {
  switch (column.kind) {
    case "product":
      return "Produto";
    case "price":
      return "Preço";
    case "field":
      return fieldLabel(column.field);
  }
}

/**
 * Width in px of every column but the Product one, which takes what is left:
 * on a wide screen the spare width goes to the names, not between the columns.
 */
function columnWidth(column: TableColumn): number {
  if (column.kind === "price") return 104;
  if (column.kind !== "field") return 0;
  if (column.slug === "nota") return 112;
  if (column.slug === "peso") return 80;
  if (column.field.type === "number") return column.deviation ? 148 : 104;
  return 148;
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
  /** The Produtos marked for the Comparação, at most 4. */
  comparedIds: readonly string[];
  onComparedToggle: (id: string) => void;
  /** The Categoria's Favoritos on this device. */
  favoriteIds: ReadonlySet<string>;
  onFavoriteToggle: (id: string) => void;
  /** "Só favoritos" is on, so an unstarred row leaves the table. */
  favoritesOnly: boolean;
};

export function ProductTable({
  columns,
  products,
  sorting,
  resultKey,
  labelledBy,
  onSortClick,
  comparedIds,
  onComparedToggle,
  favoriteIds,
  onFavoriteToggle,
  favoritesOnly,
}: ProductTableProps) {
  const tableColumns = useMemo(
    () =>
      columnHelper.columns(
        columns.map((column) =>
          columnHelper.accessor((product) => sortValueOf(column, product), {
            id: column.slug,
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

  // Rows outside the scroll window are unmounted, so the focused row and the rows before and
  // after it, each holding its Produto link, stay rendered: Tab and Shift+Tab keep moving.
  const [focusedRowId, setFocusedRowId] = useState<string>();
  const keptIndexes = useMemo(() => {
    const focusedIndex = rows.findIndex((row) => row.id === focusedRowId);
    if (focusedIndex === -1) return [];
    return [focusedIndex - 1, focusedIndex, focusedIndex + 1].filter(
      (index) => index >= 0 && index < rows.length,
    );
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

  // Rows skip rendering while the table scrolls, so their toggle keeps its identity.
  const toggleRef = useRef(onComparedToggle);
  useLayoutEffect(() => {
    toggleRef.current = onComparedToggle;
  });
  const handleComparedToggle = useCallback((id: string) => toggleRef.current(id), []);
  const favoriteToggleRef = useRef(onFavoriteToggle);
  useLayoutEffect(() => {
    favoriteToggleRef.current = (id) => {
      // An unstarred row unmounts with its focused star: focus moves to the next row's star,
      // else the previous one's, else to the toggle that hid the row.
      if (favoritesOnly && favoriteIds.has(id)) {
        const index = rows.findIndex((row) => row.id === id);
        const neighborId = (rows[index + 1] ?? rows[index - 1])?.id;
        const neighborStar = neighborId
          ? scrollRef.current?.querySelector<HTMLElement>(
              `tr[data-row-id="${neighborId}"] button[aria-pressed]`,
            )
          : undefined;
        (neighborStar ?? document.getElementById(favoritesToggleId))?.focus();
      }
      onFavoriteToggle(id);
    };
  });
  const handleFavoriteToggle = useCallback((id: string) => favoriteToggleRef.current(id), []);

  const [density] = useTableDensity();
  const rowHeight = rowHeights[density];
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
  // Rows measured at the other density would keep their old height until they scroll back in.
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, density]);

  // The rows before and after the focused one stay mounted, so the next row is there to focus,
  // and focus scrolls it into view past the sticky header (`scroll-pt-21`).
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (!isSingleKeyShortcut(event.nativeEvent) || !(event.target instanceof Element)) return;
    const row = event.target.closest("tr[data-row-id]");
    if (!row) return;
    // With Caps Lock on, the letter keys still work.
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const step = rowSteps[key];
    if (step !== undefined) {
      event.preventDefault();
      const nextIndex = Number(row.getAttribute("data-index")) + step;
      if (nextIndex < 0 || nextIndex >= rows.length) return;
      // The same control of the next row: the Comparação mark, the star, else the Produto's link.
      const target =
        event.target instanceof HTMLInputElement
          ? "input"
          : event.target instanceof HTMLButtonElement
            ? "button[aria-pressed]"
            : "a[href]";
      event.currentTarget
        .querySelector<HTMLElement>(`tr[data-index="${nextIndex}"] ${target}`)
        ?.focus();
      return;
    }
    if (key === "c") {
      event.preventDefault();
      // Held down, the mark flips once, as a click does.
      if (event.repeat) return;
      row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
      return;
    }
    // On a link, Enter follows it already; on the star, it stars.
    if (
      event.key === "Enter" &&
      !(event.target instanceof HTMLAnchorElement || event.target instanceof HTMLButtonElement)
    ) {
      event.preventDefault();
      row.querySelector<HTMLAnchorElement>("a[href]")?.click();
    }
  };

  const virtualRows = virtualizer.getVirtualItems();
  const fixedWidth = columns.reduce((total, column) => total + columnWidth(column), 0);
  const primarySort = sorting[0];

  // The border sits on a wrapper, so the scroll fade dissolves the columns and not the frame;
  // the fade waits for a touch screen, where it would not hide the scrollbar at the end.
  return (
    <div className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-lg border border-border">
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 scroll-ps-[calc(var(--select-column)+var(--product-column))] scroll-pt-21 overflow-auto pointer-coarse:scroll-fade-e [--product-column:9.5rem] [--select-column:2.25rem] min-[22rem]:[--product-column:11rem] sm:[--product-column:14rem] sm:[--select-column:2.75rem]"
      >
        <table
          aria-labelledby={labelledBy}
          aria-rowcount={rows.length + 1}
          className="table-fixed border-separate border-spacing-0 text-body"
          style={{
            width: `calc(var(--select-column) + var(--product-column) + ${fixedWidth}px)`,
            minWidth: "100%",
          }}
        >
          <colgroup>
            <col style={{ width: "var(--select-column)" }} />
            {columns.map((column) => (
              // The Product column has no width: a fixed table gives it the rest, at least
              // `--product-column`, since the table is that much wider than the others.
              <col
                key={column.slug}
                style={column.kind === "product" ? undefined : { width: columnWidth(column) }}
              />
            ))}
          </colgroup>
          <thead>
            <tr aria-rowindex={1}>
              <th
                scope="col"
                className="sticky start-0 top-0 z-30 border-b border-border bg-background p-0"
              >
                <span className="sr-only">Comparar</span>
              </th>
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
                      "sticky top-0 z-20 border-b border-border bg-background p-0 align-bottom font-medium text-muted-foreground",
                      column.kind === "product" && "start-(--select-column) z-30 border-e",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSortClick(column.slug)}
                      className={cn(
                        "flex w-full items-end gap-1 px-2 py-2.5 text-start text-balance hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-hover sm:px-3",
                        isNumericColumn(column) && "justify-end text-end",
                        column.kind === "product" && "ps-0 sm:ps-0",
                        sortEntry && "text-foreground",
                      )}
                    >
                      {label}
                      <SortIcon
                        aria-hidden="true"
                        className={cn(
                          "mb-0.5 size-3.5 shrink-0",
                          !sortEntry && "text-muted-foreground/70",
                        )}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody onFocus={handleRowFocus} onBlur={handleRowBlur} onKeyDown={handleRowKeyDown}>
            {virtualRows.flatMap((virtualRow, position) => {
              const row = rows[virtualRow.index];
              if (!row) return [];
              const product = row.original;
              // Rows kept for focus can sit apart from the scroll window; a spacer fills each gap.
              const gap = virtualRow.start - (virtualRows[position - 1]?.end ?? 0);
              return [
                <SpacerRow key={`gap-${row.id}`} height={gap} columnCount={columns.length + 1} />,
                <ProductRow
                  key={row.id}
                  product={product}
                  index={virtualRow.index}
                  columns={columns}
                  checked={comparedIds.includes(product.id)}
                  comparedCount={comparedIds.length}
                  onComparedToggle={handleComparedToggle}
                  isFavorite={favoriteIds.has(product.id)}
                  onFavoriteToggle={handleFavoriteToggle}
                  measureRef={virtualizer.measureElement}
                  density={density}
                />,
              ];
            })}
            <SpacerRow
              height={virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0)}
              columnCount={columns.length + 1}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ProductRowProps = {
  product: Product;
  /** Position in the sorted rows, for the virtualizer and `aria-rowindex`. */
  index: number;
  columns: TableColumn[];
  checked: boolean;
  comparedCount: number;
  onComparedToggle: (id: string) => void;
  isFavorite: boolean;
  onFavoriteToggle: (id: string) => void;
  measureRef: (row: HTMLTableRowElement | null) => void;
  density: TableDensity;
};

/**
 * One Produto row, memoized: a scroll re-renders the table on every frame,
 * and only the rows entering the window need to render.
 */
const ProductRow = memo(function ProductRow({
  product,
  index,
  columns,
  checked,
  comparedCount,
  onComparedToggle,
  isFavorite,
  onFavoriteToggle,
  measureRef,
  density,
}: ProductRowProps) {
  const cellPadding = density === "compacta" ? "py-1" : "py-1.5";
  return (
    <tr
      ref={measureRef}
      data-index={index}
      data-row-id={product.id}
      aria-rowindex={index + 2}
      style={{ height: rowHeights[density] }}
    >
      <td className="sticky start-0 z-10 border-b border-border/60 bg-background p-0">
        <CompareCheckbox
          productName={product.name}
          checked={checked}
          comparedCount={comparedCount}
          onToggle={() => onComparedToggle(product.id)}
        />
      </td>
      {columns.map((column) =>
        column.kind === "product" ? (
          <th
            key={column.slug}
            scope="row"
            aria-labelledby={productCellLabelIds(product)}
            className={cn(
              "sticky start-(--select-column) z-10 border-e border-b border-border/60 bg-background ps-0 pe-2 text-start font-normal sm:pe-3",
              cellPadding,
            )}
          >
            <ProductCell
              product={product}
              density={density}
              favorite={{ isFavorite, onToggle: () => onFavoriteToggle(product.id) }}
            />
          </th>
        ) : (
          <td
            key={column.slug}
            className={cn(
              "border-b border-border/60 px-2 tabular-nums sm:px-3",
              cellPadding,
              isNumericColumn(column) && "text-end",
            )}
          >
            <TableCellValue column={column} product={product} />
          </td>
        ),
      )}
    </tr>
  );
});

function SpacerRow({ height, columnCount }: { height: number; columnCount: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true" style={{ height }}>
      <td colSpan={columnCount} className="p-0" />
    </tr>
  );
}
