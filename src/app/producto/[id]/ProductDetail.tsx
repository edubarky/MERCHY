"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Product, ProductVariant, PriceTier } from "@/types";
import { getProductUnitPrice, formatMXN } from "@/lib/pricing";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
}

// Reseñas de muestra — se conectarán a datos reales en la fase de "reseñas e interacciones".
const REVIEWS = [
  { name: "Juan Pérez", rating: 5, comment: "Excelente producto. Muy buena calidad y envío rápido." },
  { name: "Ana López", rating: 5, comment: "Excelente producto. Muy buena calidad y envío rápido." },
];

function DocIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function RulerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18M3 8v8a1 1 0 001 1h16a1 1 0 001-1V8M7 8v3m4-3v3m4-3v3m4-3v3" />
    </svg>
  );
}

function TagIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.169.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L10.409 3.66A2.25 2.25 0 008.818 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function ThreadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m10-10l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16">
      <circle cx="4" cy="4" r="2.6" fill="#F472B6" />
      <circle cx="12" cy="4" r="2.6" fill="#38BDF8" />
      <circle cx="4" cy="12" r="2.6" fill="#FBBF24" />
      <circle cx="12" cy="12" r="2.6" fill="#1E2532" />
    </svg>
  );
}

function StarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.78L10 14.9l-5.21 2.6 1-5.78-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

function InfoLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors text-left">
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Envoltura de animación de entrada/salida para cada sección de tallas por
// color. Entrada: opacity 0→1 + translateY 12px→0 (300ms ease-out).
// Salida: opacity 1→0 + translateY 0→-12px (200ms ease-out); al terminar
// la transición, avisa al padre (onExited) para quitarla del DOM.
function AnimatedSizeSection({
  leaving,
  onExited,
  children,
}: {
  leaving: boolean;
  onExited: () => void;
  children: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity" && leaving) onExited();
      }}
      className={`transition-all ${
        leaving
          ? "opacity-0 -translate-y-3 duration-200 ease-out"
          : entered
          ? "opacity-100 translate-y-0 duration-300 ease-out"
          : "opacity-0 translate-y-3"
      }`}
    >
      {children}
    </div>
  );
}

// Contador − / número / + de una talla. El número es clicable y se
// convierte en un input editable (Enter o blur confirman el valor).
function SizeCounter({ qty, onChange }: { qty: number; onChange: (next: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(qty));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(qty));
  }, [qty, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const parsed = parseInt(draft, 10);
    onChange(Number.isNaN(parsed) ? qty : Math.max(0, parsed));
    setEditing(false);
  }

  const buttonClass =
    "text-xs leading-none text-primary hover:scale-105 active:scale-90 transition-transform duration-150";

  return (
    <>
      <span className="block w-3/5 border-t border-gray-200 mt-1 pt-1.5" />
      <span className="flex items-center justify-center gap-2.5">
        <button type="button" onClick={() => onChange(Math.max(0, qty - 1))} aria-label="Restar" className={buttonClass}>
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="font-display font-semibold text-[15px] w-5 text-center bg-transparent outline-none text-foreground"
          />
        ) : (
          <span
            key={qty}
            onClick={() => {
              setDraft(String(qty));
              setEditing(true);
            }}
            className="font-display font-semibold text-[15px] w-5 text-center text-foreground animate-badge-in cursor-text"
            style={{ animationDuration: "180ms" }}
          >
            {qty}
          </span>
        )}
        <button type="button" onClick={() => onChange(qty + 1)} aria-label="Sumar" className={buttonClass}>
          +
        </button>
      </span>
    </>
  );
}

// Tarjeta cuadrada premium con el total de piezas seleccionadas para un color.
function TotalPzasCard({ total }: { total: number }) {
  return (
    <div
      className="ml-[22px] w-16 h-16 shrink-0 flex flex-col items-center justify-center bg-white border-2 border-primary rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-[180ms] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
    >
      <span key={total} className="font-display font-bold text-[26px] leading-none text-primary animate-total-pulse">
        {total}
      </span>
      <span className="font-display font-medium text-[10px] uppercase tracking-wide text-foreground mt-1">
        Piezas
      </span>
    </div>
  );
}

