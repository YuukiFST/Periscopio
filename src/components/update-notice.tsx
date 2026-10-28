import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import type { Meta } from "@/data/schema";
import type { NovidadeCounts } from "@/product-table/novidades";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

/** The date of the last Atualização, small, so it never pushes the content down. */
export function UpdatedAtLabel({ meta }: { meta: Meta }) {
  return (
    <p className="text-caption text-muted-foreground">
      Atualizado em {dateFormat.format(new Date(meta.updatedAt))}
    </p>
  );
}

function lastSeenKey(category: CategorySlug): string {
  return `periscopio:ultima-atualizacao-vista:${category}`;
}

const lastSeenSchema = z.iso.datetime();

/** Null as well when the browser blocks site storage, so the table still opens without it. */
function readLastSeenUpdate(category: CategorySlug): string | null {
  try {
    const parsed = lastSeenSchema.safeParse(localStorage.getItem(lastSeenKey(category)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * What the last visit saw, read once per page load: the visit records the current
 * Atualização right away, and a remount of the table must still compare with the old one.
 */
const lastSeenAtLoad = new Map<CategorySlug, string | null>();

/**
 * The `updatedAt` of the Atualização the last visit to this Categoria showed,
 * and how to mark the current one seen in this visit too, which ends the notice.
 * The visit records the current one in storage, never an older one.
 */
export function useLastSeenUpdate(
  category: CategorySlug,
  updatedAt: string,
): [lastSeen: string | null, markSeen: () => void] {
  const [lastSeen, setLastSeen] = useState(() => {
    if (!lastSeenAtLoad.has(category)) lastSeenAtLoad.set(category, readLastSeenUpdate(category));
    return lastSeenAtLoad.get(category) ?? null;
  });
  function markSeen() {
    lastSeenAtLoad.set(category, updatedAt);
    setLastSeen(updatedAt);
  }
  useEffect(() => {
    const stored = readLastSeenUpdate(category);
    if (stored !== null && Date.parse(stored) >= Date.parse(updatedAt)) return;
    try {
      localStorage.setItem(lastSeenKey(category), updatedAt);
    } catch {
      // Without site storage every visit reads as the first, so no notice shows.
    }
  }, [category, updatedAt]);
  return [lastSeen, markSeen];
}

const countFormat = new Intl.NumberFormat("pt-BR");

/** "14 produtos novos e 3 testados desde sua última visita". */
export function novidadesNoticeText({ novos, testados }: NovidadeCounts): string {
  const parts: string[] = [];
  if (novos > 0) {
    parts.push(novos === 1 ? "1 produto novo" : `${countFormat.format(novos)} produtos novos`);
  }
  if (testados > 0) {
    const adjective = testados === 1 ? "testado" : "testados";
    const noun = novos > 0 ? "" : testados === 1 ? "produto " : "produtos ";
    parts.push(`${countFormat.format(testados)} ${noun}${adjective}`);
  }
  return `${parts.join(" e ")} desde sua última visita`;
}

export function NovidadesNotice({
  counts,
  onShow,
  onDismiss,
}: {
  counts: NovidadeCounts;
  onShow: () => void;
  onDismiss: () => void;
}) {
  return (
    // On a phone the buttons drop under the sentence, so it is not read a word per line.
    <div className="flex flex-wrap items-center gap-x-2 rounded-xl bg-novidade-subtle py-1 ps-3 pe-1 text-body text-foreground">
      <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-novidade" />
      <p className="min-w-0 flex-1 basis-48">{novidadesNoticeText(counts)}</p>
      <Button
        variant="ghost"
        onClick={onShow}
        className="ms-auto text-novidade hover:text-novidade"
      >
        Ver novidades
      </Button>
      <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={onDismiss}>
        <X aria-hidden="true" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
