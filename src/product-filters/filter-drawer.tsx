import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/** Where the side panel takes over from the drawer (Tailwind's `lg`). */
const sidePanelQuery = "(min-width: 64rem)";

const countFormat = new Intl.NumberFormat("pt-BR");

function showProductsText(count: number): string {
  if (count === 0) return "Fechar filtros";
  return count === 1 ? "Ver 1 produto" : `Ver ${countFormat.format(count)} produtos`;
}

function resultCountText(count: number): string {
  if (count === 0) return "Nenhum produto";
  return count === 1 ? "1 produto" : `${countFormat.format(count)} produtos`;
}

type FilterDrawerProps = {
  activeCount: number;
  resultCount: number;
  onClear: () => void;
  children: ReactNode;
};

/** Below 1024 px the Filtros open from the bottom, with "Limpar" and the count that closes it. */
export function FilterDrawer({ activeCount, resultCount, onClear, children }: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sidePanel = window.matchMedia(sidePanelQuery);
    const closeOnWideScreen = () => sidePanel.matches && setOpen(false);
    sidePanel.addEventListener("change", closeOnWideScreen);
    return () => sidePanel.removeEventListener("change", closeOnWideScreen);
  }, []);

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger
        render={<Button variant="outline" size="lg" className="tabular-nums lg:hidden" />}
      >
        <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
        {activeCount === 0 ? "Filtros" : `Filtros (${activeCount})`}
      </DrawerTrigger>
      <DrawerContent className="border-transparent text-body-sm shadow-large">
        <DrawerHeader className="flex-row items-center justify-between gap-4 border-b border-border-subtle px-4 pt-2 pb-3 group-data-[swipe-axis=y]/drawer-popup:text-start">
          <DrawerTitle className="text-heading-6">Filtros</DrawerTitle>
          <Button
            variant="ghost"
            size="lg"
            disabled={activeCount === 0}
            focusableWhenDisabled
            onClick={onClear}
            className="-me-2 pe-2"
          >
            Limpar
          </Button>
        </DrawerHeader>
        {/* The modal hides the toolbar's count from screen readers while open. */}
        <p role="status" className="sr-only">
          {resultCountText(resultCount)}
        </p>
        <div className="scroll-fade-y relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        <DrawerFooter className="border-t border-border-subtle p-4">
          {/* A full-width press shrinks less, so it reads as a press and not an effect. */}
          <Button
            size="lg"
            className="h-10 tabular-nums motion-safe:not-data-disabled:active:not-aria-[haspopup]:scale-[0.985]"
            onClick={() => setOpen(false)}
          >
            {showProductsText(resultCount)}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
