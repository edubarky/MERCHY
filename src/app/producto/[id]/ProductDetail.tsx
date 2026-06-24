"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductVariant, PriceTier } from "@/types";
import { getProductUnitPrice, formatMXN } from "@/lib/pricing";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
}

const QTY_SAMPLES = [1, 10, 25, 50, 100, 250, 500];

export default function ProductDetail({ product, priceTiers }: Props) {
  const activeVariants = product.variants.filter((v) => v.active);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(activeVariants[0] ?? product.variants[0]);
  const [selectedImage, setSelectedImage] = useState(0);

  const images = selectedVariant?.images ?? [];

  function selectVariant(v: ProductVariant) {
    setSelectedVariant(v);
    setSelectedImage(0);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-ui-gray mb-6">
        <a href="/catalogo" className="hover:text-primary transition-colors">Catálogo</a>
        <span className="mx-2">›</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Galería ── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-ui-border relative">
            {images[selectedImage] ? (
              <Image
                src={images[selectedImage]}
                alt={`${product.name} — ${selectedVariant?.color_name}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-light to-gray-100">
                <span className="text-5xl font-display font-bold text-primary opacity-30 select-none">
                  {product.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
                    i === selectedImage ? "border-primary" : "border-ui-border hover:border-gray-300"
                  }`}
                >
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-ui-gray mb-1">{product.category?.name}</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">{product.name}</h1>
            <p className="text-xs text-ui-gray mt-1 font-mono">SKU: {product.sku}</p>
          </div>

          {/* Color selector */}
          {activeVariants.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Color: <span className="font-normal text-ui-gray">{selectedVariant?.color_name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => selectVariant(v)}
                    title={v.color_name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedVariant?.id === v.id
                        ? "border-primary scale-110 ring-2 ring-primary/30"
                        : "border-white ring-1 ring-ui-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: v.color_hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes_available.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Tallas disponibles</p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes_available.map((size) => (
                  <span key={size} className="px-3 py-1 rounded-lg border border-ui-border text-sm text-foreground bg-white">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Descripción</p>
              <p className="text-sm text-ui-gray leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Composition */}
          {product.composition && (
            <p className="text-xs text-ui-gray">Composición: {product.composition}</p>
          )}

          {/* Price table */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Precio por cantidad (IVA incluido)</p>
            <div className="rounded-xl border border-ui-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-ui-border">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-ui-gray uppercase">Cantidad</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-ui-gray uppercase">Precio / pieza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {priceTiers.map((tier) => {
                    const price = getProductUnitPrice(product.costo, tier.qty_min, priceTiers);
                    return (
                      <tr key={tier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">{tier.label} pzas</td>
                        <td className="px-4 py-2.5 text-right font-bold text-primary">{formatMXN(price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <a
            href={`https://wa.me/5215500000000?text=${encodeURIComponent(`Hola, me interesa cotizar: ${product.name} (SKU: ${product.sku})`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-base hover:bg-primary-dark transition-colors"
          >
            Solicitar cotización
          </a>
          <p className="text-xs text-center text-ui-gray">Te contactamos en menos de 24 horas</p>
        </div>
      </div>
    </div>
  );
}
