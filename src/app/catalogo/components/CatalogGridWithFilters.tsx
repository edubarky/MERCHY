"use client";

import { useState } from "react";
import type { Product, PriceTier } from "@/types";
import { createClient } from "@/lib/supabase/client";
import FavoritoProductCard from "@/components/home/FavoritoProductCard";
import FiltersPanel, { applyFilters, sortProducts, DEFAULT_FILTERS, type AppliedFilters } from "./FiltersPanel";

type ProductWithVariants = Product & { variants: NonNullable<Product["variants"]> };

export default function CatalogGridWithFilters({
  products,
  priceTiers,
  categoryIds,
  categoryLabel,
}: {
  products: ProductWithVariants[];
  priceTiers: PriceTier[];
  /** IDs de categoría reales del ?categoria= actual (null = todo el
   * catálogo). El catálogo completo que trae ensureFullCatalog es de
   * TODAS las categorías — hay que volver a acotarlo por estos IDs o se
   * cuelan productos de otras categorías (ver charla 2026-09-10). */
  categoryIds: string[] | null;
  categoryLabel: string | null;
}) {
  const [filters, setFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);

  // `products` is only the current *page* (server-paginated, PAGE_SIZE=12)
  // — every filter here (material/price/color, and now keyword) needs to
  // search the whole catalog, not just whatever 12 happen to be loaded, or
  // "buscar playera" would silently miss products sitting on another page.
  // Fetched lazily (once, client-side) the first time the Filtros modal is
  // opened, not on initial page load — most visits never open it.
  const [fullCatalog, setFullCatalog] = useState<ProductWithVariants[] | null>(null);
  const [fullCatalogLoading, setFullCatalogLoading] = useState(false);

  async function ensureFullCatalog() {
    if (fullCatalog || fullCatalogLoading) return;
    setFullCatalogLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(
          `
          id, sku, name, description, category_id, composition,
          sizes_available, costo, active, created_at,
          category:categories(id, name, slug, icon, sort_order, active),
          variants:product_variants(id, product_id, sku, color_name, color_hex, images, stock, active)
        `
        )
        .eq("active", true);
      if (data) setFullCatalog(data as unknown as ProductWithVariants[]);
    } finally {
      setFullCatalogLoading(false);
    }
  }

  // El catálogo completo trae todas las categorías — se re-acota a la
  // categoría actual (los `products` del servidor ya vienen acotados, así
  // que solo aplica cuando ya se cargó `fullCatalog`).
  const catalogInScope =
    fullCatalog && categoryIds ? fullCatalog.filter((p) => categoryIds.includes(p.category_id)) : fullCatalog;
  const effectiveProducts = catalogInScope ?? products;
  const filtered = sortProducts(applyFilters(effectiveProducts, priceTiers, filters), priceTiers, filters.sort);

  return (
    <>
      {/* Barra de filtros horizontal — Ordenar / Color / Material / Precio
          como menús propios, más el buscador de palabra clave y los chips
          de filtros activos (ver charla 2026-09-10). Antes era un panel
          lateral deslizante. */}
      <FiltersPanel
        products={effectiveProducts}
        appliedFilters={filters}
        resultCount={filtered.length}
        categoryLabel={categoryLabel}
        onApply={setFilters}
        onOpen={ensureFullCatalog}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🔍</span>
          {filters.colors.length > 0 ? (
            <>
              <h2 className="font-display font-semibold text-lg text-foreground">
                No encontramos productos en este color.
              </h2>
              <p className="text-ui-gray text-sm mt-1">Prueba con otro color.</p>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, colors: [] })}
                className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:scale-105"
              >
                Limpiar color
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-lg text-foreground">
                No encontramos productos con estos filtros.
              </h2>
              <p className="text-ui-gray text-sm mt-1">Prueba eliminando algún filtro.</p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:scale-105"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, index) => (
            <FavoritoProductCard
              key={product.id}
              product={product}
              priceTiers={priceTiers}
              index={index}
              activeColors={filters.colors}
            />
          ))}
        </div>
      )}
    </>
  );
}