import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

const copyStatusText: Record<CopyState, string> = {
  idle: "",
  copied: "Link copiado",
  failed: "Não deu para copiar. Copie o link na barra de endereço do navegador.",
};

/** Copies the page address, which carries the whole view in its search params. */
export function CopyLinkButton() {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);
  useEffect(() => {
    // The failure tells the user what to do instead, so it stays until they act elsewhere.
    if (copyState !== "failed") return;
    const dismiss = () => setCopyState("idle");
    const dismissOnEscape = (event: KeyboardEvent) => event.key === "Escape" && dismiss();
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
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
      <Button variant="outline" size="lg" onClick={copyLink}>
        {copyState === "copied" ? (
          <Check aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Link2 aria-hidden="true" data-icon="inline-start" />
        )}
        {copyState === "copied" ? "Link copiado" : "Copiar link"}
      </Button>
      <p
        role="status"
        className={cn(
          "absolute end-0 top-full z-40 mt-1 w-64 rounded-md bg-popover px-3 py-2 text-caption-lg text-danger-fg shadow-large",
          copyState !== "failed" && "sr-only",
        )}
      >
        {copyStatusText[copyState]}
      </p>
    </div>
  );
}
