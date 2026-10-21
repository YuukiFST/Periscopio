import { Check, Equal } from "lucide-react";

/** The Destaque's accessible label: the cell is never told apart by its color alone. */
export const highlightLabel = "melhor nesta medida";
/** The Empate's accessible label, for the same reason. */
export const tieLabel = "empate nesta medida";

/** The icon after a marked value: a check for the Destaque, an equals sign for the Empate. */
export function ComparisonMark({ kind }: { kind: "best" | "tie" }) {
  const Icon = kind === "best" ? Check : Equal;
  return (
    <Icon
      role="img"
      aria-label={kind === "best" ? highlightLabel : tieLabel}
      strokeWidth={2.5}
      className="ms-1.5 inline-block size-3.5 align-[-0.125em]"
    />
  );
}
