import type { Product } from "@/data/schema";
import { cn } from "@/lib/utils";
import { FieldValueText } from "@/product-fields/field-value-text";
import { MissingValue } from "@/product-table/table-cells";
import { ComparisonMark } from "./comparison-mark";
import type { ComparisonMarks } from "./highlight-rules";
import type { ResponseSummary, ResponseSummaryRow } from "./response-summary";

const headingId = "resumo-desempenho";

function markAt(marks: ComparisonMarks, position: number): "best" | "tie" | undefined {
  return marks.kind !== "none" && marks.positions.has(position) ? marks.kind : undefined;
}

const markCellClasses = {
  best: "bg-highlight font-medium text-highlight-fg",
  tie: "bg-tie font-medium text-tie-fg",
} as const;

function namesOf(products: readonly Product[]): string {
  return new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(
    products.map((product) => product.name),
  );
}

function verdictOf({ rows, scoreMarks }: ResponseSummary): string {
  if (scoreMarks.kind === "none") return "";
  const leaders = rows.flatMap((row, position) =>
    scoreMarks.positions.has(position) ? [row.product] : [],
  );
  if (scoreMarks.kind === "tie") return `Empate no desempenho: ${namesOf(leaders)}.`;
  return leaders.length === 1
    ? `Melhor desempenho: ${namesOf(leaders)}.`
    : `Melhor desempenho, empatados: ${namesOf(leaders)}.`;
}

/** Rows by score, highest first and unscored last; equal scores share a place. */
function rankedRows(rows: readonly ResponseSummaryRow[]) {
  const ordered = rows
    .map((row, position) => ({ row, position }))
    .toSorted((a, b) => (b.row.score ?? -1) - (a.row.score ?? -1));
  return ordered.map((entry) => ({
    ...entry,
    place:
      entry.row.score === undefined
        ? undefined
        : 1 + ordered.filter(({ row }) => (row.score ?? -1) > (entry.row.score ?? -1)).length,
  }));
}

/**
 * The Resumo de desempenho over the Comparação's table: each mouse's fastest
 * click and sensor times, whatever the connection, and a 0 to 100 score that
 * ranks them, so the best choice reads without going cell by cell.
 */
export function ResponseSummaryTable({ summary }: { summary: ResponseSummary }) {
  const verdict = verdictOf(summary);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:px-4"
    >
      <h2 id={headingId} className="font-serif text-heading-6">
        Resumo de desempenho
      </h2>
      {verdict && <p className="font-medium text-pretty">{verdict}</p>}
      <p className="max-w-prose text-body-sm text-pretty text-fg-secondary">
        O tempo de resposta mais rápido de cada mouse no clique e no sensor, com ou sem fio. A
        pontuação diz quão perto cada um chega do mais rápido desta comparação (100).
      </p>
      <div className="overflow-x-auto">
        <table
          aria-labelledby={headingId}
          className="w-full border-collapse text-body-sm sm:w-auto"
        >
          <thead>
            <tr className="text-start text-fg-secondary">
              <th scope="col" className="px-2 py-1.5 text-start font-normal sm:px-3">
                Mouse
              </th>
              <th scope="col" className="px-2 py-1.5 text-start font-normal sm:px-3">
                Pontuação
              </th>
              {summary.measures.map((measure) => (
                <th
                  key={measure.id}
                  scope="col"
                  className="px-2 py-1.5 text-start font-normal sm:px-3"
                >
                  {measure.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankedRows(summary.rows).map(({ row, position, place }) => (
              <SummaryRow
                key={row.product.id}
                row={row}
                position={position}
                place={place}
                summary={summary}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryRow({
  row,
  position,
  place,
  summary,
}: {
  row: ResponseSummaryRow;
  position: number;
  place: number | undefined;
  summary: ResponseSummary;
}) {
  const scoreMark = markAt(summary.scoreMarks, position);
  return (
    <tr className="border-t border-border-subtle">
      <th scope="row" className="px-2 py-2 text-start align-top font-medium sm:px-3">
        {place !== undefined && (
          <span className="me-1.5 font-mono text-code-xs text-fg-secondary">{place}º</span>
        )}{" "}
        {row.product.name}
      </th>
      <td className={cn("px-2 py-2 align-top sm:px-3", scoreMark && markCellClasses[scoreMark])}>
        {row.score === undefined ? (
          <MissingValue />
        ) : (
          <div className="flex items-center gap-2">
            <div
              aria-hidden="true"
              className="hidden h-1.5 w-16 shrink-0 rounded-full bg-component sm:block"
            >
              <div
                className="h-full rounded-full bg-fg-tertiary"
                style={{ width: `${Math.max(row.score, 2)}%` }}
              />
            </div>
            <span className="font-mono text-code-xs tabular-nums">{row.score}</span>
            {scoreMark && <ComparisonMark kind={scoreMark} />}
          </div>
        )}
      </td>
      {row.responses.map((response, index) => {
        const mark = markAt(summary.measureMarks[index] ?? { kind: "none" }, position);
        return (
          <td
            key={summary.measures[index]?.id ?? index}
            className={cn("px-2 py-2 align-top sm:px-3", mark && markCellClasses[mark])}
          >
            {response === undefined ? (
              <MissingValue />
            ) : (
              <>
                <FieldValueText field={response.field} value={response.value} />
                {mark && <ComparisonMark kind={mark} />}
                {response.connection && (
                  <span className="block text-caption-lg text-fg-secondary">
                    {response.connection}
                  </span>
                )}
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}
