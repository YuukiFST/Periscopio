import type { ReactNode } from "react";

/** A value cell of the Comparação: one Produto's value in one row. */
export const valueCellClass =
  "border-b border-border-subtle px-2 py-2 align-top tabular-nums hyphens-auto sm:px-3";

/** The row's label, fixed at the start while the Produto columns scroll sideways. */
export function RowLabel({ children }: { children: ReactNode }) {
  return (
    <th
      scope="row"
      className="sticky start-0 z-10 border-e border-b border-border-subtle bg-page px-2 py-2 text-start align-top font-normal text-pretty text-fg-secondary sm:px-3"
    >
      {children}
    </th>
  );
}

/** A group's title across the table; `children` sit after it, such as a fold button. */
export function GroupHeaderRow({
  headingId,
  title,
  columnCount,
  children,
}: {
  headingId: string;
  title: string;
  /** Compared Produtos; the row spans them and the label column. */
  columnCount: number;
  children?: ReactNode;
}) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={columnCount + 1}
        className="border-b border-border-subtle bg-component p-0 text-start"
      >
        <span className="sticky start-0 inline-flex min-h-9 items-center gap-2 px-2 py-1.5 sm:px-3">
          <span id={headingId} className="font-serif text-body-base font-medium">
            {title}
          </span>
          {children}
        </span>
      </th>
    </tr>
  );
}
