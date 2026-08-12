"use client";

import { useState } from "react";
import type { Product, PriceTier } from "@/types";
import { createClient } from "@/lib/supabase/client";
import FavoritoProductCard from "@/components/home/FavoritoProductCard";
import FiltersPanel, { applyFilters, type AppliedFilters } from "./FiltersPanel";

type ProductWithVariants = Product & { variants: NonNullable<Product["variants"]> };

const DEFAULT_FILTERS: AppliedFilters = {
  keyword: "",
  material: "",
  minPrice: 0,
  maxPrice: 1000,
  colors: [],
};

export default function CatalogGridWithFilters({
  products,
  priceTiers,
  count,
  categoryLabel,
}: {
  products: ProductWithVariants[];
  priceTiers: PriceTier[];
  count: number;
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

  const effectiveProducts = fullCatalog ?? products;
  const filtered = applyFilters(effectiveProducts, priceTiers, filters);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ui-gray">
          {count} producto{count !== 1 ? "s" : ""}
          {categoryLabel ? ` en ${categoryLabel}` : ""}
        </p>
        <FiltersPanel products={effectiveProducts} onApply={setFilters} onOpen={ensureFullCatalog} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🔍</span>
          <h2 className="font-display font-semibold text-lg text-foreground">Sin resultados</h2>
          <p className="text-ui-gray text-sm mt-1">Intenta con otros filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, index) => (
            <FavoritoProductCard key={product.id} product={product} priceTiers={priceTiers} index={index} />
          ))}
        </div>
      )}
    </>
  );
}