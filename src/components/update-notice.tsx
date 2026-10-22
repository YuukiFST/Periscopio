import { TriangleAlert } from "lucide-react";
import type { Meta } from "@/data/schema";

const dayMs = 24 * 60 * 60 * 1000;
/** The weekly Atualização runs every Monday; past 8 days, one was missed. */
const staleAfterDays = 8;
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

export type UpdateAge = { date: string; ageDays: number; isStale: boolean };

export function updateAgeOf(meta: Meta, now: number): UpdateAge {
  const updatedAt = new Date(meta.updatedAt);
  const ageMs = now - updatedAt.getTime();
  return {
    date: dateFormat.format(updatedAt),
    ageDays: Math.floor(ageMs / dayMs),
    isStale: ageMs > staleAfterDays * dayMs,
  };
}

export function UpdatedAtLabel({ age }: { age: UpdateAge }) {
  return <p className="text-caption-lg text-fg-secondary">Atualizado em {age.date}</p>;
}

export function StaleDataAlert({ age }: { age: UpdateAge }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-fg-primary">
      <TriangleAlert
        aria-hidden="true"
        strokeWidth={1.5}
        className="mt-0.5 size-4 shrink-0 text-warning-fg"
      />
      <p className="max-w-prose">
        <strong className="font-medium">Dados desatualizados:</strong> a última atualização foi em{" "}
        {age.date}, há {age.ageDays} dias. Os preços e as medições podem ter mudado no EyeJoker.
      </p>
    </div>
  );
}
