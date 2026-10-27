import { useEffect, useRef } from "react";
import { categoryLabels, type CategorySlug } from "@/categories";
import { DrawerTitle } from "@/components/ui/drawer";

export function ProductNotFound({ category }: { category: CategorySlug }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = "Produto não encontrado · Periscópio";
    headingRef.current?.focus();
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <DrawerTitle ref={headingRef} tabIndex={-1} className="text-display outline-none">
        Produto não encontrado
      </DrawerTitle>
      <p className="max-w-prose text-muted-foreground">
        Este link não corresponde a nenhum produto em {categoryLabels[category]}. O produto pode ter
        saído do EyeJoker numa atualização, ou o link ficou incompleto. Feche este painel e procure
        o produto na tabela de {categoryLabels[category]}.
      </p>
    </div>
  );
}
