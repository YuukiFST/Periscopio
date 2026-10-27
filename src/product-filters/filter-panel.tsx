import { Combobox } from "@base-ui/react/combobox";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import type { CategorySlug } from "@/categories";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeForSearch } from "@/product-table/product-filter";
import {
  type CategoryFilter,
  type ChoiceFilter,
  type FilterValues,
  type NumberRange,
  type RangeFilter,
} from "./filter-engine";
import { typedBoundPattern } from "./filter-link";
import { FilterPresetList } from "./filter-preset-list";
import type { FilterParam } from "./filter-params";

type FilterPanelProps = {
  category: CategorySlug;
  filters: readonly CategoryFilter[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  /** Changes on "Limpar", so a range field also drops text that never reached the link. */
  clearCount: number;
};

function withChoices(values: FilterValues, param: FilterParam, ids: string[]): FilterValues {
  return { ...values, choices: { ...values.choices, [param]: ids } };
}

function withRange(values: FilterValues, param: FilterParam, range: NumberRange): FilterValues {
  return { ...values, ranges: { ...values.ranges, [param]: range } };
}

/** The presets and saved Filtros, then every Filtro of the Categoria, one under the other. */
export function FilterPanel({
  category,
  filters,
  values,
  onValuesChange,
  clearCount,
}: FilterPanelProps) {
  // Like "Limpar", a preset also drops range text that never reached the link.
  const [presetCount, setPresetCount] = useState(0);
  function applyPreset(presetValues: FilterValues) {
    setPresetCount((count) => count + 1);
    onValuesChange(presetValues);
  }

  return (
    <div className="flex flex-col gap-5">
      <FilterPresetList
        category={category}
        filters={filters}
        values={values}
        onApply={applyPreset}
      />
      {filters.map((filter) =>
        filter.kind === "range" ? (
          <RangeFilterFields
            key={`${filter.param}-${clearCount}-${presetCount}`}
            filter={filter}
            range={values.ranges[filter.param]}
            onRangeChange={(range) => onValuesChange(withRange(values, filter.param, range))}
          />
        ) : (
          <ChoiceFilterFields
            key={`${filter.param}-${clearCount}-${presetCount}`}
            filter={filter}
            marked={values.choices[filter.param] ?? []}
            onMarkedChange={(ids) => onValuesChange(withChoices(values, filter.param, ids))}
          />
        ),
      )}
    </div>
  );
}

function FilterLegend({ children }: { children: string }) {
  return <legend className="mb-2 font-medium text-foreground">{children}</legend>;
}

function FilterLabel({ id, children }: { id: string; children: string }) {
  return (
    <div id={id} className="mb-2 font-medium text-foreground">
      {children}
    </div>
  );
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
  onMarkedChange: (ids: string[]) => void;
};

const choiceFieldClassName =
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-start text-base text-foreground transition-colors hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring pointer-coarse:min-h-10 pointer-fine:text-body dark:bg-muted";

const choicePopupClassName =
  "flex max-h-[min(var(--available-height),16rem)] w-(--anchor-width) min-w-40 origin-(--transform-origin) flex-col rounded-lg border border-border bg-popover text-body text-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out-quint data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";

// The scroll lives on the list inside the popup: scroll-fade-y runs a scroll-driven animation
// that never finishes, and Base UI keeps a closing popup mounted until its animations finish.
const choiceListClassName =
  "min-h-0 scroll-fade-y overflow-y-auto overscroll-contain p-1 outline-none [scrollbar-width:thin]";

const choiceItemClassName =
  "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-muted-foreground outline-none select-none data-highlighted:bg-hover data-highlighted:text-foreground data-selected:text-foreground pointer-coarse:min-h-10";

function ChoiceCheck({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-4 shrink-0 place-items-center rounded-sm border border-foreground/25">
      {children}
    </span>
  );
}

/** "Todas" when nothing is marked, else the marked labels in list order. */
function markedSummary(filter: ChoiceFilter, marked: readonly string[]): string {
  const labels = filter.choices
    .filter((choice) => marked.includes(choice.id))
    .map((choice) => choice.label);
  return labels.length === 0 ? "Todas" : labels.join(", ");
}

function ChoiceFilterFields(props: ChoiceFilterFieldsProps) {
  return props.filter.choices.length > searchableChoiceCount ? (
    <SearchableChoiceField {...props} />
  ) : (
    <SelectChoiceField {...props} />
  );
}

/** A short list: one field that opens the choices, each one checked or not. */
function SelectChoiceField({ filter, marked, onMarkedChange }: ChoiceFilterFieldsProps) {
  const labelId = useId();
  return (
    <div className="min-w-0">
      <FilterLabel id={labelId}>{filter.label}</FilterLabel>
      <Select.Root multiple value={[...marked]} onValueChange={onMarkedChange}>
        <Select.Trigger aria-labelledby={labelId} className={choiceFieldClassName}>
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              marked.length === 0 && "text-muted-foreground/70",
            )}
          >
            {markedSummary(filter, marked)}
          </span>
          <Select.Icon>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-4 text-muted-foreground/70"
            />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner alignItemWithTrigger={false} sideOffset={4} className="z-50">
            <Select.Popup className={choicePopupClassName}>
              <Select.List aria-labelledby={labelId} className={choiceListClassName}>
                {filter.choices.map((choice) => (
                  <Select.Item key={choice.id} value={choice.id} className={choiceItemClassName}>
                    <ChoiceCheck>
                      <Select.ItemIndicator>
                        <Check aria-hidden="true" strokeWidth={2} className="size-3" />
                      </Select.ItemIndicator>
                    </ChoiceCheck>
                    <Select.ItemText>{choice.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

/** A long list (spec: "com busca acima de 12 itens"): typing narrows a scrollable list. */
function SearchableChoiceField({ filter, marked, onMarkedChange }: ChoiceFilterFieldsProps) {
  const labelId = useId();
  const labels = new Map(filter.choices.map((choice) => [choice.id, choice.label]));
  const labelOf = (id: string) => labels.get(id) ?? id;
  const searchLabel = `Buscar ${filter.label.toLocaleLowerCase("pt-BR")}`;

  return (
    <div className="min-w-0">
      <FilterLabel id={labelId}>{filter.label}</FilterLabel>
      <Combobox.Root
        multiple
        items={filter.choices.map((choice) => choice.id)}
        value={[...marked]}
        onValueChange={onMarkedChange}
        itemToStringLabel={labelOf}
        filter={(id: string, query) => choiceMatchesQuery(labelOf(id), query)}
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            strokeWidth={1.5}
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
          />
          <Combobox.Input
            aria-label={searchLabel}
            placeholder={searchLabel}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className={cn(
              choiceFieldClassName,
              "cursor-text ps-8 placeholder:text-muted-foreground/70",
            )}
          />
        </div>
        {marked.length > 0 && (
          <Combobox.Chips className="mt-2 flex flex-wrap gap-1.5">
            {marked.map((id) => (
              <Combobox.Chip
                key={id}
                className="flex items-center gap-1 rounded-md border border-primary bg-primary py-0.5 ps-2 pe-0.5 text-caption text-primary-foreground"
              >
                {labelOf(id)}
                <Combobox.ChipRemove
                  aria-label={`Remover ${labelOf(id)}`}
                  className="grid size-5 cursor-pointer place-items-center rounded-sm hover:bg-primary-foreground/15"
                >
                  <X aria-hidden="true" strokeWidth={2} className="size-3" />
                </Combobox.ChipRemove>
              </Combobox.Chip>
            ))}
          </Combobox.Chips>
        )}
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50">
            <Combobox.Popup
              // In the drawer a drag on this list scrolls it, instead of pulling the drawer closed.
              data-base-ui-swipe-ignore="y"
              className={choicePopupClassName}
            >
              <Combobox.Empty className="px-3 py-2 text-muted-foreground empty:hidden">
                Nenhuma opção encontrada.
              </Combobox.Empty>
              <Combobox.List className={cn(choiceListClassName, "empty:hidden")}>
                {(id: string) => (
                  <Combobox.Item key={id} value={id} className={choiceItemClassName}>
                    <ChoiceCheck>
                      <Combobox.ItemIndicator>
                        <Check aria-hidden="true" strokeWidth={2} className="size-3" />
                      </Combobox.ItemIndicator>
                    </ChoiceCheck>
                    {labelOf(id)}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
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
            <span className="text-caption text-muted-foreground">
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
        <p id={problemId} className="mt-1.5 text-caption text-destructive">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
