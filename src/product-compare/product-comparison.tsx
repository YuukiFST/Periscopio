import { ArrowLeftRight, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { categoryLabels } from "@/categories";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { CategoryData, Product } from "@/data/schema";
import { BackToTableLink } from "@/product-detail/back-to-table-link";
import { ComparisonTable } from "./comparison-table";
import { maxComparedProducts, minComparedProducts, productIdsParam } from "./compare-selection";
import { connectionOfPreference, type ConnectionPreference } from "./mouse-connection";
import { ProductPicker } from "./product-picker";
import { responseSummary } from "./response-summary";
import { summaryVerdict } from "./summary-rows";

type ComparedProducts = {
  products: Product[];
  /** Ids in the link that no Produto of this Atualização has. */
  unknownCount: number;
  /** Known Produtos past the fourth, left out. */
  overLimitCount: number;
};

/** The link's Produtos in its order; unknown ids and those past the fourth are counted, not shown. */
function comparedProductsOf(
  data: CategoryData,
  productParam: string | undefined,
): ComparedProducts {
  const ids = [...new Set((productParam ?? "").split(",").filter((id) => id !== ""))];
  const productsById = new Map(data.products.map((product) => [product.id, product]));
  const known = ids.flatMap((id) => {
    const product = productsById.get(id);
    return product ? [product] : [];
  });
  return {
    products: known.slice(0, maxComparedProducts),
    unknownCount: ids.length - known.length,
    overLimitCount: Math.max(0, known.length - maxComparedProducts),
  };
}

function leftOutText({ unknownCount, overLimitCount }: ComparedProducts): string[] {
  const texts: string[] = [];
  if (unknownCount === 1) {
    texts.push("1 produto do link não existe nos dados atuais do EyeJoker e ficou de fora.");
  } else if (unknownCount > 1) {
    texts.push(
      `${unknownCount} produtos do link não existem nos dados atuais do EyeJoker e ficaram de fora.`,
    );
  }
  if (overLimitCount === 1) {
    texts.push(
      `A comparação mostra até ${maxComparedProducts} produtos; o outro do link ficou de fora.`,
    );
  } else if (overLimitCount > 1) {
    texts.push(
      `A comparação mostra até ${maxComparedProducts} produtos; os outros ${overLimitCount} do link ficaram de fora.`,
    );
  }
  return texts;
}

type ProductComparisonProps = {
  data: CategoryData;
  /** The raw `p` param: Produto ids separated by commas. */
  productParam: string | undefined;
  onProductParamChange: (productParam: string | undefined) => void;
  /** The `conexao` param: the connection a mouse Comparação ranks on. */
  connectionPreference: ConnectionPreference | undefined;
  onConnectionPreferenceChange: (preference: ConnectionPreference | undefined) => void;
};

const connectionOptions: SegmentedOption<ConnectionPreference | undefined>[] = [
  { value: undefined, label: "Qualquer conexão" },
  { value: "com-fio", label: "Com fio" },
  { value: "sem-fio", label: "Sem fio" },
];

const headingId = "comparacao-titulo";

export function ProductComparison({
  data,
  productParam,
  onProductParamChange,
  connectionPreference,
  onConnectionPreferenceChange,
}: ProductComparisonProps) {
  const compared = comparedProductsOf(data, productParam);
  const { products } = compared;
  const comparedIdsParam = productIdsParam(products.map((product) => product.id));
  const categoryName = categoryLabels[data.category].toLowerCase();
  const chosenConnection = connectionPreference && connectionOfPreference[connectionPreference];
  const summary = responseSummary(data, products, chosenConnection);
  // The choice shows with the Resumo; without it, a connection in the link must not hide Medições.
  const connection = summary && chosenConnection;

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `Comparação de ${categoryName} · Periscópio`;
    // A new view in a single-page app: screen readers and the keyboard start from its title.
    headingRef.current?.focus();
  }, [categoryName]);

  function removeProduct(id: string) {
    onProductParamChange(
      productIdsParam(products.flatMap((product) => (product.id === id ? [] : [product.id]))),
    );
    headingRef.current?.focus();
  }

  const comparedIds = new Set(products.map((product) => product.id));
  const candidates = data.products.filter((product) => !comparedIds.has(product.id));

  function addProduct(added: Product) {
    onProductParamChange(productIdsParam([...products.map((product) => product.id), added.id]));
  }

  function swapProduct(id: string, replacement: Product) {
    onProductParamChange(
      productIdsParam(products.map((product) => (product.id === id ? replacement.id : product.id))),
    );
  }

  return (
    // The table scrolls inside; the article scrolls only when a short screen cannot fit the table's minimum.
    // Its 6px padding, cancelled by the margin, keeps focus outlines at its edges from being clipped.
    // Two Produtos on a wide screen keep readable columns instead of stretching across it, and the
    // title row ends where the table does.
    <article
      aria-labelledby={headingId}
      style={
        products.length >= minComparedProducts
          ? {
              maxWidth: `calc(var(--label-column) + ${products.length} * 24rem + 2px + 0.75rem)`,
            }
          : undefined
      }
      className="-m-1.5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1.5 [--label-column:7.25rem] [--peek-size:1rem] [--visible-columns:2] min-[22rem]:[--peek-size:1.5rem] min-[22rem]:[--label-column:7.5rem] sm:[--label-column:11rem] md:[--visible-columns:3] lg:[--label-column:14rem] lg:[--visible-columns:4]"
    >
      <BackToTableLink category={data.category} search={{ cmp: comparedIdsParam }} />
      <div className="flex items-start justify-between gap-4">
        <h1
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="font-serif text-heading-5 text-balance outline-none"
        >
          Comparação de {categoryName}
        </h1>
        <div className="flex flex-wrap justify-end gap-2">
          {products.length < maxComparedProducts && (
            <ProductPicker
              candidates={candidates}
              title="Adicionar produto à comparação"
              trigger={
                <Button variant="outline" size="lg">
                  <Plus aria-hidden="true" strokeWidth={1.5} />
                  Adicionar produto
                </Button>
              }
              focusAfterPick={headingRef}
              onPick={addProduct}
            />
          )}
          {products.length >= minComparedProducts && <CopyLinkButton />}
        </div>
      </div>
      {leftOutText(compared).map((text) => (
        <p
          key={text}
          className="flex max-w-prose items-start gap-2 rounded-lg bg-warning-subtle px-3 py-2 text-pretty text-fg-primary"
        >
          <TriangleAlert
            aria-hidden="true"
            strokeWidth={1.5}
            className="mt-0.5 size-4 shrink-0 text-warning-fg"
          />
          {text}
        </p>
      ))}
      {products.length < minComparedProducts ? (
        <NotEnoughProducts count={products.length} />
      ) : (
        <>
          {summary && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <SegmentedControl
                legend="Conexão que você usa"
                name="conexao"
                options={connectionOptions}
                value={connectionPreference}
                onValueChange={onConnectionPreferenceChange}
              />
              <p aria-live="polite" className="font-medium text-pretty">
                {summaryVerdict(summary)}
              </p>
            </div>
          )}
          <ComparisonTable
            data={data}
            products={products}
            labelledBy={headingId}
            summary={summary}
            connection={connection}
            onRemove={removeProduct}
            renderSwapControl={(product) => (
              <ProductPicker
                candidates={candidates}
                title={`Trocar ${product.name} na comparação`}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Trocar ${product.name}`}
                    className="-ms-1.5 text-fg-secondary hover:text-fg-primary pointer-coarse:h-10"
                  >
                    <ArrowLeftRight aria-hidden="true" data-icon="inline-start" />
                    Trocar
                  </Button>
                }
                focusAfterPick={headingRef}
                onPick={(replacement) => swapProduct(product.id, replacement)}
              />
            )}
          />
        </>
      )}
    </article>
  );
}

function NotEnoughProducts({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-lg border border-border px-4 py-6">
      <p className="font-medium">
        {count === 0
          ? "Nenhum produto para comparar."
          : "Só 1 produto na comparação. Ela precisa de pelo menos 2."}
      </p>
      <p className="text-pretty text-fg-secondary">
        Use “Adicionar produto” ou marque de {minComparedProducts} a {maxComparedProducts} produtos
        na tabela e selecione “Comparar”.
      </p>
    </div>
  );
}
