import { X } from "lucide-react";
import { useRef } from "react";
import {
  isFilterActive,
  type CategoryFilter,
  type ChoiceFilter,
  type FilterValues,
  type NumberRange,
  type RangeFilter,
} from "./filter-engine";
import type { FilterParam } from "./filter-params";

/** The Filtros panel's number format, so a chip reads a bound as the field shows it. */
const boundFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
  useGrouping: false,
});

/** Past this many marked choices a chip names the first and counts the rest. */
const namedChoiceCount = 2;

function choiceChipText(filter: ChoiceFilter, marked: readonly string[]): string {
  const labels = filter.choices
    .filter((choice) => marked.includes(choice.id))
    .map((choice) => choice.label);
  const [first, ...rest] = labels;
  const summary = labels.length > namedChoiceCount ? `${first} +${rest.length}` : labels.join(", ");
  return `${filter.label}: ${summary}`;
}

function rangeSummary(range: NumberRange | undefined): string {
  const min = range?.min === undefined ? undefined : boundFormat.format(range.min);
  const max = range?.max === undefined ? undefined : boundFormat.format(range.max);
  if (min === undefined) return `até ${max}`;
  return max === undefined ? `a partir de ${min}` : `${min}–${max}`;
}

function rangeChipText(filter: RangeFilter, range: NumberRange | undefined): string {
  return `${filter.label}: ${rangeSummary(range)} ${filter.unit}`;
}

function chipText(filter: CategoryFilter, values: FilterValues): string {
  if (filter.kind === "range") return rangeChipText(filter, values.ranges[filter.param]);
  return choiceChipText(filter, values.choices[filter.param] ?? []);
}

function withoutFilter(values: FilterValues, filter: CategoryFilter): FilterValues {
  return filter.kind === "range"
    ? { ...values, ranges: { ...values.ranges, [filter.param]: undefined } }
    : { ...values, choices: { ...values.choices, [filter.param]: [] } };
}

type ActiveFilterChipsProps = {
  filters: readonly CategoryFilter[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  /** Takes focus when the last chip is removed. */
  focusAfterLastId: string;
};

/** One removable chip per active Filtro, so a phone shows what is applied without the drawer. */
export function ActiveFilterChips({
  filters,
  values,
  onValuesChange,
  focusAfterLastId,
}: ActiveFilterChipsProps) {
  const removeButtons = useRef(new Map<FilterParam, HTMLButtonElement>());
  const active = filters.filter((filter) => isFilterActive(filter, values));
  if (active.length === 0) return null;

  function removeFilter(index: number) {
    const removed = active[index];
    if (!removed) return;
    // The other chips stay mounted, so focus moves before the removed one leaves.
    const next = active[index + 1] ?? active[index - 1];
    const nextButton = next && removeButtons.current.get(next.param);
    (nextButton ?? document.getElementById(focusAfterLastId))?.focus();
    onValuesChange(withoutFilter(values, removed));
  }

  return (
    // Tailwind drops the list markers, and Safari then drops the list role unless it is explicit.
    <ul role="list" aria-label="Filtros ativos" className="flex flex-wrap gap-1.5">
      {active.map((filter, index) => (
        <li
          key={filter.param}
          className="flex min-w-0 items-center gap-0.5 rounded-md border border-border bg-muted py-px ps-2 pe-0.5 text-caption text-foreground tabular-nums"
        >
          <span className="min-w-0 wrap-anywhere">{chipText(filter, values)}</span>
          <button
            type="button"
            ref={(button) => {
              if (button) removeButtons.current.set(filter.param, button);
              else removeButtons.current.delete(filter.param);
            }}
            aria-label={`Remover filtro ${filter.label}`}
            onClick={() => removeFilter(index)}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:bg-hover hover:text-foreground active:bg-active focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-9"
          >
            <X aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
