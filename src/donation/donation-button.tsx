import { Popover } from "@base-ui/react/popover";
import { Check, Copy, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The one key that takes both a Pix and a PayPal payment. */
const donationKey = "faustoyuuki@gmail.com";

type CopyState = "idle" | "copied" | "failed";

/** The header's "Apoiar" button: the Pix and PayPal key for whoever wants to help keep the app up. */
export function DonationButton() {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const keyInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(donationKey);
      setCopyState("copied");
    } catch {
      // The key stays selected in its field, to copy by hand.
      setCopyState("failed");
      keyInputRef.current?.focus();
      keyInputRef.current?.select();
    }
  }

  return (
    <Popover.Root onOpenChange={(open) => open || setCopyState("idle")}>
      <Popover.Trigger render={<Button variant="tertiary" size="icon-lg" aria-label="Apoiar" />}>
        <Heart aria-hidden="true" strokeWidth={1.5} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup className="flex w-80 max-w-[calc(100vw-1rem)] flex-col gap-3 rounded-2xl border border-transparent bg-popover p-4 text-body text-popover-foreground shadow-surface-5 transition-[opacity,scale] duration-150 ease-out-quint outline-none origin-(--transform-origin) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="font-medium">Apoiar o Periscópio</Popover.Title>
            <Popover.Description className="text-pretty text-muted-foreground">
              Se o app te ajuda e você quiser contribuir, qualquer valor é bem-vindo. A mesma chave
              serve para Pix e PayPal.
            </Popover.Description>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chave-de-doacao" className="text-caption text-muted-foreground">
                Chave Pix e PayPal
              </label>
              <div className="flex gap-2">
                <Input
                  ref={keyInputRef}
                  id="chave-de-doacao"
                  readOnly
                  value={donationKey}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  variant="secondary"
                  leadingIcon={copyState === "copied" ? Check : Copy}
                  onClick={copyKey}
                >
                  {copyState === "copied" ? "Copiada" : "Copiar"}
                </Button>
              </div>
              <p role="status" className="text-caption text-destructive empty:hidden">
                {copyState === "failed" ? "Não deu para copiar. Copie a chave selecionada." : ""}
              </p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
