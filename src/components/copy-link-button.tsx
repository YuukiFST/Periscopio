import { Check, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

const copyStatusText: Record<CopyState, string> = {
  idle: "",
  copied: "Link copiado",
  // An installed app has no address bar, so the link itself comes up, selected, to copy by hand.
  failed: "Não deu para copiar. Copie o link selecionado abaixo.",
};

/** Copies the page address, which carries the whole view in its search params. */
export function CopyLinkButton() {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const popoverRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);
  useEffect(() => {
    // The failure tells the user what to do instead, so it stays until they act elsewhere.
    if (copyState !== "failed") return;
    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    const dismiss = () => setCopyState("idle");
    // On click, not pointerdown: a scroll swipe elsewhere keeps the link up.
    const dismissOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      dismiss();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismiss();
      buttonRef.current?.focus();
    };
    document.addEventListener("click", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("click", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [copyState]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="relative">
      <Button ref={buttonRef} variant="outline" size="lg" onClick={copyLink}>
        {copyState === "copied" ? (
          <Check aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Link2 aria-hidden="true" data-icon="inline-start" />
        )}
        {copyState === "copied" ? "Link copiado" : "Copiar link"}
      </Button>
      <div
        ref={popoverRef}
        // Tab past the link closes it, so it never covers the control that takes focus next.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setCopyState("idle");
        }}
        className={cn(
          "absolute end-0 top-full z-40 mt-1 flex w-64 flex-col gap-2 rounded-2xl border border-transparent bg-popover p-1 shadow-large",
          copyState !== "failed" && "sr-only",
        )}
      >
        <p role="status" className="px-2 pt-1 text-caption-lg text-danger-fg">
          {copyStatusText[copyState]}
        </p>
        {copyState === "failed" && (
          <Input
            ref={linkInputRef}
            readOnly
            value={window.location.href}
            aria-label="Link desta página"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </div>
    </div>
  );
}
