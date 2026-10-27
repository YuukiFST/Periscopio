import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { categoryLabels } from "@/categories";
import { Button } from "@/components/ui/button";
import { useAllCategories, type CategoriesLoad } from "@/data/use-all-categories";
import { manufacturerName } from "@/i18n/labels";
import { isApplePlatform, usePageShortcut } from "@/keyboard-shortcuts/page-shortcuts";
import { searchAllCategories, type SearchResult, type SearchResultGroup } from "./search-results";

function isSearchShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k"
  );
}

function emptyText(load: CategoriesLoad, searchText: string): string {
  if (load.status === "failed") {
    return "Não deu para carregar os produtos. Verifique a conexão e tente de novo.";
  }
  if (load.status === "loading") return "Carregando produtos…";
  if (searchText.trim() === "") return "Digite o nome de um produto ou fabricante.";
  return "Nenhum produto encontrado.";
}

/**
 * The header's search button and the dialog it opens, also on `Ctrl+K` /
 * `Cmd+K` anywhere: a combobox over the Produtos of every Categoria.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const tableCategory = useMatch({ from: "/$categoria", shouldThrow: false })?.params.categoria;
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const openedProduct = useRef(false);
  const [load, ensureLoaded] = useAllCategories();
  const groups = useMemo<SearchResultGroup[]>(
    () => (load.status === "loaded" ? searchAllCategories(load.categories, searchText) : []),
    [load, searchText],
  );

  function openSearch() {
    returnFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openedProduct.current = false;
    setSearchText("");
    setIsOpen(true);
    ensureLoaded();
  }

  usePageShortcut((event) => {
    if (!isSearchShortcut(event)) return false;
    if (!isOpen) openSearch();
    return true;
  });

  function openResult({ category, product }: SearchResult) {
    openedProduct.current = true;
    setIsOpen(false);
    const params = { categoria: category, id: product.id };
    if (category !== tableCategory) {
      void navigate({ to: "/$categoria/$id", params });
      return;
    }
    // Over its own Categoria's table, the details keep the table's search params like a row link does.
    void navigate({
      to: "/$categoria/$id",
      params,
      search: true,
      state: { fromCategoryTable: true },
    });
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? openSearch() : setIsOpen(false))}>
      <Dialog.Trigger
        render={
          <Button variant="tertiary" leadingIcon={Search} aria-keyshortcuts="Control+K Meta+K" />
        }
      >
        Buscar
        <kbd
          aria-hidden="true"
          className="ms-1 rounded-sm border border-border px-1 font-sans text-caption text-muted-foreground/70 pointer-coarse:hidden"
        >
          {isApplePlatform ? "⌘K" : "Ctrl K"}
        </kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity dark:bg-black/50 duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-[min(12dvh,6rem)] pb-2">
          <Dialog.Popup
            // Opening a Produto leaves focus to its details, which move it to their title.
            finalFocus={() => (openedProduct.current ? false : (returnFocusTo.current ?? true))}
            className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-surface-5 transition-[opacity,scale] duration-150 ease-out-quint outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
          >
            <Dialog.Title className="sr-only">Buscar produtos</Dialog.Title>
            <Autocomplete.Root
              open
              inline
              items={groups}
              filter={null}
              value={searchText}
              // Picking a Produto would write its name in the box and redo the list as the dialog closes.
              onValueChange={(text, details) => {
                if (details.reason !== "item-press") setSearchText(text);
              }}
              itemToStringValue={(result: SearchResult) => result.product.name}
              autoHighlight="always"
              keepHighlight
            >
              <div className="relative flex items-center border-b border-border">
                <Search
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute start-3.5 size-4 text-muted-foreground/70"
                />
                <Autocomplete.Input
                  aria-label="Buscar produto ou fabricante em todas as categorias"
                  placeholder="Produto ou fabricante"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="h-12 w-full bg-transparent ps-10 pe-1 text-base outline-none placeholder:text-muted-foreground/70 pointer-fine:text-body"
                />
                <Dialog.Close
                  render={<Button variant="ghost" size="icon" className="me-1.5" />}
                  aria-label="Fechar busca"
                >
                  <X aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                <Autocomplete.Empty className="px-4 py-6 text-body text-muted-foreground empty:hidden">
                  {emptyText(load, searchText)}
                </Autocomplete.Empty>
                <Autocomplete.List className="p-1 empty:hidden">
                  {(group: SearchResultGroup) => (
                    <Autocomplete.Group key={group.category} items={group.items} className="py-1">
                      <Autocomplete.GroupLabel className="px-3 py-1.5 text-caption font-medium text-muted-foreground/70">
                        {categoryLabels[group.category]}
                      </Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(result: SearchResult) => (
                          <Autocomplete.Item
                            key={result.product.id}
                            value={result}
                            onClick={() => openResult(result)}
                            className="flex cursor-default items-baseline gap-2 rounded-lg px-3 py-2 text-body select-none data-highlighted:bg-hover"
                          >
                            <span className="min-w-0 truncate font-medium">
                              {result.product.name}
                            </span>{" "}
                            <span className="shrink-0 text-muted-foreground">
                              {manufacturerName(result.product.manufacturer)}
                            </span>
                          </Autocomplete.Item>
                        )}
                      </Autocomplete.Collection>
                    </Autocomplete.Group>
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
