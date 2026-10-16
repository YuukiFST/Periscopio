import { useEffect, useRef } from "react";
import { categoryLabels, type CategorySlug } from "@/categories";
import { BackToTableLink } from "./back-to-table-link";

export function ProductNotFound({ category }: { category: CategorySlug }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = "Produto não encontrado · EyeJoker";
    headingRef.current?.focus();
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <h1 ref={headingRef} tabIndex={-1} className="font-serif text-heading-5 outline-none">
        Produto não encontrado
      </h1>
      <p className="max-w-prose text-fg-secondary">
        Este link não corresponde a nenhum produto em {categoryLabels[category]}. O produto pode ter
        saído do EyeJoker numa atualização, ou o link ficou incompleto.
      </p>
      <BackToTableLink category={category} />
    </div>
  );
}
