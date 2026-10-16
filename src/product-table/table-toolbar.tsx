import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TestStatusFilter } from "./product-filter";

const testStatusOptions: { value: TestStatusFilter | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "testados", label: "Testados" },
  { value: "nao-testados", label: "Não testados" },
];

const countFormat = new Intl.NumberFormat("pt-BR");

function productCount(count: number): string {
  return count === 1 ? "1 produto" : `${countFormat.format(count)} produtos`;
}

export function resultCountText(shown: number, total: number): string {
  if (shown === 0) return "Nenhum produto";
  if (shown === total) return productCount(total);
  return `${countFormat.format(shown)} de ${productCount(total)}`;
}

export const searchInputId = "busca-produto";

type TableToolbarProps = {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  testStatus: TestStatusFilter | undefined;
  onTestStatusChange: (testStatus: TestStatusFilter | undefined) => void;
  countText: string;
};

export function TableToolbar({
  searchText,
  onSearchTextChange,
  testStatus,
  onTestStatusChange,
  countText,
}: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="relative w-full sm:w-72">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
        />
        <Input
          id={searchInputId}
          type="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Buscar por produto ou fabricante"
          placeholder="Produto ou fabricante"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          className="h-9 ps-8"
        />
      </div>
      <fieldset className="flex rounded-lg bg-component p-0.5">
        <legend className="sr-only">Status de teste</legend>
        {testStatusOptions.map((option) => (
          <label key={option.label} className="relative">
            <input
              type="radio"
              name="status-de-teste"
              className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-md opacity-0"
              checked={testStatus === option.value}
              onChange={() => onTestStatusChange(option.value)}
            />
            <span className="flex h-8 cursor-pointer items-center rounded-md border border-transparent px-3 font-medium whitespace-nowrap text-fg-secondary peer-checked:bg-page peer-checked:text-fg-primary peer-checked:shadow-default peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring peer-active:bg-component-hover hover:text-fg-primary peer-checked:peer-active:bg-page dark:peer-checked:bg-component-active forced-colors:peer-checked:border-[Highlight]">
              {option.label}
            </span>
          </label>
        ))}
      </fieldset>
      <p aria-live="polite" className="text-fg-secondary tabular-nums">
        {countText}
      </p>
    </div>
  );
}
