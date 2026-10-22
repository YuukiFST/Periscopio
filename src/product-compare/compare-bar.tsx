import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CategorySlug } from "@/categories";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { maxComparedProducts, minComparedProducts, productIdsParam } from "./compare-selection";

/** The bar's status line; a disabled fifth mark points at it for the reason. */
export const compareStatusId = "comparacao-status";

function compareStatusText(count: number): string {
  if (count === 0) return "";
  if (count >= maxComparedProducts) {
    return `${maxComparedProducts} produtos marcados, o limite da comparação. Desmarque um para trocar.`;
  }
  const marked = count === 1 ? "1 produto marcado" : `${count} produtos marcados`;
  const missing = minComparedProducts - count;
  if (missing <= 0) return `${marked}.`;
  return `${marked}. Marque mais ${missing} para comparar.`;
}

type CompareBarProps = {
  category: CategorySlug;
  /** The marked Produtos, at most 4, all of `category`. */
  comparedIds: readonly string[];
  onClear: () => void;
  /** Where focus goes after "Desmarcar todos", since the bar and its button go away. */
  focusAfterClearId: string;
  /** Applies while the bar shows. */
  className?: string;
};

/**
 * "Comparar (n/4)" with the marked count, shown while at least one Produto is
 * marked. The status line stays mounted, empty, with nothing marked, so screen
 * readers announce the first mark.
 */
export function CompareBar({
  category,
  comparedIds,
  onClear,
  focusAfterClearId,
  className,
}: CompareBarProps) {
  const count = comparedIds.length;
  const label = `Comparar (${count}/${maxComparedProducts})`;
  function clear() {
    onClear();
    document.getElementById(focusAfterClearId)?.focus();
  }
  return (
    <div
      role={count > 0 ? "region" : undefined}
      aria-label={count > 0 ? "Comparação" : undefined}
      className={
        count === 0
          ? "sr-only"
          : cn(
              "flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-lg border border-border bg-container px-3 py-2",
              className,
            )
      }
    >
      <p
        id={compareStatusId}
        aria-live="polite"
        className="me-auto min-w-0 flex-1 basis-56 text-pretty text-fg-secondary"
      >
        {compareStatusText(count)}
      </p>
      {count > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="lg" onClick={clear}>
            Desmarcar todos
          </Button>
          {count >= minComparedProducts ? (
            <Link
              to="/comparar/$categoria"
              params={{ categoria: category }}
              search={{ p: productIdsParam(comparedIds) }}
              className={cn(buttonVariants({ size: "lg" }), "tabular-nums")}
            >
              {label}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          ) : (
            <Button
              size="lg"
              disabled
              focusableWhenDisabled
              aria-describedby={compareStatusId}
              className="tabular-nums"
            >
              {label}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
