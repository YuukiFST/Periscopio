import { useLocation, useMatch, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import type { CategorySlug } from "@/categories";
import { productIdsParam } from "@/product-compare/compare-selection";

/**
 * Changes the Comparação marks in the link, the same way from the table and
 * from the side panel.
 *
 * With a panel opened from the table, the browser's back from here lands on
 * the table with the old marks, and the marks live only in the link: this
 * entry becomes the table with the new marks and the panel opens again above
 * it, so back returns to the table as the panel left it. Opened from anywhere
 * else (the Comparação, a link), back keeps leading there.
 */
export function useChangeComparedIds(category: CategorySlug) {
  const openId = useMatch({ from: "/$categoria/$id", shouldThrow: false })?.params.id;
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const router = useRouter();
  const fromCategoryTable = useLocation({
    select: (location) => location.state.fromCategoryTable === true,
  });

  return function changeComparedIds(ids: readonly string[]) {
    const nextSearch = { ...search, cmp: productIdsParam(ids) };
    if (openId === undefined || !fromCategoryTable) {
      void navigate({ to: ".", search: nextSearch, replace: true });
      return;
    }
    void navigate({
      to: "/$categoria",
      params: { categoria: category },
      search: nextSearch,
      replace: true,
    });
    // The browser history batches writes in a microtask; unflushed, the two become one push.
    router.history.flush();
    void navigate({
      to: "/$categoria/$id",
      params: { categoria: category, id: openId },
      search: nextSearch,
      state: { fromCategoryTable: true },
    });
  };
}
