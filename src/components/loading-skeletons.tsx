import { cn } from "@/lib/utils";
import { maxComparedProducts, minComparedProducts } from "@/product-compare/compare-selection";

/** Rows enough to fill a tall screen; the frame clips the rest. */
const skeletonRowCount = 32;
const skeletonValueColumns = [0, 1, 2, 3, 4, 5];

/** One placeholder shape; the skeleton around it pulses as a whole. */
function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-component", className)} />;
}

/** Pulses once for every shape inside, and only when the system allows motion. */
const skeletonShapesClass = "flex min-h-0 flex-1 flex-col gap-4 motion-safe:animate-pulse";

/**
 * The page's title row: the heading and its buttons, at their final heights
 * so the view below them does not move when the data arrives.
 */
function TitleRowSkeleton({
  headingWidth,
  withUpdatedAt = false,
  buttonWidths = ["w-28"],
}: {
  headingWidth: string;
  /** The Categoria shows when the last Atualização ran, beside its title or under it. */
  withUpdatedAt?: boolean;
  /** One width per button, in order; the Copiar link button alone by default. */
  buttonWidths?: readonly string[];
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex h-[calc(var(--text-heading-5)*var(--text-heading-5--line-height))] items-center">
          <Bone className={cn("h-6 max-w-full", headingWidth)} />
        </div>
        {withUpdatedAt && <Bone className="my-0.5 h-4 w-52" />}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {buttonWidths.map((width, index) => (
          <Bone key={index} className={cn("h-9 shrink-0 rounded-lg pointer-coarse:h-10", width)} />
        ))}
      </div>
    </div>
  );
}

/**
 * The Categoria page while its Produtos load, shaped like `CategoryTable`:
 * title row, the Filtros panel at `lg`, the toolbar and rows of the table's
 * 60 px height. `status` is what screen readers hear.
 */
