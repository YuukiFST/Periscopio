import type { Field, FieldValue } from "@/data/schema";
import { cn } from "@/lib/utils";
import { formatFieldValue, isCountEnum } from "@/product-table/cell-values";

/** Measured and counted values line up as figures; names and descriptions wrap as text. */
export function isFigureField(field: Field): boolean {
  return field.type === "number" || isCountEnum(field);
}

/** A field value in pt with the field's unit and decimals, set as a figure when it is one. */
export function FieldValueText({
  field,
  value,
  className,
}: {
  field: Field;
  value: FieldValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        isFigureField(field)
          ? "font-mono text-caption whitespace-nowrap tabular-nums"
          : "wrap-break-word",
        className,
      )}
    >
      {formatFieldValue(field, value)}
    </span>
  );
}
