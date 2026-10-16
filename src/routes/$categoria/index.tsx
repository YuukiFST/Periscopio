import { createFileRoute, notFound } from "@tanstack/react-router";
import { categoryLabels, isCategorySlug } from "@/categories";

export const Route = createFileRoute("/$categoria/")({
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound();
    return { categorySlug: params.categoria };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { categorySlug } = Route.useRouteContext();
  return <h1 className="font-serif text-heading-5">{categoryLabels[categorySlug]}</h1>;
}
