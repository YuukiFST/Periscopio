import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

/** Where the panel stops covering the whole screen (Tailwind's `sm`). */
const besidePageQuery = "(min-width: 40rem)";

/**
 * A Produto's details in a panel on the right, over the page that lists it. It
 * is not modal: the page stays usable, and another Produto clicked there takes
 * the panel. On a phone the panel covers the page, so the keyboard stays inside it.
 * The children move focus to their own title; closing hands it to `returnFocusTo`.
 */
export function ProductPanel({
  open,
  onClose,
  onClosed,
  returnFocusTo,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Once the panel has slid out, so the caller can stop drawing its last Produto. */
  onClosed: () => void;
  /** The Produto's own link on the page, else the page's title. */
  returnFocusTo: () => HTMLElement | null;
  children: ReactNode;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isBesidePage, setIsBesidePage] = useState(
    () => window.matchMedia(besidePageQuery).matches,
  );
  useEffect(() => {
    const besidePage = window.matchMedia(besidePageQuery);
    const update = () => setIsBesidePage(besidePage.matches);
    besidePage.addEventListener("change", update);
    return () => besidePage.removeEventListener("change", update);
  }, []);

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen, eventDetails) => {
        // Base UI hears Escape on the whole page; the page's search box and the Filtros drawer
        // keep their own Escape while the panel is open. From a row, Escape still closes it.
        const target = eventDetails.event.target;
        if (
          eventDetails.reason === "escape-key" &&
          target instanceof Element &&
          !popupRef.current?.contains(target) &&
          target.closest("input, textarea, select, [role=combobox], [role=dialog]")
        ) {
          eventDetails.cancel();
          return;
        }
        if (!isOpen) onClose();
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClosed();
      }}
      swipeDirection="right"
      modal={isBesidePage ? false : "trap-focus"}
      // A click on the page picks another Produto instead of closing the panel.
      disablePointerDismissal
    >
      <DrawerContent
        ref={popupRef}
        initialFocus={false}
        finalFocus={() => returnFocusTo() ?? true}
        // Beside the page, Tab past the panel's last control, or Shift+Tab before its first,
        // goes back to the page it stays over; the panel has no trigger for Base UI to hand
        // focus on to.
        onKeyDown={(event) => {
          if (!isBesidePage || event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>("a[href], button");
          const edge = event.shiftKey ? controls[0] : controls[controls.length - 1];
          if (event.target !== edge) return;
          const target = returnFocusTo();
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
        className="w-full border-transparent text-body shadow-surface-5 duration-200 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*200ms)] data-ending-style:data-swiping:duration-[calc(var(--drawer-swipe-strength)*200ms)] sm:w-lg"
      >
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <Button variant="ghost" size="icon" aria-label="Fechar detalhes" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="scroll-fade-y relative min-h-0 flex-1 has-[[role=region]]:scroll-fade-b-4 scroll-pb-24 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
