import { Check, Link2, Share2 } from "lucide-react";
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

/** A phone gets its share sheet, which sends the link straight to the group. */
function canShareLink(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ url: window.location.href })
  );
}

/** Shares or copies the page address, which carries the whole view in its search params. */
export function CopyLinkButton() {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [sharesLink] = useState(canShareLink);
  const rootRef = useRef<HTMLDivElement>(null);
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
      // The button counts as inside: a share that fails at once lands here while its click still bubbles.
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
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

  async function shareLink() {
    try {
      await navigator.share({ title: document.title, url: window.location.href });
    } catch (error) {
      // Closing the share sheet is the user's choice, not a failure to report.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  }

  const IdleIcon = sharesLink ? Share2 : Link2;
  const idleLabel = sharesLink ? "Compartilhar" : "Copiar link";
  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="lg"
        onClick={sharesLink ? shareLink : copyLink}
      >
        {copyState === "copied" ? (
          <Check aria-hidden="true" data-icon="inline-start" />
        ) : (
          <IdleIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {copyState === "copied" ? "Link copiado" : idleLabel}
      </Button>
      <div
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
