"use client";

import { useState } from "react";
import type { Product, PriceTier, Category } from "@/types";
import FavoritoProductCard from "@/components/home/FavoritoProductCard";

interface Props {
  products: (Product & { variants: NonNullable<Product["variants"]> })[];
  priceTiers: PriceTier[];
  categories: Category[];
}

// Icono de corazón en círculo blanco junto al título, calcado de "Group 985.svg"
// en /public/Home/FAVORITOS DEL MOMENTO/ (mismo trazo y color #00A5A3).
function HeartBadge() {
  return (
    <svg viewBox="0 0 63 62" className="h-[58px] w-[58px] shrink-0" fill="none">
      <g>
        <ellipse cx="30.5" cy="26" rx="21.5" ry="21" fill="white" className="drop-shadow-md" />
      </g>
      <path
        d="M37.9357 17.515C35.3293 16.4478 32.5603 17.0843 30.4941 19.2141C28.2543 16.9057 25.1915 16.3555 22.4552 17.7848C18.5317 19.9548 18.2792 24.3835 20.0576 27.6349C20.8054 29.0453 21.9296 30.3244 23.4944 31.5442L30.4941 37L38.0498 31.0793C39.1484 30.2191 40.0674 29.1234 40.9415 27.6314L40.9451 27.6243C41.6286 26.3204 41.9636 25.1088 41.9976 23.8108C42.0704 21.0646 40.4777 18.5929 37.9357 17.515Z"
        fill="#00A5A3"
      />
    </svg>
  );
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
      {/* Título */}
      <h2 className="mb-5 flex items-center gap-3 font-display text-[42px] font-bold text-foreground">
        <HeartBadge />
        Favoritos <span className="text-primary">del momento</span>
      </h2>

      {/* Categorías */}
      <div className="mb-6 flex flex-wrap gap-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.slug ?? "all"}
            onClick={() => setActiveSlug(tab.slug)}
            className="relative cursor-pointer overflow-hidden rounded-pill bg-white px-5 py-2 text-sm font-semibold text-black shadow-[0_4px_10px_rgba(0,0,0,0.08)] outline outline-0 outline-transparent before:absolute before:inset-0 before:-z-10 before:rounded-pill before:bg-gradient-to-r before:from-[#A8E9EA] before:to-[#7FDCDD] before:opacity-0 before:content-[''] before:[transition:opacity_420ms_cubic-bezier(0.22,1,0.36,1)] [transition:color_420ms_cubic-bezier(0.22,1,0.36,1),outline-color_420ms_cubic-bezier(0.22,1,0.36,1),outline-width_420ms_cubic-bezier(0.22,1,0.36,1),box-shadow_420ms_cubic-bezier(0.22,1,0.36,1),transform_420ms_cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:text-[#007F87] hover:shadow-[0_6px_18px_rgba(0,0,0,0.15)] hover:outline-2 hover:outline-white hover:before:opacity-100"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-ui-gray">
          No hay productos en esta categoría aún.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((product, index) => (
            <FavoritoProductCard key={product.id} product={product} priceTiers={priceTiers} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
