import { Check, Equal } from "lucide-react";
import type { CellMark } from "./highlight-rules";

/** Accessible labels: a marked cell is never told apart by its color alone. */
const markLabels = {
  best: "melhor nesta linha",
  tie: "empate nesta linha",
} as const;

/** The marked cell's colors: green for the Destaque, blue for the Empate. */
export function markCellClass(mark: CellMark): string | undefined {
  if (mark === "best") return "bg-highlight font-medium text-highlight-fg";
  if (mark === "tie") return "bg-tie font-medium text-tie-fg";
  return undefined;
}

/** The icon after a marked value: a check for the Destaque, an equals sign for the Empate. */
export function MarkIcon({ mark }: { mark: CellMark }) {
  if (mark === undefined) return null;
  const Icon = mark === "best" ? Check : Equal;
  return (
    <Icon
      role="img"
      aria-label={markLabels[mark]}
      strokeWidth={2.5}
      className="ms-1.5 inline-block size-3.5 align-[-0.125em]"
    />
  );
}
