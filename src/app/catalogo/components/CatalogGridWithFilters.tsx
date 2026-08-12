"use client";

import { useState } from "react";
import type { Product, PriceTier } from "@/types";
import FavoritoProductCard from "@/components/home/FavoritoProductCard";
import FiltersPanel, { applyFilters, type AppliedFilters } from "./FiltersPanel";

type ProductWithVariants = Product & { variants: NonNullable<Product["variants"]> };

const DEFAULT_FILTERS: AppliedFilters = {
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
  const filtered = applyFilters(products, priceTiers, filters);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ui-gray">
          {count} producto{count !== 1 ? "s" : ""}
          {categoryLabel ? ` en ${categoryLabel}` : ""}
        </p>
        <FiltersPanel products={products} onApply={setFilters} />
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