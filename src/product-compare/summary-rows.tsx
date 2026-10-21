import { cn } from "@/lib/utils";
import { FieldValueText } from "@/product-fields/field-value-text";
import { MissingValue } from "@/product-table/table-cells";
import { MarkIcon, markCellClass } from "./comparison-mark";
import type { CellMark } from "./highlight-rules";
import type { Connection } from "./mouse-connection";
import { GroupHeaderRow, RowLabel, valueCellClass } from "./comparison-rows";
import type { ResponseSummary, SummaryStanding } from "./response-summary";

const nameList = new Intl.ListFormat("pt-BR", { type: "conjunction" });

/** One line naming the best mouse on the chosen connection, or why there is none. */
export function summaryVerdict(summary: ResponseSummary): string {
  const { rows, scoreMarks, connection } = summary;
  const onConnection = connection === undefined ? "" : ` ${connection}`;
  const ranked = rows.filter(({ standing }) => standing.kind === "ranked");
  if (ranked.length === 0) return `Nenhum destes mouses tem as medições do resumo${onConnection}.`;
  if (ranked.length === 1) {
    return `Só ${ranked[0]?.product.name} tem as medições do resumo${onConnection}.`;
  }
  const leaders = nameList.format(
    rows.flatMap(({ product }, position) => (scoreMarks[position] ? [product.name] : [])),
  );
  return scoreMarks.includes("tie")
    ? `Empate no desempenho${onConnection}: ${leaders}.`
    : `Melhor desempenho${onConnection}: ${leaders}.`;
}

/**
 * The Resumo de desempenho as the first rows of the Comparação, so each
 * mouse's place, score and fastest times sit in its own column and scroll
 * with the rest of the table.
 */
export function SummaryRowGroup({ summary }: { summary: ResponseSummary }) {
  const headingId = "comparacao-resumo";
  const { rows, measures, measureMarks, scoreMarks } = summary;
  return (
    <tbody aria-labelledby={headingId}>
      <GroupHeaderRow
        headingId={headingId}
        title="Resumo de desempenho"
        columnCount={rows.length}
      />
      <tr>
        <RowLabel>
          Pontuação
          <span className="block text-caption-lg">100 = o mais rápido em tudo</span>
        </RowLabel>
        {rows.map((row, position) => (
          <td
            key={row.product.id}
            className={cn(valueCellClass, markCellClass(scoreMarks[position]))}
          >
            <ScoreValue
              standing={row.standing}
              connection={summary.connection}
              mark={scoreMarks[position]}
            />
          </td>
        ))}
      </tr>
      {measures.map((measure, index) => (
        <tr key={measure.id}>
          <RowLabel>{measure.label}</RowLabel>
          {rows.map((row, position) => {
            const response = row.responses[index];
            const mark = measureMarks[index]?.[position];
            return (
              <td key={row.product.id} className={cn(valueCellClass, markCellClass(mark))}>
                {response === undefined ? (
                  <MissingValue />
                ) : (
                  <>
                    <FieldValueText
                      field={response.field}
                      value={response.value}
                      className="whitespace-normal"
                    />
                    <MarkIcon mark={mark} />
                    {/* With a connection chosen, every time is on it, so only "any" names it. */}
                    {summary.connection === undefined && response.connection && (
                      <span className="block text-caption-lg font-normal text-fg-secondary">
                        {response.connection}
                      </span>
                    )}
                  </>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}

const otherConnection: Record<Connection, Connection> = {
  "com fio": "sem fio",
  "sem fio": "com fio",
};

function standingText(kind: Exclude<SummaryStanding["kind"], "ranked">, connection?: Connection) {
  const onConnection = connection === undefined ? "" : ` ${connection}`;
  switch (kind) {
    case "incomplete":
      return `Falta medição${onConnection}`;
    case "unmeasured":
      return `Sem medição${onConnection}`;
    case "lacks-connection":
      // Only reached with a connection chosen: the mouse works on the other one alone.
      return connection === undefined ? "Sem medição" : `Só ${otherConnection[connection]}`;
  }
}

function ScoreValue({
  standing,
  connection,
  mark,
}: {
  standing: SummaryStanding;
  connection: Connection | undefined;
  mark: CellMark;
}) {
  if (standing.kind !== "ranked") {
    return (
      <span className="font-normal text-fg-secondary">
        {standingText(standing.kind, connection)}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-mono text-code-xs">{standing.place}º</span>
      <span
        aria-hidden="true"
        className="hidden h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-component sm:block"
      >
        <span
          className="block h-full rounded-full bg-fg-tertiary"
          style={{ width: `${Math.max(standing.score, 4)}%` }}
        />
      </span>
      <span className="font-mono text-code-xs">
        {standing.score}
        <MarkIcon mark={mark} />
      </span>
    </span>
  );
}
