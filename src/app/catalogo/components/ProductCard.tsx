"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product, PriceTier } from "@/types";
import { getProductUnitPrice, formatMXN } from "@/lib/pricing";

interface Props {
  product: Product & { variants: NonNullable<Product["variants"]> };
  priceTiers: PriceTier[];
}

export default function ProductCard({ product, priceTiers }: Props) {
  const activeVariants = product.variants.filter((v) => v.active);
  const firstImage = activeVariants.flatMap((v) => v.images)[0] ?? null;
  const precioDesde = getProductUnitPrice(product.costo, 1, priceTiers);
  const hasSizes = product.sizes_available.length > 0;

  return (
    <Link
      href={`/producto/${product.id}`}
      className="group bg-ui-surface rounded-card overflow-hidden border border-ui-border hover:border-primary hover:shadow-lg transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-light to-gray-100">
            <span className="text-3xl font-display font-bold text-primary opacity-40 select-none">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Badge */}
        <span className="absolute top-2 left-2 bg-accent-orange text-white text-xs font-semibold px-2 py-0.5 rounded-pill">
          Mejor precio por cantidad
        </span>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-pill shadow-md">
            Ver producto
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-ui-gray">{product.category?.name}</p>
        <h3 className="font-sans font-semibold text-foreground text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Color swatches */}
        {activeVariants.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {activeVariants.slice(0, 8).map((v) => (
              <span
                key={v.id}
                title={v.color_name}
                className="w-4 h-4 rounded-full border border-white ring-1 ring-ui-border flex-shrink-0"
                style={{ backgroundColor: v.color_hex }}
              />
            ))}
            {activeVariants.length > 8 && (
              <span className="text-xs text-ui-gray">+{activeVariants.length - 8}</span>
            )}
          </div>
        )}

        {/* Price + sizes badge */}
        <div className="mt-auto pt-1 flex items-center justify-between">
          <div>
            <p className="text-xs text-ui-gray">desde</p>
            <p className="font-display font-bold text-foreground text-base">
              {formatMXN(precioDesde)}
            </p>
            <p className="text-xs text-ui-gray">IVA incluido / pieza</p>
          </div>
          {hasSizes && (
            <span className="text-xs bg-ui-border text-ui-gray px-2 py-0.5 rounded-pill">
              Con tallas
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
