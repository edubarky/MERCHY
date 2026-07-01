"use client";

import { useState } from "react";
import type { Product, PriceTier, Category } from "@/types";
import ProductCard from "@/app/catalogo/components/ProductCard";

interface Props {
  products: (Product & { variants: NonNullable<Product["variants"]> })[];
  priceTiers: PriceTier[];
  categories: Category[];
}

export default function FavoritosSection({ products, priceTiers, categories }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const tabs = [
    { label: "Todo", slug: null },
    ...categories.slice(0, 5).map((c) => ({ label: c.name, slug: c.slug })),
  ];

  const filtered = activeSlug
    ? products.filter((p) => (p.category as Category | null)?.slug === activeSlug)
    : products;

  const visible = filtered.slice(0, 4);

  return (
    <div>
      {/* Title */}
      <h2 className="font-display font-bold text-3xl text-foreground flex items-center gap-3 mb-5">
        <svg className="w-7 h-7 text-accent-coral" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
        </svg>
        Favoritos <span className="text-primary">del momento</span>
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.slug ?? "all"}
            onClick={() => setActiveSlug(tab.slug)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeSlug === tab.slug
                ? "bg-foreground text-white border-foreground"
                : "bg-white text-foreground border-ui-border hover:border-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {visible.length === 0 ? (
        <div className="text-center py-10 text-ui-gray text-sm">
          No hay productos en esta categoría aún.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} priceTiers={priceTiers} />
          ))}
        </div>
      )}
    </div>
  );
}