export default function ProductDetail({ product, priceTiers }: Props) {
  const activeVariants = product.variants.filter((v) => v.active);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(activeVariants[0] ?? product.variants[0]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [multicolor, setMulticolor] = useState(false);
  // Colores elegidos en modo Multicolor, en el orden en que se fueron seleccionando.
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(10);
  // Cantidad por talla, independiente por color: { [variantId]: { [talla]: cantidad } }.
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, Record<string, number>>>({});

  const images = selectedVariant?.images ?? [];
  const unitPrice = getProductUnitPrice(product.costo, quantity, priceTiers);
  const totalPrice = unitPrice * quantity;
  const sizes = product.sizes_available;

  function defaultSizeQty(variant: ProductVariant) {
    return Math.max(1, Math.floor(variant.stock / Math.max(1, sizes.length)));
  }

  function getSizeQty(variant: ProductVariant, size: string) {
    const existing = sizeQuantities[variant.id]?.[size];
    return existing !== undefined ? existing : defaultSizeQty(variant);
  }

  function setSizeQty(variant: ProductVariant, size: string, value: number) {
    setSizeQuantities((prev) => ({
      ...prev,
      [variant.id]: { ...prev[variant.id], [size]: Math.max(0, value) },
    }));
  }

  function toggleMulticolor() {
    setMulticolor((m) => {
      const next = !m;
      if (next) setSelectedColorIds([]); // al activar, arranca sin ninguna sección
      return next;
    });
  }

  function selectVariant(v: ProductVariant) {
    // La imagen de galería siempre sigue al último color tocado, en ambos modos.
    setSelectedVariant(v);
    setSelectedImage(0);
    if (multicolor) {
      setSelectedColorIds((prev) =>
        prev.includes(v.id) ? prev.filter((id) => id !== v.id) : [...prev, v.id]
      );
    }
  }

  const targetVariants = multicolor
    ? (selectedColorIds.map((id) => activeVariants.find((v) => v.id === id)).filter(Boolean) as ProductVariant[])
    : activeVariants.filter((v) => v.id === selectedVariant?.id);
  const targetKey = targetVariants.map((v) => v.id).join("|");

  const [sections, setSections] = useState<{ id: string; variant: ProductVariant; leaving: boolean }[]>(
    targetVariants.map((v) => ({ id: v.id, variant: v, leaving: false }))
  );

  useEffect(() => {
    setSections((prev) => {
      const targetIds = targetVariants.map((v) => v.id);
      const kept = prev.map((s) => (targetIds.includes(s.id) ? { ...s, leaving: false } : { ...s, leaving: true }));
      const existingIds = kept.map((s) => s.id);
      const additions = targetVariants
        .filter((v) => !existingIds.includes(v.id))
        .map((v) => ({ id: v.id, variant: v, leaving: false }));
      return [...kept, ...additions];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  function handleSectionExited(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  const avgRating = REVIEWS.length ? REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => REVIEWS.filter((r) => r.rating === star).length);

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
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-ui-border relative">
            {images[selectedImage] ? (
              <div className="absolute inset-[5%]">
                <Image
                  src={images[selectedImage]}
                  alt={`${product.name} — ${selectedVariant?.color_name}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-light to-gray-100">
                <span className="text-5xl font-display font-bold text-primary opacity-30 select-none">
                  {product.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-[78px] h-[78px] flex-shrink-0 rounded-full overflow-hidden border-2 shadow-md transition-colors ${
                    i === selectedImage ? "border-primary" : "border-white hover:border-gray-300"
                  }`}
                >
                  <Image src={url} alt="" fill sizes="78px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-ui-gray mb-1">{product.category?.name}</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground uppercase">{product.name}</h1>
            <p className="text-xs text-ui-gray mt-1">{product.sku}</p>
          </div>

          {product.description && (
            <p className="text-sm text-ui-gray leading-relaxed">{product.description}</p>
          )}

          {/* Info row */}
          <div className="flex gap-x-6 text-sm text-foreground">
            <div className="flex-1 flex flex-col gap-3">
              {product.composition && (
                <span className="flex items-start gap-1.5">
                  <ThreadIcon className="mt-0.5 shrink-0" />
                  <span>
                    <span className="font-semibold">Composición:</span> {product.composition}
                  </span>
                </span>
              )}
              {sizes.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <RulerIcon />
                  <span>
                    <span className="font-semibold">Tallas:</span>{" "}
                    {sizes.length > 1 ? `${sizes[0]} - ${sizes[sizes.length - 1]}` : sizes[0]}
                  </span>
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <InfoLink icon={<DocIcon />} label="Ficha técnica" />
              <InfoLink icon={<RulerIcon />} label="Guía de Tallas" />
              <InfoLink icon={<TagIcon className="text-[#F27A6E]" />} label="Descuento por cantidad" />
            </div>
          </div>

          {/* Color selector */}
          {activeVariants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  1. Selecciona Color: <span className="font-normal text-ui-gray">{selectedVariant?.color_name}</span>
                </p>
                <label className="flex items-center gap-2.5 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.08)] pl-3.5 pr-1.5 py-1.5 cursor-pointer select-none">
                  <DotsIcon />
                  <span className="text-sm font-bold text-foreground">Multicolor</span>
                  <button
                    type="button"
                    onClick={toggleMulticolor}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      multicolor ? "bg-primary" : "bg-gradient-to-b from-gray-200 to-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-gray-200 transition-transform ${
                        multicolor ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v) => {
                  const isHighlighted = multicolor ? selectedColorIds.includes(v.id) : selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v)}
                      title={v.color_name}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        isHighlighted
                          ? "border-primary scale-110 ring-2 ring-primary/30"
                          : "border-white ring-1 ring-ui-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: v.color_hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Cantidad + precio */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">2. Selecciona Cantidad</p>
              <div className="flex items-center gap-4 bg-gray-50 border border-ui-border rounded-full px-2 py-1.5 w-fit">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-lg text-ui-gray hover:text-foreground"
                >
                  −
                </button>
                <span className="text-sm font-semibold text-foreground w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 flex items-center justify-center text-lg text-ui-gray hover:text-foreground"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {formatMXN(totalPrice)} <span className="text-sm font-normal text-ui-gray">MXN</span>
              </p>
              <p className="text-xs text-ui-gray">IVA incluido c/u</p>
              <p className="text-xs text-ui-gray">{formatMXN(unitPrice)}</p>
            </div>
          </div>

          {/* Tallas por color */}
          {sizes.length > 0 && (
            <div className="space-y-3">
              {sections.map((s) => (
                <AnimatedSizeSection
                  key={s.id}
                  leaving={s.leaving}
                  onExited={() => handleSectionExited(s.id)}
                >
                  <p className="text-sm font-semibold text-foreground mb-1.5">Tallas - {s.variant.color_name}</p>
                  <div className="flex items-center gap-2 flex-nowrap">
                    {sizes.map((size) => (
                      <div
                        key={size}
                        className="flex flex-col items-center justify-center w-16 h-16 shrink-0 rounded-[16px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:shadow-[0_14px_34px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.05)] hover:-translate-y-[3px]"
                      >
                        <span className="font-display font-bold text-[19px] text-primary text-center">{size}</span>
                        <SizeCounter
                          qty={getSizeQty(s.variant, size)}
                          onChange={(next) => setSizeQty(s.variant, size, next)}
                        />
                      </div>
                    ))}
                    <TotalPzasCard total={sizes.reduce((sum, size) => sum + getSizeQty(s.variant, size), 0)} />
                  </div>
                </AnimatedSizeSection>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 py-3.5 rounded-full bg-[#282B34] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Personalizar producto
            </button>
            <a
              href={`https://wa.me/5215500000000?text=${encodeURIComponent(`Hola, me interesa cotizar: ${product.name} (SKU: ${product.sku})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center py-3.5 rounded-full bg-[#282B34] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Agregar al carrito
            </a>
          </div>
        </div>
      </div>

      {/* ── Reseñas ── */}
      <div className="mt-14 bg-white rounded-2xl border border-ui-border p-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <div>
          <p className="flex items-center gap-2 text-3xl font-bold text-foreground">
            {avgRating.toFixed(1)}
            <span className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} className="w-5 h-5" />
              ))}
            </span>
          </p>
          <p className="text-sm text-ui-gray mb-4">
            Basado en {REVIEWS.length} reseña{REVIEWS.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, i) => (
              <div key={star} className="flex items-center gap-2 text-xs text-ui-gray">
                <span className="w-2">{star}</span>
                <StarIcon className="w-3 h-3 text-amber-400" />
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${(ratingCounts[i] / REVIEWS.length) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right">{ratingCounts[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-ui-border">
          {REVIEWS.map((r) => (
            <div key={r.name} className="py-4 first:pt-0 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="flex text-amber-400 mb-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </p>
                <p className="text-sm text-ui-gray">{r.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}