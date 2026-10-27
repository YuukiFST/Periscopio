import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { isApplePlatform, isSingleKeyShortcut, usePageShortcut } from "./page-shortcuts";

type ShortcutEntry = {
  /** Each item is one way to press it. */
  keys: string[];
  action: string;
};

const shortcutEntries: ShortcutEntry[] = [
  { keys: [isApplePlatform ? "⌘K" : "Ctrl K"], action: "Buscar em todas as categorias" },
  { keys: ["/"], action: "Ir para a busca da tabela" },
  { keys: ["Esc"], action: "Limpar a busca da tabela" },
  { keys: ["j", "↓"], action: "Próximo produto da tabela" },
  { keys: ["k", "↑"], action: "Produto anterior da tabela" },
  { keys: ["Enter"], action: "Abrir os detalhes do produto" },
  { keys: ["c"], action: "Marcar ou desmarcar o produto para a comparação" },
  { keys: ["?"], action: "Mostrar os atalhos" },
];

/** The list of keyboard shortcuts, opened with `?`. */
export function ShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  usePageShortcut((event) => {
    if (event.key !== "?" || !isSingleKeyShortcut(event)) return false;
    setIsOpen(true);
    return true;
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity dark:bg-black/50 duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-[min(12dvh,6rem)] pb-2">
          <Dialog.Popup className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-large transition-[opacity,scale] duration-150 ease-out-quint outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <div className="flex items-center justify-between gap-2 border-b border-border ps-4">
              <Dialog.Title className="font-serif text-heading-6 font-medium">
                Atalhos de teclado
              </Dialog.Title>
              <Dialog.Close
                render={<Button variant="ghost" size="icon-lg" className="m-1.5" />}
                aria-label="Fechar atalhos"
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <dl className="min-h-0 overflow-y-auto overscroll-contain px-4 py-2 text-body-sm">
              {shortcutEntries.map((entry) => (
                <div
                  key={entry.action}
                  className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2 last:border-b-0"
                >
                  <dt>{entry.action}</dt>
                  <dd className="flex shrink-0 items-baseline gap-1 text-fg-tertiary">
                    {entry.keys.map((key, index) => (
                      <Fragment key={key}>
                        {index > 0 && " ou "}
                        <kbd className="rounded-sm border border-border px-1 font-sans text-caption-lg text-fg-secondary">
                          {key}
                        </kbd>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
