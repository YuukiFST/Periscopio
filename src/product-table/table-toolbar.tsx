import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { TestStatusFilter } from "./product-filter";

const testStatusOptions: SegmentedOption<TestStatusFilter>[] = [
  { value: "testados", label: "Testados" },
  { value: "nao-testados", label: "Não testados" },
  { value: "todos", label: "Todos" },
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
/** A longer `q` is dropped from the link, so the box stops typing there. */
export const searchTextMaxLength = 100;

type TableToolbarProps = {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  testStatus: TestStatusFilter;
  onTestStatusChange: (testStatus: TestStatusFilter) => void;
  countText: string;
  /** Controls placed after the Status de teste, such as the Filtros button on a phone. */
  children?: ReactNode;
};

export function TableToolbar({
  searchText,
  onSearchTextChange,
  testStatus,
  onTestStatusChange,
  countText,
  children,
}: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="relative w-full sm:w-72">
        <Search
          aria-hidden="true"
          strokeWidth={1.5}
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
          maxLength={searchTextMaxLength}
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          className="h-9 ps-8"
        />
      </div>
      <SegmentedControl
        legend="Status de teste"
        name="status-de-teste"
        options={testStatusOptions}
        value={testStatus}
        onValueChange={onTestStatusChange}
      />
      {children}
      <p aria-live="polite" className="text-fg-secondary tabular-nums">
        {countText}
      </p>
    </div>
  );
}
