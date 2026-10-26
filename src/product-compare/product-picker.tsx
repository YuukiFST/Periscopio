import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/schema";
import { rankedProductMatches } from "@/global-search/search-results";
import { manufacturerName } from "@/i18n/labels";

/** Enough to scan on a phone; a longer list asks for a narrower search instead. */
const shownMatchCount = 20;

function statusText(searchText: string, matchCount: number): string {
  if (searchText.trim() === "") return "Digite o nome de um produto ou fabricante.";
  if (matchCount === 0) return "Nenhum produto encontrado.";
  if (matchCount === 1) return "1 produto encontrado.";
  if (matchCount <= shownMatchCount) return `${matchCount} produtos encontrados.`;
  return `${matchCount} produtos encontrados; a lista mostra os ${shownMatchCount} primeiros.`;
}

type ProductPickerProps = {
  /** The Produtos on offer: the Categoria's, less those already compared. */
  candidates: readonly Product[];
  /** Names the dialog and its search box. */
  title: string;
  /** The button that opens the dialog. */
  trigger: ReactElement;
  /** Where focus goes once a Produto is picked; closing without one returns it to the trigger. */
  focusAfterPick: RefObject<HTMLElement | null>;
  onPick: (product: Product) => void;
};

/** A dialog with a combobox over `candidates`, searched like the table's search. */
export function ProductPicker({
  candidates,
  title,
  trigger,
  focusAfterPick,
  onPick,
}: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const picked = useRef(false);
  const matches = useMemo(
    () => rankedProductMatches(candidates, searchText),
    [candidates, searchText],
  );

  function openPicker() {
    picked.current = false;
    setSearchText("");
    setIsOpen(true);
  }

  function pick(product: Product) {
    // The list stays clickable while the dialog fades out, and the pick has already reshuffled it.
    if (picked.current) return;
    picked.current = true;
    setIsOpen(false);
    onPick(product);
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? openPicker() : setIsOpen(false))}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity dark:bg-black/50 duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-[min(12dvh,6rem)] pb-2">
          <Dialog.Popup
            finalFocus={() => (picked.current ? focusAfterPick.current : true)}
            className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-large transition-[opacity,scale] duration-150 ease-out-quint outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <Autocomplete.Root
              open
              inline
              items={matches.slice(0, shownMatchCount)}
              filter={null}
              value={searchText}
              // Picking a Produto would write its name in the box and redo the list as the dialog closes.
              onValueChange={(text, details) => {
                if (details.reason !== "item-press") setSearchText(text);
              }}
              itemToStringValue={(product: Product) => product.name}
              autoHighlight="always"
              keepHighlight
            >
              <div className="relative flex items-center border-b border-border">
                <Search
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute start-3.5 size-4 text-fg-tertiary"
                />
                <Autocomplete.Input
                  aria-label={title}
                  placeholder="Produto ou fabricante"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="h-12 w-full bg-transparent ps-10 pe-1 text-base outline-none placeholder:text-fg-tertiary pointer-fine:text-body-sm"
                />
                <Dialog.Close
                  render={<Button variant="ghost" size="icon-lg" className="me-1.5" />}
                  aria-label="Fechar"
                >
                  <X aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                {/* Stays mounted so screen readers announce each new count. */}
                <Autocomplete.Status className="px-4 pt-3 pb-1 text-caption-lg text-fg-secondary">
                  {statusText(searchText, matches.length)}
                </Autocomplete.Status>
                <Autocomplete.List className="p-1 empty:hidden">
                  {(product: Product) => (
                    <Autocomplete.Item
                      key={product.id}
                      value={product}
                      onClick={() => pick(product)}
                      className="flex cursor-default items-baseline gap-2 rounded-lg px-3 py-2 text-body-sm select-none data-highlighted:bg-component-hover"
                    >
                      <span className="min-w-0 truncate font-medium">{product.name}</span>{" "}
                      <span className="shrink-0 text-fg-secondary">
                        {manufacturerName(product.manufacturer)}
                      </span>
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </div>
            </Autocomplete.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
