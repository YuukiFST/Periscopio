import { Popover } from "@base-ui/react/popover";
import { Columns3, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeForSearch } from "./product-filter";
import type { ColumnChoiceGroup } from "./table-columns";

type ColumnsMenuProps = {
  groups: ColumnChoiceGroup[];
  /** The keys of the columns shown, the Produto aside, in their order. */
  chosenKeys: readonly string[];
  isDefault: boolean;
  onChosenKeysChange: (keys: string[]) => void;
  onReset: () => void;
};

/**
 * The toolbar's "Colunas" button and its list of the Categoria's fields, one
 * checkbox each; a checked field joins the table as its last column.
 */
export function ColumnsMenu({
  groups,
  chosenKeys,
  isDefault,
  onChosenKeysChange,
  onReset,
}: ColumnsMenuProps) {
  const [searchText, setSearchText] = useState("");
  const words = normalizeForSearch(searchText).split(/\s+/).filter(Boolean);
  const shownGroups = groups.flatMap((group) => {
    const choices = group.choices.filter((choice) => {
      const label = normalizeForSearch(choice.label);
      return words.every((word) => label.includes(word));
    });
    return choices.length > 0 ? [{ ...group, choices }] : [];
  });

  function toggle(key: string) {
    onChosenKeysChange(
      chosenKeys.includes(key) ? chosenKeys.filter((kept) => kept !== key) : [...chosenKeys, key],
    );
  }

  return (
    <Popover.Root onOpenChange={(open) => open || setSearchText("")}>
      <Popover.Trigger render={<Button variant="outline" size="lg" />}>
        <Columns3 aria-hidden="true" strokeWidth={1.5} />
        Colunas
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup className="flex max-h-[min(var(--available-height),32rem)] w-[min(calc(100vw-1rem),22rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-large transition-[opacity,scale] duration-150 ease-out-quint outline-none origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <div className="flex flex-col gap-3 border-b border-border p-3">
              <Popover.Title className="px-1 text-body-sm font-medium">Colunas</Popover.Title>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
                />
                <Input
                  type="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Buscar coluna"
                  placeholder="Buscar coluna"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="h-9 ps-8"
                />
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-3">
              {shownGroups.length === 0 && (
                <p className="px-1 py-3 text-body-sm wrap-anywhere text-fg-secondary">
                  Nenhuma coluna encontrada para “{searchText.trim()}”.
                </p>
              )}
              <div className="flex flex-col gap-4">
                {shownGroups.map((group) => (
                  <fieldset key={group.id} className="min-w-0">
                    <legend className="mb-1 px-1 text-body-sm font-medium text-fg-secondary">
                      {group.title}
                    </legend>
                    {group.choices.map((choice) => (
                      <label
                        key={choice.key}
                        className="flex min-h-9 cursor-pointer items-center gap-3 rounded-lg px-1 text-body-sm hover:bg-component-hover"
                      >
                        <input
                          type="checkbox"
                          checked={chosenKeys.includes(choice.key)}
                          onChange={() => toggle(choice.key)}
                          className="size-4 shrink-0 cursor-pointer accent-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                        <span className="min-w-0 wrap-break-word">{choice.label}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </div>
            <div className="flex justify-end border-t border-border p-1.5">
              <Button variant="ghost" disabled={isDefault} focusableWhenDisabled onClick={onReset}>
                Restaurar padrão
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
