import { ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeForSearch } from "@/product-table/product-filter";
import {
  isFilterActive,
  type CategoryFilter,
  type ChoiceFilter,
  type FilterValues,
  type NumberRange,
  type RangeFilter,
} from "./filter-engine";
import { typedBoundPattern } from "./filter-link";
import type { FilterParam } from "./filter-params";

type FilterPanelProps = {
  filters: readonly CategoryFilter[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  /** Changes on "Limpar", so a range field also drops text that never reached the link. */
  clearCount: number;
};

function withChoice(
  values: FilterValues,
  param: FilterParam,
  id: string,
  marked: boolean,
): FilterValues {
  const current = values.choices[param] ?? [];
  const next = marked ? [...current, id] : current.filter((markedId) => markedId !== id);
  return { ...values, choices: { ...values.choices, [param]: next } };
}

function withRange(values: FilterValues, param: FilterParam, range: NumberRange): FilterValues {
  return { ...values, ranges: { ...values.ranges, [param]: range } };
}

/** Every Filtro of the Categoria, the advanced ones behind a disclosure, as on EyeJoker. */
export function FilterPanel({ filters, values, onValuesChange, clearCount }: FilterPanelProps) {
  const advancedId = useId();
  const advancedFilters = filters.filter((filter) => filter.advanced);
  const activeAdvancedCount = advancedFilters.filter((filter) =>
    isFilterActive(filter, values),
  ).length;
  const [advancedOpen, setAdvancedOpen] = useState(activeAdvancedCount > 0);
  const renderFilter = (filter: CategoryFilter) =>
    filter.kind === "range" ? (
      <RangeFilterFields
        key={`${filter.param}-${clearCount}`}
        filter={filter}
        range={values.ranges[filter.param]}
        onRangeChange={(range) => onValuesChange(withRange(values, filter.param, range))}
      />
    ) : (
      <ChoiceFilterFields
        key={`${filter.param}-${clearCount}`}
        filter={filter}
        marked={values.choices[filter.param] ?? []}
        onMarkedChange={(id, marked) =>
          onValuesChange(withChoice(values, filter.param, id, marked))
        }
      />
    );

  return (
    <div className="flex flex-col gap-5">
      {filters.filter((filter) => !filter.advanced).map(renderFilter)}
      {advancedFilters.length > 0 && (
        <div className="flex flex-col gap-5">
          <Button
            variant="ghost"
            aria-expanded={advancedOpen}
            aria-controls={advancedId}
            onClick={() => setAdvancedOpen((open) => !open)}
            className="-mx-2 justify-between px-2 text-fg-secondary aria-expanded:bg-transparent aria-expanded:hover:bg-muted aria-expanded:active:bg-component-hover"
          >
            {!advancedOpen && activeAdvancedCount > 0
              ? `Filtros avançados (${activeAdvancedCount})`
              : "Filtros avançados"}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "motion-safe:transition-[rotate] motion-safe:duration-150 motion-safe:ease-out-quint",
                advancedOpen && "rotate-180",
              )}
            />
          </Button>
          <div id={advancedId} hidden={!advancedOpen} className="flex flex-col gap-5">
            {advancedFilters.map(renderFilter)}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLegend({ children }: { children: string }) {
  return <legend className="mb-2 font-medium text-fg-primary">{children}</legend>;
}

/** A list Filtro past this many choices gets a search box (spec: "com busca acima de 12 itens"). */
const searchableChoiceCount = 12;

/** Letters and digits only, so "paw 3950", "3950hs" and "owl-eye" find "PAW3950 HS" and "Owl-Eye 19K". */
function compactForSearch(text: string): string {
  return normalizeForSearch(text).replace(/[^\p{L}\p{N}]/gu, "");
}

function choiceMatchesQuery(label: string, query: string): boolean {
  const compactLabel = compactForSearch(label);
  return query
    .split(/\s+/)
    .map(compactForSearch)
    .every((word) => compactLabel.includes(word));
}

type ChoiceFilterFieldsProps = {
  filter: ChoiceFilter;
  marked: readonly string[];
  onMarkedChange: (id: string, marked: boolean) => void;
};

function ChoiceFilterFields({ filter, marked, onMarkedChange }: ChoiceFilterFieldsProps) {
  const [query, setQuery] = useState("");
  const [toggledIds, setToggledIds] = useState<readonly string[]>([]);
  const isSearchable = filter.choices.length > searchableChoiceCount;
  const trimmedQuery = query.trim();
  const matching = filter.choices.filter((choice) => choiceMatchesQuery(choice.label, query));
  // A marked choice stays in the list while searching, so the search never hides what is on;
  // one toggled during this search stays too, so unmarking it never drops the focus.
  const shown = filter.choices.filter(
    (choice) =>
      marked.includes(choice.id) || toggledIds.includes(choice.id) || matching.includes(choice),
  );
  function changeQuery(text: string) {
    setQuery(text);
    setToggledIds([]);
  }
  const searchLabel = `Buscar ${filter.label.toLocaleLowerCase("pt-BR")}`;

  return (
    <fieldset className="min-w-0">
      <FilterLegend>{filter.label}</FilterLegend>
      {isSearchable && (
        <div className="relative mb-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
          />
          <Input
            type="search"
            name={`${filter.param}-busca`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={(event) => {
              // Escape clears a typed search before it closes the drawer around it.
              if (event.key !== "Escape" || query === "") return;
              event.stopPropagation();
              changeQuery("");
            }}
            className="h-9 ps-8"
          />
        </div>
      )}
      <div
        // In the drawer a drag on this list scrolls it, instead of pulling the drawer closed.
        data-base-ui-swipe-ignore={isSearchable ? "y" : undefined}
        className={cn(
          "flex flex-wrap gap-1.5",
          isSearchable && "scroll-fade-y -m-1 max-h-52 overflow-y-auto p-1 [scrollbar-width:thin]",
        )}
      >
        {shown.map((choice) => (
          <label key={choice.id} className="relative">
            <input
              type="checkbox"
              className="peer absolute inset-0 cursor-pointer appearance-none rounded-md opacity-0"
              checked={marked.includes(choice.id)}
              onChange={(event) => {
                setToggledIds((ids) => (ids.includes(choice.id) ? ids : [...ids, choice.id]));
                onMarkedChange(choice.id, event.target.checked);
              }}
            />
            <span className="flex min-h-8 cursor-pointer items-center rounded-md border border-border px-2.5 py-1 text-fg-secondary transition-[color,background-color,border-color] duration-150 ease-out-quint peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring peer-hover:border-border-strong peer-hover:text-fg-primary peer-checked:peer-hover:border-primary peer-checked:peer-hover:text-primary-foreground peer-active:bg-component-hover peer-checked:peer-active:bg-primary/80 forced-colors:peer-checked:border-[Highlight] forced-colors:peer-checked:outline-1 forced-colors:peer-checked:outline-[Highlight]">
              {choice.label}
            </span>
          </label>
        ))}
      </div>
      {isSearchable && (
        <p
          role="status"
          className="mt-1.5 text-caption-lg wrap-anywhere text-fg-secondary empty:sr-only"
        >
          {trimmedQuery !== "" && matching.length === 0
            ? `Nenhuma opção para “${trimmedQuery}”.`
            : ""}
        </p>
      )}
    </fieldset>
  );
}

const decimalFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
  useGrouping: false,
});

/** A typed bound: empty is no bound; anything the link cannot hold is invalid. */
function parseBound(text: string): { bound: number | undefined; isValid: boolean } {
  const trimmed = text.trim();
  if (trimmed === "") return { bound: undefined, isValid: true };
  return typedBoundPattern.test(trimmed)
    ? { bound: Number(trimmed.replace(",", ".")), isValid: true }
    : { bound: undefined, isValid: false };
}

function boundText(bound: number | undefined): string {
  return bound === undefined ? "" : decimalFormat.format(bound);
}

function sameRange(a: NumberRange | undefined, b: NumberRange | undefined): boolean {
  return a?.min === b?.min && a?.max === b?.max;
}

type RangeFilterFieldsProps = {
  filter: RangeFilter;
  range: NumberRange | undefined;
  onRangeChange: (range: NumberRange) => void;
};

function RangeFilterFields({ filter, range, onRangeChange }: RangeFilterFieldsProps) {
  const id = useId();
  const [texts, setTexts] = useState(() => ({
    min: boundText(range?.min),
    max: boundText(range?.max),
  }));
  const typed = { min: parseBound(texts.min), max: parseBound(texts.max) };
  const typedRange: NumberRange = { min: typed.min.bound, max: typed.max.bound };

  // The link changes the range after each keystroke, a render later (the router commits
  // in a microtask); only a range other than the typed one replaces the text.
  const [linkRange, setLinkRange] = useState(range);
  if (!sameRange(range, linkRange)) {
    setLinkRange(range);
    if (!sameRange(range, typedRange)) {
      setTexts({ min: boundText(range?.min), max: boundText(range?.max) });
    }
  }

  function changeText(side: "min" | "max", text: string) {
    const nextTexts = { ...texts, [side]: text };
    setTexts(nextTexts);
    onRangeChange({ min: parseBound(nextTexts.min).bound, max: parseBound(nextTexts.max).bound });
  }

  const isReversed =
    typedRange.min !== undefined && typedRange.max !== undefined && typedRange.min > typedRange.max;
  const problem =
    !typed.min.isValid || !typed.max.isValid
      ? "Use um número com até 3 casas decimais, como 54,5."
      : isReversed
        ? "Use um mínimo menor ou igual ao máximo."
        : undefined;
  const problemId = `${id}-problema`;

  return (
    <fieldset className="min-w-0">
      <FilterLegend>{`${filter.label} (${filter.unit})`}</FilterLegend>
      <div className="grid grid-cols-2 gap-2">
        {(["min", "max"] as const).map((side) => (
          <label key={side} className="flex min-w-0 flex-col gap-1">
            <span className="text-caption-lg text-fg-secondary">
              {side === "min" ? "Mínimo" : "Máximo"}
            </span>
            <Input
              name={`${filter.param}-${side}`}
              inputMode="decimal"
              autoComplete="off"
              value={texts[side]}
              aria-invalid={!typed[side].isValid || isReversed || undefined}
              aria-describedby={problem ? problemId : undefined}
              onChange={(event) => changeText(side, event.target.value)}
              className="h-9 tabular-nums"
            />
          </label>
        ))}
      </div>
      {problem && (
        <p id={problemId} className="mt-1.5 text-caption-lg text-danger-fg">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
