import { X } from "lucide-react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import type { CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { noFilterValues, type CategoryFilter, type FilterValues } from "./filter-engine";
import { filterValuesFromSearch } from "./filter-link";
import {
  activeSearchOf,
  filterPresets,
  isSearchApplied,
  isPresetAvailable,
  useSavedFilters,
  type FilterPreset,
} from "./filter-presets";

type FilterPresetListProps = {
  category: CategorySlug;
  filters: readonly CategoryFilter[];
  values: FilterValues;
  /** Replaces every Filtro; the busca and the Status de teste stay. */
  onApply: (values: FilterValues) => void;
};

/** The Categoria's presets and the Filtros saved on this device, each applied in one click. */
export function FilterPresetList({ category, filters, values, onApply }: FilterPresetListProps) {
  const { saved, save, remove } = useSavedFilters(category);
  // The delete button leaves with its row, so the keyboard lands on the save button below.
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const presets = filterPresets[category].filter((preset) =>
    isPresetAvailable(filters, preset.search),
  );
  const currentSearch = activeSearchOf(filters, values);

  function toggle(preset: FilterPreset) {
    const isApplied = isSearchApplied(filters, values, preset.search);
    onApply(isApplied ? noFilterValues : filterValuesFromSearch(filters, preset.search));
  }

  return (
    <div className="flex flex-col gap-3">
      {presets.length > 0 && (
        <div role="group" aria-label="Atalhos" className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant={isSearchApplied(filters, values, preset.search) ? "primary" : "tertiary"}
              aria-pressed={isSearchApplied(filters, values, preset.search)}
              onClick={() => toggle(preset)}
              className="pointer-coarse:h-10"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      )}
      {saved.length > 0 && (
        <ul aria-label="Filtros salvos" className="flex flex-col gap-1.5">
          {saved.map((preset) => (
            <li key={preset.name} className="flex min-w-0 items-center gap-1">
              <Button
                variant={isSearchApplied(filters, values, preset.search) ? "primary" : "tertiary"}
                aria-pressed={isSearchApplied(filters, values, preset.search)}
                onClick={() => toggle(preset)}
                className="min-w-0 flex-1 justify-start pointer-coarse:h-10"
              >
                <span className="truncate">{preset.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Apagar ${preset.name}`}
                onClick={() => {
                  remove(preset.name);
                  saveButtonRef.current?.focus();
                }}
                className="text-muted-foreground/70 hover:text-foreground pointer-coarse:size-10"
              >
                <X aria-hidden="true" strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <SaveFiltersForm
        openButtonRef={saveButtonRef}
        canSave={Object.keys(currentSearch).length > 0}
        onSave={(name) => save({ name, search: currentSearch })}
      />
    </div>
  );
}

const savedNameMaxLength = 60;

function SaveFiltersForm({
  openButtonRef,
  canSave,
  onSave,
}: {
  openButtonRef: RefObject<HTMLButtonElement | null>;
  canSave: boolean;
  onSave: (name: string) => void;
}) {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState("");
  // With no Filtro left to save the naming ends, so a later Filtro never reopens it.
  if (isNaming && !canSave) {
    setIsNaming(false);
    setName("");
  }
  const trimmedName = name.trim();

  function close() {
    setIsNaming(false);
    setName("");
    openButtonRef.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (trimmedName === "" || !canSave) return;
    onSave(trimmedName);
    close();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={openButtonRef}
        variant="ghost"
        disabled={!canSave}
        focusableWhenDisabled
        aria-expanded={isNaming}
        onClick={() => setIsNaming(!isNaming)}
        className="-ms-2.5 self-start ps-2.5 pointer-coarse:h-10"
      >
        Salvar filtros atuais
      </Button>
      {isNaming && (
        <form
          onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            // Escape cancels the name only; the drawer around it stays open.
            event.stopPropagation();
            close();
          }}
          className="flex flex-col gap-2"
        >
          <label className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground">Nome</span>
            <Input
              autoFocus
              autoComplete="off"
              maxLength={savedNameMaxLength}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-9"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={trimmedName === ""} focusableWhenDisabled>
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
