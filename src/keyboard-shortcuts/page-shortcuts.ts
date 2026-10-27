import { useEffect, useEffectEvent } from "react";

export const isApplePlatform =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Takes a key press heard anywhere on the page; returns `true` when it acted on it. */
type PageShortcut = (event: KeyboardEvent) => boolean;

// One window listener for every page-wide shortcut, so a key goes to one of them only.
const pageShortcuts = new Set<PageShortcut>();

function runPageShortcuts(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  for (const shortcut of pageShortcuts) {
    if (!shortcut(event)) continue;
    event.preventDefault();
    return;
  }
}

/** Listens for a page-wide shortcut while the component is mounted. */
export function usePageShortcut(shortcut: PageShortcut) {
  const onShortcut = useEffectEvent(shortcut);
  useEffect(() => {
    const registered: PageShortcut = (event) => onShortcut(event);
    if (pageShortcuts.size === 0) window.addEventListener("keydown", runPageShortcuts);
    pageShortcuts.add(registered);
    return () => {
      pageShortcuts.delete(registered);
      if (pageShortcuts.size === 0) window.removeEventListener("keydown", runPageShortcuts);
    };
  }, []);
}

/**
 * Whether the key goes to a field the user types or picks in. The table's
 * Comparação checkbox is not one: the row keys work from it too.
 */
function isFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return target.type !== "checkbox";
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** A single-key shortcut fires only without Ctrl, Meta or Alt, and outside fields. */
export function isSingleKeyShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isFieldTarget(event.target);
}

/** Whether a modal dialog hides the element from the keyboard and screen readers. */
export function isBehindModal(element: Element): boolean {
  return element.closest('[inert], [aria-hidden="true"]') !== null;
}