export function CategorySkeleton({ status }: { status: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p role="status" className="sr-only">
        {status}
      </p>
      <div aria-hidden="true" className={skeletonShapesClass}>
        <TitleRowSkeleton headingWidth="w-28" withUpdatedAt />
        <div className="flex min-h-0 flex-1 gap-6">
          <div className="-ms-2 hidden w-64 shrink-0 flex-col gap-3 ps-2 pe-2 lg:flex xl:w-72">
            <div className="flex min-h-9 items-center justify-between gap-2">
              <Bone className="h-5 w-16" />
              <Bone className="h-4 w-12" />
            </div>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 pt-3">
                <Bone className="h-4 w-24" />
                <Bone className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <Bone className="h-9 w-full rounded-lg sm:w-72" />
              <Bone className="h-9 w-60 rounded-lg pointer-coarse:h-11 sm:w-64" />
              <Bone className="h-9 w-24 rounded-lg pointer-coarse:h-10 lg:hidden" />
              <Bone className="h-4 w-28" />
            </div>
            <div className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-lg border border-border">
              <div className="flex h-15 shrink-0 items-end border-b border-border pb-3">
                <div className="w-9 shrink-0 sm:w-11" />
                <Bone className="h-4 w-16" />
              </div>
              {Array.from({ length: skeletonRowCount }, (_, index) => (
                <div
                  key={index}
                  className="flex h-15 shrink-0 items-center border-b border-border-subtle"
                >
                  <div className="flex w-9 shrink-0 justify-center sm:w-11">
                    <Bone className="size-4 rounded-sm" />
                  </div>
                  <div className="flex h-full w-38 shrink-0 items-center gap-2 border-e border-border-subtle pe-2 min-[22rem]:w-44 sm:w-56 sm:gap-3 sm:pe-3">
                    <Bone className="size-8 shrink-0 sm:size-10" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Bone className="h-3.5 w-4/5" />
                      <Bone className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 gap-6 overflow-hidden px-3">
                    {skeletonValueColumns.map((column) => (
                      <Bone key={column} className="h-3.5 w-20 shrink-0" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A phone shows 2 Produto columns, a tablet 3, a wide screen 4, as the Comparação's table does. */
function comparisonColumnClass(index: number): string {
  return cn("min-w-0 flex-1 px-1.5 min-[22rem]:px-2 sm:px-3", {
    "hidden md:block": index === 2,
    "hidden lg:block": index === 3,
  });
}

/**
 * The Comparação while its Produtos load: title row and one column per Produto
 * in the link, 2 to 4, as many as the table shows side by side on the screen.
 */
export function ComparisonSkeleton({
  status,
  linkedCount,
  withConnectionRow,
}: {
  status: string;
  /** The Produto ids in the link. */
  linkedCount: number;
  /** A mouse Comparação puts the Conexão choice and its verdict above the table. */
  withConnectionRow: boolean;
}) {
  const columnCount = Math.min(Math.max(linkedCount, minComparedProducts), maxComparedProducts);
  const columns = Array.from({ length: columnCount }, (_, index) => index);
  return (
    <div
      style={{ maxWidth: `calc(var(--label-column) + ${columnCount} * 24rem + 2px)` }}
      className="flex min-h-0 flex-1 flex-col [--label-column:7.25rem] min-[22rem]:[--label-column:7.5rem] sm:[--label-column:11rem] lg:[--label-column:14rem]"
    >
      <p role="status" className="sr-only">
        {status}
      </p>
      <div aria-hidden="true" className={skeletonShapesClass}>
        <div className="flex min-h-8 items-center pointer-coarse:min-h-11">
          <Bone className="h-4 w-36" />
        </div>
        <TitleRowSkeleton
          headingWidth="w-56"
          // Adicionar produto below 4 Produtos, Copiar link from 2.
          buttonWidths={[
            ...(linkedCount < maxComparedProducts ? ["w-40"] : []),
            ...(linkedCount >= minComparedProducts ? ["w-28"] : []),
          ]}
        />
        {withConnectionRow && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Bone className="h-9 w-72 rounded-lg pointer-coarse:h-11" />
            <Bone className="h-4 w-96 max-w-full" />
          </div>
        )}
        <div className="flex min-h-72 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex shrink-0 border-b border-border">
            <div className="flex w-(--label-column) shrink-0 flex-col justify-end gap-1.5 border-e border-border p-2 sm:p-3">
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-4/5" />
              <Bone className="h-3 w-3/5" />
            </div>
            {columns.map((index) => (
              <div key={index} className={cn(comparisonColumnClass(index), "py-2 sm:py-3")}>
                <Bone className="size-12 rounded-lg sm:size-16" />
                <Bone className="mt-2 h-4 w-3/4" />
                <Bone className="mt-1.5 h-3 w-1/3" />
                <Bone className="mt-2 h-7 w-20 rounded-lg pointer-coarse:h-10" />
              </div>
            ))}
          </div>
          <div className="flex min-h-9 shrink-0 items-center border-b border-border-subtle bg-component px-2 sm:px-3">
            <Bone className="h-4 w-36 bg-component-active" />
          </div>
          {Array.from({ length: skeletonRowCount }, (_, row) => (
            <div key={row} className="flex h-9 shrink-0 items-center border-b border-border-subtle">
              <div className="flex h-full w-(--label-column) shrink-0 items-center border-e border-border-subtle px-2 sm:px-3">
                <Bone className="h-3.5 w-3/4" />
              </div>
              {columns.map((index) => (
                <div key={index} className={comparisonColumnClass(index)}>
                  <Bone className="h-3.5 w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The Gráfico while its Produtos load: the way back, title row, the two axis choices and the plot. */
export function ChartSkeleton({ status }: { status: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p role="status" className="sr-only">
        {status}
      </p>
      <div aria-hidden="true" className={skeletonShapesClass}>
        <div className="flex min-h-8 items-center pointer-coarse:min-h-11">
          <Bone className="h-4 w-36" />
        </div>
        <TitleRowSkeleton headingWidth="w-48" />
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-1">
              <Bone className="h-4 w-28" />
              <Bone className="h-9 w-48 rounded-lg pointer-coarse:h-10" />
            </div>
          ))}
          <Bone className="h-4 w-72 max-w-full" />
        </div>
        <Bone className="h-72 w-full rounded-lg sm:h-96" />
      </div>
    </div>
  );
}
