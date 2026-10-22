import { cn } from "@/lib/utils";
import { compareStatusId } from "./compare-bar";
import { maxComparedProducts } from "./compare-selection";

type CompareCheckboxProps = {
  productName: string;
  checked: boolean;
  /** How many Produtos are marked, this one included when checked. */
  comparedCount: number;
  onToggle: () => void;
};

/**
 * A table row's mark for the Comparação. With 4 marked, the others stay
 * focusable but refuse the mark, and point at the bar that says why.
 */
export function CompareCheckbox({
  productName,
  checked,
  comparedCount,
  onToggle,
}: CompareCheckboxProps) {
  const isBlocked = !checked && comparedCount >= maxComparedProducts;
  return (
    <label
      className={cn(
        "grid h-full min-h-11 w-full place-items-center",
        isBlocked ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        aria-label={`Comparar ${productName}`}
        aria-disabled={isBlocked || undefined}
        aria-describedby={isBlocked ? compareStatusId : undefined}
        checked={checked}
        onChange={() => {
          if (!isBlocked) onToggle();
        }}
        className={cn(
          "size-4 accent-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
      />
    </label>
  );
}
