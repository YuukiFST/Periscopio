import { createRootRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppearanceButton } from "@/appearance/appearance-button";
import { categoryLabels, categorySlugs } from "@/categories";
import { Button } from "@/components/ui/button";
import { loadMeta } from "@/data/load-data";
import { GlobalSearch } from "@/global-search/global-search";
import { RecentProductsButton } from "@/recent-products/recent-products-button";

export const Route = createRootRoute({
  loader: loadMeta,
  component: RootLayout,
  notFoundComponent: PageNotFound,
  errorComponent: DataLoadError,
});

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only rounded-lg bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:shadow-surface-5"
      >
        Pular para o conteúdo
      </a>
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:gap-x-6">
          <Link to="/" className="text-title font-medium">
            Periscópio
          </Link>
          <nav
            aria-label="Categorias"
            // A phone puts the Categorias on their own row, under the title and the actions.
            className="-mx-2.5 flex gap-1 max-sm:order-last max-sm:w-full sm:mx-0"
          >
            {categorySlugs.map((slug) => (
              <Link
                key={slug}
                to="/$categoria"
                params={{ categoria: slug }}
                className="relative rounded-lg px-2.5 py-1 text-body font-medium pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 text-muted-foreground underline-offset-4 hover:bg-hover hover:text-foreground active:bg-active data-[status=active]:bg-active data-[status=active]:text-foreground data-[status=active]:underline"
              >
                {categoryLabels[slug]}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <GlobalSearch />
            <RecentProductsButton />
            <AppearanceButton />
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex min-h-0 w-full flex-1 flex-col px-4 py-4">
        {children}
      </main>
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
      <h1 className="text-display text-balance">Página não encontrada</h1>
      <Link to="/" className="text-body text-foreground underline underline-offset-4">
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
        <h1 className="text-display text-balance">Não deu para carregar os dados</h1>
        <p className="text-muted-foreground">
          Verifique a conexão e tente de novo. Se o erro continuar, avise quem cuida do app.
        </p>
        <Button variant="tertiary" onClick={() => router.invalidate()}>
          Tentar de novo
        </Button>
      </div>
    </AppShell>
  );
}
