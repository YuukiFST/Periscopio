import { createRootRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { categoryLabels, categorySlugs } from "@/categories";
import { Button } from "@/components/ui/button";
import { loadMeta } from "@/data/load-data";

export const Route = createRootRoute({
  loader: loadMeta,
  component: RootLayout,
  notFoundComponent: PageNotFound,
  errorComponent: DataLoadError,
});

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-page text-fg-primary">
      <header className="shrink-0 border-b border-border bg-page">
        <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:gap-x-6">
          <Link to="/" className="font-serif text-heading-6 font-medium">
            Periscópio
          </Link>
          <nav aria-label="Categorias" className="-mx-2.5 flex gap-1 sm:mx-0">
            {categorySlugs.map((slug) => (
              <Link
                key={slug}
                to="/$categoria"
                params={{ categoria: slug }}
                className="rounded-md px-2.5 py-1 text-body-sm font-medium text-fg-secondary underline-offset-4 hover:bg-component-hover hover:text-fg-primary active:bg-component-active data-[status=active]:bg-component-active data-[status=active]:text-fg-primary forced-colors:data-[status=active]:underline"
              >
                {categoryLabels[slug]}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex min-h-0 w-full flex-1 flex-col px-4 py-4">{children}</main>
    </div>
  );
}

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
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

function DataLoadError() {
  const router = useRouter();
  return (
    <AppShell>
      <div className="space-y-3">
        <h1 className="font-serif text-heading-5">Não deu para carregar os dados</h1>
        <p className="text-fg-secondary">
          Verifique a conexão e tente de novo. Se o erro continuar, avise quem cuida do app.
        </p>
        <Button variant="outline" size="lg" onClick={() => router.invalidate()}>
          Tentar de novo
        </Button>
      </div>
    </AppShell>
  );
}
