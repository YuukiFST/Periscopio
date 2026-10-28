import { Search, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { IconComponentProps } from "@/lib/icon-context";
import { cn } from "@/lib/utils";
import type { TestStatusFilter } from "./product-filter";

const testStatusOptions: SegmentedOption<TestStatusFilter>[] = [
  { value: "testados", label: "Testados" },
  { value: "nao-testados", label: "Não testados" },
  { value: "todos", label: "Todos" },
];

const countFormat = new Intl.NumberFormat("pt-BR");

export function productCount(count: number): string {
  return count === 1 ? "1 produto" : `${countFormat.format(count)} produtos`;
}

export function resultCountText(shown: number, total: number): string {
  if (shown === 0) return "Nenhum produto";
  if (shown === total) return productCount(total);
  return `${countFormat.format(shown)} de ${productCount(total)}`;
}

/** The star of a pressed "Só favoritos", filled like a starred row. */
export function FilledStar({ className, ...props }: IconComponentProps) {
  return <Star {...props} className={cn(className, "fill-current")} />;
}

const pressedOutlineClassName =
  "forced-colors:aria-pressed:outline forced-colors:aria-pressed:outline-[Highlight]";

export const searchInputId = "busca-produto";
export const novidadesToggleId = "novidades";
export const favoritesToggleId = "so-favoritos";
/** A longer `q` is dropped from the link, so the box stops typing there. */
export const searchTextMaxLength = 100;

type TableToolbarProps = {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  testStatus: TestStatusFilter;
  onTestStatusChange: (testStatus: TestStatusFilter) => void;
  /** The "Novidades" toggle; absent while the Categoria has none and the toggle is off. */
  novidades?: { pressed: boolean; onPressedChange: (pressed: boolean) => void };
  /** The "Só favoritos" toggle. */
  favorites: { pressed: boolean; onPressedChange: (pressed: boolean) => void };
  countText: string;
  /** With the toggles that pick which Produtos show, where a phone shows the Filtros button. */
  filterButton?: ReactNode;
  /** After the count: how the Produtos show, such as Colunas and the Gráfico. */
  viewActions?: ReactNode;
};

export function TableToolbar({
  searchText,
  onSearchTextChange,
  testStatus,
  onTestStatusChange,
  novidades,
  favorites,
  countText,
  filterButton,
  viewActions,
}: TableToolbarProps) {
  // Three groups, closer within than between: what to find, which Produtos, how many and how to see them.
  // The search keeps its row to itself on a phone, so its hint shows whole.
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex w-full min-w-0 items-center sm:w-auto">
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search
            aria-hidden="true"
            strokeWidth={1.5}
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
            // Chromium clears a search box on Escape by itself; Firefox keeps the text.
            onKeyDown={(event) => {
              // An Escape that cancels a pending accent or IME text keeps the search.
              if (event.key !== "Escape" || event.nativeEvent.isComposing || searchText === "")
                return;
              event.preventDefault();
              onSearchTextChange("");
            }}
            className="h-9 ps-8 text-ellipsis"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          legend="Status de teste"
          name="status-de-teste"
          options={testStatusOptions}
          value={testStatus}
          onValueChange={onTestStatusChange}
        />
        {novidades && (
          <Button
            id={novidadesToggleId}
            variant={novidades.pressed ? "primary" : "tertiary"}
            leadingIcon={Sparkles}
            aria-pressed={novidades.pressed}
            onClick={() => novidades.onPressedChange(!novidades.pressed)}
            className={pressedOutlineClassName}
          >
            Novidades
          </Button>
        )}
        <Button
          id={favoritesToggleId}
          variant={favorites.pressed ? "primary" : "tertiary"}
          leadingIcon={favorites.pressed ? FilledStar : Star}
          aria-pressed={favorites.pressed}
          onClick={() => favorites.onPressedChange(!favorites.pressed)}
          className={pressedOutlineClassName}
        >
          Só favoritos
        </Button>
        {filterButton}
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
        <p aria-live="polite" className="me-2 text-muted-foreground tabular-nums">
          {countText}
        </p>
        {viewActions}
      </div>
    </div>
  );
}
