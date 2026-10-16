import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { categoryLabels, categorySlugs } from "@/categories";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: PageNotFound,
});

function RootLayout() {
  return (
    <div className="min-h-dvh bg-page text-fg-primary">
      <header className="sticky top-0 z-10 border-b border-border bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-4">
          <Link to="/" className="font-serif text-heading-6 font-medium">
            EyeJoker
          </Link>
          <nav aria-label="Categorias" className="flex gap-1">
            {categorySlugs.map((slug) => (
              <Link
                key={slug}
                to="/$categoria"
                params={{ categoria: slug }}
                className="rounded-md px-2.5 py-1 text-body-sm font-medium text-fg-secondary hover:bg-component-hover hover:text-fg-primary data-[status=active]:bg-component data-[status=active]:text-fg-primary"
              >
                {categoryLabels[slug]}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function PageNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-heading-5">Página não encontrada</h1>
      <Link to="/" className="text-body-sm text-brand-fg underline-offset-4 hover:underline">
        Voltar para o início
      </Link>
    </div>
  );
}
