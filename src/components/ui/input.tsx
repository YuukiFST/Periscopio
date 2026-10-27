import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

/** A text field drawn like Fluid Functionalism's InputField: tinted on hover, lifted to the card surface on focus. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg bg-transparent px-2.5 text-base text-foreground ring-1 ring-border transition-all duration-80 pointer-coarse:h-10 placeholder:text-muted-foreground hover:bg-muted/50 focus:bg-card disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/50 aria-invalid:hover:bg-destructive-light/60 aria-invalid:focus:bg-card pointer-fine:text-body",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
