"use client";
// Force-rebuild marker: trivial touch to bust a stale Vercel build cache.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product, ProductVariant, PriceTier } from "@/types";
import { getProductUnitPrice, formatMXN } from "@/lib/pricing";
import { VIEW_ORDER, normalizeGarmentColorName, type ResolvedProductAssets, type GarmentColor } from "./personalizar/types";
import { normalizeProductKey } from "./personalizar/printAreas";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
  // Ejes reales (Frente/Reverso/Izquierda/Derecha) por color + foto "con
  // modelo" opcional, también por color cuando el producto tiene
  // subcarpetas de color -- mismos archivos que ya usa el Personalizador
  // (ver page.tsx). Alimentan la galería de miniaturas debajo de la foto
  // principal (mismo mecanismo que ya usan productos como Tapete, solo que
  // ahí viene de product_variants.images en vez de estos archivos locales).
  resolvedGallery: ResolvedProductAssets;
  modelShots: Record<GarmentColor, string | null>;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: Date;
}

// Productos cuya galería real ya subida (product_variants.images) debe
// ganar SIEMPRE, aunque este producto/color también tenga "ejes"
// resueltos -- ver el comentario junto a `preferRealGallery` más abajo.
// Nombre exacto del producto (mismo normalizeProductKey tolerante que
// PRODUCT_PRINT_AREAS/getApplicableViews en printAreas.ts), agregado a
// mano solo cuando el usuario confirma que la galería real es mejor.
// Tapete Century: mismo caso que el Tapete de Yoga Minsk -- sus "ejes"
// hoy son solo 1 foto de Frente por color (fondo del Personalizador),
// mientras que product_variants.images ya trae 2 fotos reales por color
// (Azul/Rosa/Negro). Sin este override, arreglar el reconocimiento de
// esos dos colores (ver detectColor en resolveProductAssets.ts) haría
// que la ficha sustituyera esas 2 fotos reales por la única de Frente --
// la misma regresión ya detectada y corregida una vez con el otro tapete.
const PRODUCTS_PREFERRING_REAL_GALLERY = new Set(["tapete de yoga minsk", "tapete century"]);

// "Guía de Tallas" por defecto es la tabla de prenda (Ancho/Largo/Manga,
// XS-XXXL) -- no aplica a un producto que no es ropa. Un producto agregado
// aquí a mano (mismo criterio explícito de siempre, nunca inferido de la
// categoría) usa su propio editable en vez de esa tabla genérica. Tapete
// de Yoga Minsk: mismo lenguaje visual (tarjeta redondeada, callouts A/B),
// pero con las medidas reales del tapete extendido en vez de una talla.
const PRODUCT_SIZE_GUIDES: Record<string, string> = {
  "tapete de yoga minsk": "/Home/PAG 3/GUÍA DE TALLAS - TAPETE.svg",
  // Tapete Century: mismo tratamiento, más una segunda tabla para las
  // medidas reales de su funda (184×62×0.8 cm el tapete, 84×14 cm la
  // funda -- el Tapete de Yoga Minsk no la tenía porque esa medida no se
  // había dado todavía).
  "tapete century": "/Home/PAG 3/GUÍA DE TALLAS - TAPETE CENTURY.svg",
};
const DEFAULT_SIZE_GUIDE = "/Home/PAG 3/GUÍA DE TALLAS.svg";

// Reseñas de muestra — no persisten en base de datos; viven en estado del cliente.
const REVIEWS_SEED: Review[] = [
  { id: "seed-1", name: "Juan Pérez", rating: 5, comment: "Excelente producto. Muy buena calidad y envío rápido.", date: new Date("2026-06-10") },
  { id: "seed-2", name: "Ana López", rating: 5, comment: "Excelente producto. Muy buena calidad y envío rápido.", date: new Date("2026-05-02") },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatReviewDate(date: Date) {
  // timeZone: "UTC" es obligatorio aquí — sin esto, "2026-06-10" (parseado
  // como medianoche UTC) se formatea distinto en el servidor (UTC) que en
  // el navegador del usuario (ej. America/Mexico_City, UTC-6 -> "9 jun").
  // Ese texto distinto entre el HTML del servidor y el del cliente es un
  // error de hidratación real: React descarta y vuelve a montar TODO el
  // árbol de la ficha de golpe apenas detecta el mismatch, lo que a veces
  // se "come" el primer click del usuario justo después de cargar la
  // página (por eso "Selecciona Cantidad" podía no reaccionar al primer +).
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

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

// Switch "Multicolor" premium. OFF conserva el diseño original (blanco,
// texto negro, track gris, sin degradados/glow). ON revela un degradado
// rosa→violeta→cian con un wipe de izquierda a derecha (550ms, spring en
// el thumb), halo ambiental rosa/cian, y una respiración/shine muy sutil
// mientras permanece activo. `pulse` dispara, una sola vez por activación,
// la animación de los puntos + el efecto "wow" en los swatches de color.
function MulticolorSwitch({
  checked,
  pulse,
  onToggle,
}: {
  checked: boolean;
  pulse: number;
  onToggle: () => void;
}) {
  const justActivated = checked && pulse > 0;

  return (
    <label
      className="relative flex items-center gap-2.5 rounded-full overflow-hidden pl-3.5 pr-1.5 py-1.5 cursor-pointer select-none bg-white transition-shadow duration-500 ease-out"
      style={{
        boxShadow: checked
          ? "0 2px 10px rgba(0,0,0,0.08), -10px 0 26px rgba(255,77,184,0.28), 10px 0 26px rgba(0,212,255,0.28)"
          : "0 2px 10px rgba(0,0,0,0.08), -10px 0 26px rgba(255,77,184,0), 10px 0 26px rgba(0,212,255,0)",
      }}
    >
      {/* Fill de degradado — se revela de izquierda a derecha al activar */}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full transition-[clip-path] duration-[550ms] ease-out ${
          checked ? "animate-multicolor-drift" : ""
        }`}
        style={{
          backgroundImage: "linear-gradient(90deg, #FF4DB8 0%, #7B61FF 50%, #00D4FF 100%)",
          backgroundSize: "160% 100%",
          clipPath: checked ? "inset(0 0% 0 0 round 999px)" : "inset(0 100% 0 0 round 999px)",
        }}
      />
      {/* Halo que "respira" muy sutilmente mientras el switch está activo */}
      {checked && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none animate-multicolor-breathe"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
        />
      )}
      {/* Brillo tipo vidrio que recorre el botón cada ~7s */}
      {checked && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-8 bg-white/60 blur-md animate-multicolor-shine"
        />
      )}

      <span key={`dots-${pulse}`} className={`relative z-10 ${justActivated ? "animate-dots-activate" : ""}`}>
        <DotsIcon />
        {justActivated && (
          <span aria-hidden className="absolute -inset-1.5 rounded-full bg-white/70 animate-sparkle-out" />
        )}
      </span>

      <span
        className={`relative z-10 text-sm font-bold transition-colors duration-300 ${
          checked ? "text-white" : "text-foreground"
        }`}
      >
        Multicolor
      </span>

      <button
        type="button"
        onClick={onToggle}
        className={`relative z-10 w-9 h-5 rounded-full transition-colors duration-500 ${
          checked ? "bg-white/25" : "bg-gradient-to-b from-gray-200 to-gray-300"
        }`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white"
          style={{
            transform: checked ? "translateX(16px)" : "translateX(0)",
            transition: "transform 550ms cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow:
              "inset 0 -1px 1px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.25)",
          }}
        >
          <span className="absolute top-[2px] left-1/2 -translate-x-1/2 w-2 h-[3px] rounded-full bg-white/90 blur-[1px]" />
        </span>
      </button>
    </label>
  );
}

function StarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.78L10 14.9l-5.21 2.6 1-5.78-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

// Selector de estrellas interactivo: ilumina progresivamente en hover
// (200ms, amarillo premium) y confirma la calificación al hacer clic.
function StarRatingInput({
  value,
  onSelect,
  size = "md",
}: {
  value: number;
  onSelect: (n: number) => void;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const starClass = size === "lg" ? "w-9 h-9" : "w-6 h-6";
  const display = hover || value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onClick={() => onSelect(i)}
          aria-label={`${i} estrella${i === 1 ? "" : "s"}`}
          className="focus:outline-none"
        >
          <StarIcon
            className={`${starClass} transition-colors duration-200 ${
              display >= i ? "text-[#FDBA12]" : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function InfoLink({
  icon,
  label,
  accent = false,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  /** Sección "Rango de precios": true mientras su modal está abierto —
   * queda en turquesa (igual que :hover) hasta que se cierra, sin
   * necesidad de que el cursor siga encima. */
  active?: boolean;
  onClick?: () => void;
}) {
  // Icono y texto comparten un solo color (currentColor en el ícono, ver
  // TagIcon) para que nunca puedan desincronizarse: coral en reposo,
  // turquesa Merchy en hover o mientras el panel asociado está activo.
  const accentColorClass = active ? "text-primary" : "text-accent-coral hover:text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-1.5 font-semibold transition-colors duration-200 text-left cursor-pointer ${
        accent ? accentColorClass : "text-foreground hover:text-primary"
      }`}
    >
      <span className={accent ? "inline-flex transition-transform duration-200 group-hover:translate-x-0.5" : "inline-flex"}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

// Modal centrado (overlay negro 45% + fade/scale ~220ms) para mostrar los
// editables existentes de "Guía de Tallas" y "Rango de precios" tal cual,
// sin rediseñarlos. Cierra con click afuera, Esc o el botón X.
function InfoModal({
  open,
  onClose,
  imgSrc,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  imgSrc: string;
  alt: string;
}) {
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 transition-opacity duration-[220ms] ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-w-[90vw] max-h-[85vh] outline-none transition-all duration-[220ms] ease-out ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-foreground hover:text-primary transition-colors"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={alt} className="max-w-[90vw] max-h-[85vh] w-auto h-auto block" />
      </div>
    </div>
  );
}

// Modal "Rango de precios" — antes era una imagen estática con precios
// genéricos que no correspondían al costo real de este producto (ej.
// mostraba "$168" para 1-3 piezas de Sudadera Ocean cuando el precio real
// es $682). Ahora calcula la tabla en vivo con el mismo costo del
// producto y los mismos price_tiers reales que ya usa el precio
// principal (getProductUnitPrice) -- así siempre coincide con lo que el
// cliente realmente va a pagar. Mismo lenguaje visual/comportamiento que
// InfoModal (overlay, animación, foco atrapado, Esc/click afuera), solo
// que con una tabla real en vez de una imagen.
function PriceRangeModal({
  open,
  onClose,
  costo,
  tiers,
}: {
  open: boolean;
  onClose: () => void;
  costo: number;
  tiers: PriceTier[];
}) {
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 transition-opacity duration-[220ms] ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Rango de precios"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-[30px] bg-[#F8F7F9] p-6 outline-none transition-all duration-[220ms] ease-out ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground shadow-md transition-colors hover:text-primary"
        >
          ✕
        </button>

        <h2 className="mb-5 text-center font-display text-2xl font-bold leading-tight text-foreground">
          Rango de
          <br />
          precios
        </h2>

        <div className="overflow-hidden rounded-2xl border border-ui-border bg-white">
          <div className="flex bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary-dark">
            <span className="flex-1 text-center">Rango por unidades</span>
            <span className="flex-1 text-center">
              Precio por unidad
              <span className="block text-[9px] font-semibold text-primary-dark/70">con IVA incluido</span>
            </span>
          </div>
          {tiers.map((tier, i) => (
            <div
              key={tier.id}
              className={`flex items-center px-4 py-2.5 text-sm font-semibold text-foreground ${
                i % 2 === 1 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <span className="flex-1 text-center">{tier.label}</span>
              <span className="flex-1 text-center">{formatMXN(getProductUnitPrice(costo, tier.qty_min, tiers))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const REVIEW_MAX_LENGTH = 500;

// Modal para calificar y escribir una reseña — mismo lenguaje visual que
// InfoModal (overlay negro 45%, fade+scale ~220ms, foco atrapado, Esc/click
// afuera cierran), pero con un formulario interactivo en vez de una imagen.
function ReviewModal({
  open,
  onClose,
  initialRating,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initialRating: number;
  onSubmit: (data: { rating: number; comment: string }) => void;
}) {
  const [entered, setEntered] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setRating(initialRating);
    setComment("");
    const raf = requestAnimationFrame(() => setEntered(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRating]);

  if (!open) return null;

  const canPublish = rating > 0 && comment.trim().length > 0;

  function handlePublish() {
    if (!canPublish) return;
    onSubmit({ rating, comment: comment.trim() });
    onClose();
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 transition-opacity duration-[220ms] ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Escribir una reseña"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md bg-white rounded-[24px] p-6 sm:p-8 outline-none transition-all duration-[220ms] ease-out ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-foreground hover:text-primary transition-colors"
        >
          ✕
        </button>

        <h2 className="font-display font-bold text-lg text-foreground mb-4">¿Qué te pareció este producto?</h2>

        <StarRatingInput value={rating} onSelect={setRating} size="lg" />

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
          maxLength={REVIEW_MAX_LENGTH}
          rows={4}
          placeholder="Cuéntanos tu experiencia con el producto..."
          className="mt-4 w-full resize-none rounded-2xl border border-ui-border bg-gray-50 p-3 text-sm text-foreground placeholder:text-ui-gray/70 focus:outline-none focus:border-primary transition-colors duration-200"
        />
        <p className="text-xs text-ui-gray text-right mt-1">
          {comment.length}/{REVIEW_MAX_LENGTH}
        </p>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-ui-border text-foreground font-semibold text-sm hover:bg-gray-50 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish}
            className="flex-1 py-3 rounded-full bg-[#282B34] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(40,43,52,0.15)] hover:shadow-[0_8px_24px_rgba(40,43,52,0.22)] hover:opacity-90 transition-all duration-300 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_16px_rgba(40,43,52,0.15)]"
          >
            Publicar reseña
          </button>
        </div>
      </div>
    </div>
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
    "text-[10px] leading-none text-primary hover:scale-105 active:scale-90 transition-transform duration-150";

  return (
    <>
      <span className="block w-3/5 border-t border-gray-200 mt-0.5 pt-1" />
      <span className="flex items-center justify-center gap-2">
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
            className="font-display font-semibold text-[12px] w-4 text-center bg-transparent outline-none text-foreground"
          />
        ) : (
          <span
            key={qty}
            onClick={() => {
              setDraft(String(qty));
              setEditing(true);
            }}
            className="font-display font-semibold text-[12px] w-4 text-center text-foreground animate-badge-in cursor-text"
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

export default function ProductDetail({ product, priceTiers, resolvedGallery, modelShots }: Props) {
  const activeVariants = product.variants.filter((v) => v.active);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(activeVariants[0] ?? product.variants[0]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [multicolor, setMulticolor] = useState(false);
  // Se incrementa cada vez que Multicolor se activa; dispara, una sola
  // vez por activación, la animación de los puntos y el "wow" en swatches.
  const [colorPulse, setColorPulse] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [quantityDiscountOpen, setQuantityDiscountOpen] = useState(false);
  // Colores elegidos en modo Multicolor, en el orden en que se fueron seleccionando.
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  // Cantidad por talla, independiente por color: { [variantId]: { [talla]: cantidad } }.
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, Record<string, number>>>({});
  const [reviews, setReviews] = useState<Review[]>(REVIEWS_SEED);
  // Calificaciones "solo estrellas" — cuentan para el promedio y la
  // distribución, pero no generan una tarjeta de reseña visible.
  const [standaloneRatings, setStandaloneRatings] = useState<number[]>([]);
  const [quickRating, setQuickRating] = useState(0);
  const [reviewSort, setReviewSort] = useState<"recent" | "best" | "worst">("recent");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [modalInitialRating, setModalInitialRating] = useState(0);
  // Edición manual del selector superior de cantidad (clic en el número ->
  // input editable), mismo patrón de interacción que SizeCounter.
  const [editingMainQty, setEditingMainQty] = useState(false);
  const [mainQtyDraft, setMainQtyDraft] = useState("1");
  const mainQtyInputRef = useRef<HTMLInputElement>(null);

  // Galería: si este producto/color tiene ejes reales resueltos (mismos
  // archivos que ya usa el Personalizador) se arma con "con modelo" primero
  // (cuando existe) y luego Frente/Reverso/Izquierda/Derecha/Funda -- igual
  // mecanismo de miniaturas que ya usan productos como Sudadera Ocean, solo
  // que acá las imágenes vienen de esos archivos locales en vez de
  // product_variants.images. Si el producto/color no tiene ejes resueltos
  // todavía, cae exactamente al comportamiento de siempre (las fotos ya
  // subidas a Supabase para esa variante) -- nunca se inventa nada.
  //
  // Excepción explícita (PRODUCTS_PREFERRING_REAL_GALLERY abajo): un
  // producto puede tener "ejes" resueltos y AÚN ASÍ preferir su galería
  // real. Caso real que expuso esto -- Tapete de Yoga Minsk: sus "ejes"
  // son solo 1 foto suelta pensada como fondo del canvas del
  // Personalizador (nunca como fotografía de producto), mientras que
  // product_variants.images ya trae 3 fotos reales curadas (rollo, plano,
  // funda) -- dejar que 1 foto de fondo sustituyera esas 3 fue justo el
  // reporte del usuario ("quiero que se vean los productos como antes
  // estaba"). Nunca se decide automáticamente comparando cantidades --
  // mismo criterio explícito por nombre exacto que getApplicableViews en
  // printAreas.ts: se agrega aquí a mano cuando el usuario confirma que la
  // galería real es la que debe ganar.
  const preferRealGallery = PRODUCTS_PREFERRING_REAL_GALLERY.has(normalizeProductKey(product.name));
  const sizeGuideSrc = PRODUCT_SIZE_GUIDES[normalizeProductKey(product.name)] ?? DEFAULT_SIZE_GUIDE;
  const selectedColorKey = selectedVariant ? normalizeGarmentColorName(selectedVariant.color_name) : null;
  const ejesForColor =
    selectedColorKey && !preferRealGallery
      ? VIEW_ORDER.map((v) => resolvedGallery[v][selectedColorKey]).filter((url): url is string => !!url)
      : [];
  const modelShotUrl = selectedColorKey ? modelShots[selectedColorKey] : null;
  const images =
    ejesForColor.length > 0
      ? [modelShotUrl, ...ejesForColor].filter((url): url is string => !!url)
      : selectedVariant?.images ?? [];
  const sizes = product.sizes_available;

  function getSizeQty(variant: ProductVariant, size: string) {
    return sizeQuantities[variant.id]?.[size] ?? 0;
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
      if (next) {
        setSelectedColorIds([]); // al activar, arranca sin ninguna sección
        setColorPulse((p) => p + 1);
      }
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

  // Fuente de verdad ÚNICA para la cantidad total: la suma real de piezas
  // repartidas por talla, en las secciones de color visibles. Ya no existe
  // un "quantity" independiente — el selector superior es un espejo/atajo
  // de esta suma, nunca un segundo estado que se pueda desincronizar.
  const sizeSum = sections
    .filter((s) => !s.leaving)
    .reduce((sum, s) => sum + sizes.reduce((sSum, size) => sSum + getSizeQty(s.variant, size), 0), 0);
  // Con 0 piezas asignadas todavía, se muestra 1 como cantidad/precio de
  // referencia (nunca $0) — apenas el usuario asigna algo (por cualquier
  // vía: tallas o el selector superior), la cantidad real manda.
  const quantity = sizeSum > 0 ? sizeSum : 1;
  const unitPrice = getProductUnitPrice(product.costo, quantity, priceTiers);
  const totalPrice = unitPrice * quantity;
  // 1 pieza ya es una cantidad válida y completa por sí sola: la sección
  // de tallas se muestra siempre que el producto maneje MÁS DE UNA talla
  // real entre las que elegir -- un producto con una sola talla ("Único",
  // ej. Tapete de Yoga Minsk) no tiene nada que distribuir (repartir 1
  // pieza entre 1 sola talla es siempre la misma pieza), así que la
  // sección completa se oculta. El stepper de "2. Selecciona Cantidad"
  // arriba sigue funcionando exactamente igual sin esta sección --
  // incrementMainQuantity/decrementMainQuantity/setMainQuantity ya
  // escriben directamente en sizes[0] (la única talla), que es la misma
  // fuente de verdad (sizeQuantities) de siempre. Personalizar está
  // disponible desde el primer render.
  const showSizes = sizes.length > 1;
  const canPersonalize = true;
  // Talla que absorbe los +/- del selector superior de cantidad: la
  // primera talla de la primera sección visible. Al bajar, se descuenta
  // de la primera talla que tenga piezas asignadas (recorriendo secciones
  // y tallas en orden), para no dejar nunca un número negativo ni tocar
  // una talla vacía.
  const activeSections = sections.filter((s) => !s.leaving);
  function incrementMainQuantity() {
    const target = activeSections[0];
    if (!target || sizes.length === 0) return;
    setSizeQty(target.variant, sizes[0], getSizeQty(target.variant, sizes[0]) + 1);
  }
  // Captura escribir un número directamente en el selector superior (en
  // vez de solo +/-). Reparte la diferencia con el mismo criterio que ya
  // usan los botones: si sube, todo el aumento va a la primera talla de
  // la primera sección (igual que "+"); si baja, se descuenta recorriendo
  // secciones/tallas en orden, tomando de cada una lo que tenga hasta
  // completar la diferencia (igual que "−", solo que de un solo golpe en
  // vez de una unidad a la vez). Nunca un segundo estado de cantidad --
  // sigue escribiendo en sizeQuantities, la misma fuente de verdad única.
  function setMainQuantity(newQtyRaw: number) {
    const newQty = Number.isFinite(newQtyRaw) && newQtyRaw > 0 ? Math.floor(newQtyRaw) : 1;
    const target = activeSections[0];
    if (!target || sizes.length === 0) return;
    // Si hay más de una sección visible (Multicolor con varios colores),
    // las demás mantienen exactamente lo que ya tenían -- solo la primera
    // sección absorbe la diferencia, repartida parejo entre SUS tallas.
    const targetCurrentTotal = sizes.reduce((sum, size) => sum + getSizeQty(target.variant, size), 0);
    const otherSectionsTotal = sizeSum - targetCurrentTotal;
    const targetNewTotal = Math.max(0, newQty - otherSectionsTotal);

    // Reparto lo más parejo posible entre todas las tallas: base entera
    // para todas, y el residuo (si no divide exacto) se le suma a las
    // primeras tallas, una unidad de más cada una -- nunca todo apilado
    // en una sola talla.
    const base = Math.floor(targetNewTotal / sizes.length);
    const remainder = targetNewTotal % sizes.length;
    const perSize = Object.fromEntries(sizes.map((size, i) => [size, base + (i < remainder ? 1 : 0)]));

    setSizeQuantities((prev) => ({ ...prev, [target.variant.id]: perSize }));
  }
  function decrementMainQuantity() {
    for (const s of activeSections) {
      for (const size of sizes) {
        const qty = getSizeQty(s.variant, size);
        if (qty > 0) {
          setSizeQty(s.variant, size, qty - 1);
          return;
        }
      }
    }
  }

  useEffect(() => {
    if (!editingMainQty) setMainQtyDraft(String(quantity));
  }, [quantity, editingMainQty]);

  useEffect(() => {
    if (editingMainQty) {
      mainQtyInputRef.current?.focus();
      mainQtyInputRef.current?.select();
    }
  }, [editingMainQty]);

  function commitMainQtyDraft() {
    const parsed = parseInt(mainQtyDraft, 10);
    if (!Number.isNaN(parsed)) setMainQuantity(parsed);
    setEditingMainQty(false);
  }
  // El título de la sección de tallas es fijo — "Selecciona la talla" no
  // cambia con la cantidad. La leyenda debajo sí, en tiempo real: como la
  // cantidad total ahora ES la suma de tallas, solo hay dos estados
  // posibles — nada asignado todavía, o ya asignado (siempre exacto, por
  // definición no puede haber piezas "de más" ni "por asignar").
  const sizeSectionTitle = "Selecciona la talla";
  const sizeSectionHint =
    sizeSum === 0
      ? "Distribuye tu 1 pieza entre las tallas disponibles"
      : `${sizeSum} pieza${sizeSum === 1 ? "" : "s"} asignada${sizeSum === 1 ? "" : "s"} ✓`;

  // El promedio y la distribución consideran tanto las reseñas escritas
  // como las calificaciones "solo estrellas" (sin tarjeta de comentario).
  const allRatingValues = [...reviews.map((r) => r.rating), ...standaloneRatings];
  const totalRatingsCount = allRatingValues.length;
  const avgRating = totalRatingsCount ? allRatingValues.reduce((s, r) => s + r, 0) / totalRatingsCount : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => allRatingValues.filter((r) => r === star).length);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === "best") return b.rating - a.rating || b.date.getTime() - a.date.getTime();
    if (reviewSort === "worst") return a.rating - b.rating || b.date.getTime() - a.date.getTime();
    return b.date.getTime() - a.date.getTime();
  });

  function handleSendQuickRating() {
    if (quickRating === 0) return;
    setStandaloneRatings((prev) => [...prev, quickRating]);
    setQuickRating(0);
  }

  function handlePublishReview(data: { rating: number; comment: string }) {
    setReviews((prev) => [
      { id: `${Date.now()}`, name: "Tú", rating: data.rating, comment: data.comment, date: new Date() },
      ...prev,
    ]);
  }

  // Link a "Personalizar producto": el color (o colores, en modo
  // Multicolor) ya se eligió arriba ("1. Selecciona Color"/"Multicolor")
  // -- se pasan como query params para que el Personalizador los reciba y
  // nunca vuelva a preguntar. `colors` solo se manda con Multicolor
  // encendido Y más de un color elegido (PersonalizerClient trata "un solo
  // color" igual con o sin `colors`, así que no hace falta mandarlo en ese
  // caso). Si el color "activo" (`selectedVariant`, el último tocado) fue
  // desmarcado de `selectedColorIds` sin cambiar de `multicolor`, se usa el
  // primero de la lista en su lugar, para que el color inicial del
  // Personalizador siempre esté entre los que la barra va a mostrar.
  const multicolorIds = multicolor && selectedColorIds.length > 1 ? selectedColorIds : null;
  const personalizarVariantId =
    multicolorIds && selectedVariant && !multicolorIds.includes(selectedVariant.id)
      ? multicolorIds[0]
      : selectedVariant?.id;
  const personalizarParams = new URLSearchParams();
  if (personalizarVariantId) personalizarParams.set("variant", personalizarVariantId);
  if (multicolorIds) personalizarParams.set("colors", multicolorIds.join(","));
  // La cantidad ya elegida en "2. Selecciona Cantidad" pasa también, para
  // que el Personalizador arranque con ella en vez de resetear a 1 --
  // confirmado explícitamente con el usuario.
  personalizarParams.set("qty", String(quantity));
  const personalizarQuery = personalizarParams.toString();
  const personalizarHref = `/producto/${product.id}/personalizar${personalizarQuery ? `?${personalizarQuery}` : ""}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-ui-gray mb-6">
        <a href="/catalogo" className="hover:text-primary transition-colors">Catálogo</a>
        <span className="mx-2">›</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ── Galería ── */}
        <div className="space-y-4">
          <div className="aspect-square rounded-[28px] overflow-hidden bg-white border border-[#F1F1F1] shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative">
            {/* Halos de profundidad — iluminación ambiental muy sutil detrás del producto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 45%, rgba(87,224,217,0.055), transparent 70%)" }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.5), transparent 55%)" }}
            />
            {images[selectedImage] ? (
              <div className={`absolute ${images[selectedImage] === modelShotUrl ? "inset-[2%]" : "inset-[9%]"}`}>
                {/* <img> plano a propósito, no next/image -- el optimizador de
                    Next falla ("isn't a valid image") con los ejes reales que
                    traen acento en el nombre de archivo (ej. "ATRÁS N.png"),
                    aunque el archivo es válido y el servidor estático lo
                    sirve bien; un <img> normal no pasa por ese optimizador y
                    evita el bug por completo, tanto para estos archivos
                    locales como para las fotos ya alojadas en Supabase. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[selectedImage]}
                  alt={`${product.name} — ${selectedVariant?.color_name}`}
                  className="absolute inset-0 h-full w-full object-contain"
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
                  className={`relative w-[78px] h-[78px] flex-shrink-0 rounded-full overflow-hidden border-2 bg-white shadow-md transition-colors ${
                    i === selectedImage ? "border-primary" : "border-white hover:border-gray-300"
                  }`}
                >
                  {/* object-contain (no cover): el producto completo debe
                      verse dentro del círculo, sin recortarlo -- antes se
                      veía solo un acercamiento de una parte de la prenda. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="space-y-[29px]">
          <div>
            {product.category?.slug ? (
              <Link
                href={`/catalogo?categoria=${product.category.slug}`}
                className="inline-block text-sm text-ui-gray mb-2 cursor-pointer transition-colors duration-200 hover:text-primary active:text-primary"
              >
                {product.category.name}
              </Link>
            ) : (
              <p className="text-sm text-ui-gray mb-2">{product.category?.name}</p>
            )}
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground uppercase tracking-tight">{product.name}</h1>
            <p className="text-xs text-ui-gray mt-2">{product.sku}</p>
          </div>

          {product.description && (
            <p className="text-sm text-ui-gray leading-[1.9]">{product.description}</p>
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
              <InfoLink icon={<RulerIcon />} label="Guía de Tallas" onClick={() => setSizeGuideOpen(true)} />
              <InfoLink
                icon={<TagIcon />}
                label="Rango de precios"
                onClick={() => setQuantityDiscountOpen(true)}
                accent
                active={quantityDiscountOpen}
              />
            </div>
          </div>

          {/* Color selector */}
          {activeVariants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  1. Selecciona Color: <span className="font-normal text-ui-gray">{selectedVariant?.color_name}</span>
                </p>
                {/* Un producto de un solo color no tiene nada que combinar --
                    el switch "Multicolor" (elegir varios colores a la vez
                    para personalizar cada uno por separado) no tiene sentido
                    sin al menos una segunda opción. */}
                {activeVariants.length > 1 && (
                  <MulticolorSwitch checked={multicolor} pulse={colorPulse} onToggle={toggleMulticolor} />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v, i) => {
                  const isHighlighted = multicolor ? selectedColorIds.includes(v.id) : selectedVariant?.id === v.id;
                  return (
                    <button
                      key={`${v.id}-${colorPulse}`}
                      onClick={() => selectVariant(v)}
                      title={v.color_name}
                      style={{
                        backgroundColor: v.color_hex,
                        animationDelay: colorPulse > 0 ? `${i * 40}ms` : undefined,
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-[250ms] ease-in-out ${
                        colorPulse > 0 ? "animate-swatch-wow" : ""
                      } ${
                        isHighlighted
                          ? "border-primary scale-110 ring-2 ring-primary/30 shadow-[0_0_0_4px_rgba(87,224,217,0.12)]"
                          : "border-white ring-1 ring-ui-border hover:scale-105"
                      }`}
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
                  onClick={decrementMainQuantity}
                  aria-label="Restar"
                  className="w-7 h-7 flex items-center justify-center text-lg text-primary hover:scale-105 active:scale-90 transition-transform duration-150"
                >
                  −
                </button>
                {editingMainQty ? (
                  <input
                    ref={mainQtyInputRef}
                    type="text"
                    inputMode="numeric"
                    value={mainQtyDraft}
                    onChange={(e) => setMainQtyDraft(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitMainQtyDraft}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="text-sm font-medium text-foreground w-8 text-center bg-transparent outline-none"
                  />
                ) : (
                  <span
                    key={quantity}
                    onClick={() => {
                      setMainQtyDraft(String(quantity));
                      setEditingMainQty(true);
                    }}
                    className="text-sm font-medium text-foreground w-8 text-center animate-badge-in cursor-text"
                  >
                    {quantity}
                  </span>
                )}
                <button
                  type="button"
                  onClick={incrementMainQuantity}
                  aria-label="Sumar"
                  className="w-7 h-7 flex items-center justify-center text-lg text-primary hover:scale-105 active:scale-90 transition-transform duration-150"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-foreground tracking-tight">
                {formatMXN(totalPrice)} <span className="text-sm font-normal text-ui-gray">MXN</span>
              </p>
              <p className="text-xs text-ui-gray mt-2">IVA incluido c/u</p>
              <p className="text-xs text-ui-gray">{formatMXN(unitPrice)}</p>
            </div>
          </div>

          {/* Tallas por color — visibles siempre que el producto maneje
              tallas. 1 pieza ya es una cantidad válida y completa: no hay
              ningún paso de confirmación ni un quantity > 1 de por medio. */}
          {showSizes && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{sizeSectionTitle}</p>
              {sizeSectionHint && (
                <p className="text-xs text-ui-gray">{sizeSectionHint}</p>
              )}
              <div className="space-y-3">
                {sections.map((s) => (
                  <AnimatedSizeSection
                    key={s.id}
                    leaving={s.leaving}
                    onExited={() => handleSectionExited(s.id)}
                  >
                    <p className="text-sm font-semibold text-foreground mb-1.5">Tallas - {s.variant.color_name}</p>
                    <div className="flex items-center gap-3 flex-nowrap">
                      {sizes.map((size) => (
                        <div
                          key={size}
                          className="flex flex-col items-center justify-center w-[58px] h-[58px] shrink-0 rounded-[16px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:shadow-[0_14px_34px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.05)] hover:-translate-y-[3px]"
                        >
                          <span className="font-display font-bold text-[15px] text-primary text-center">{size}</span>
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
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-3">
            <Link
              href={personalizarHref}
              aria-disabled={!canPersonalize}
              tabIndex={canPersonalize ? undefined : -1}
              onClick={(e) => {
                if (!canPersonalize) e.preventDefault();
              }}
              className={`flex-1 flex items-center justify-center py-3.5 rounded-full bg-[#282B34] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(40,43,52,0.15)] transition-all duration-300 ease-in-out ${
                canPersonalize
                  ? "hover:shadow-[0_8px_24px_rgba(40,43,52,0.22)] hover:opacity-90 hover:-translate-y-[1px]"
                  : "opacity-40 cursor-not-allowed pointer-events-none"
              }`}
            >
              Personalizar producto
            </Link>
            <a
              href={`https://wa.me/5215500000000?text=${encodeURIComponent(`Hola, me interesa cotizar: ${product.name} (SKU: ${product.sku})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center py-3.5 rounded-full bg-[#282B34] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(40,43,52,0.15)] hover:shadow-[0_8px_24px_rgba(40,43,52,0.22)] hover:opacity-90 hover:-translate-y-[1px] transition-all duration-300 ease-in-out"
            >
              Agregar al carrito
            </a>
          </div>
        </div>
      </div>

      {/* ── Reseñas ── */}
      <div className="mt-14 bg-white rounded-2xl border border-ui-border p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-lg text-foreground">Calificaciones y Reseñas</h2>
          <button
            type="button"
            onClick={() => {
              setModalInitialRating(0);
              setReviewModalOpen(true);
            }}
            className="text-sm font-semibold text-ui-gray hover:text-primary-dark transition-colors duration-200"
          >
            Escribir una reseña
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
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
              Basado en {totalRatingsCount} {totalRatingsCount === 1 ? "calificación" : "calificaciones"}
            </p>
            <div className="space-y-1.5 mb-6">
              {[5, 4, 3, 2, 1].map((star, i) => (
                <div key={star} className="flex items-center gap-2 text-xs text-ui-gray">
                  <span className="w-2">{star}</span>
                  <StarIcon className="w-3 h-3 text-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300 ease-out"
                      style={{ width: `${totalRatingsCount ? (ratingCounts[i] / totalRatingsCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-4 text-right">{ratingCounts[i]}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Califica este producto</p>
              <StarRatingInput value={quickRating} onSelect={setQuickRating} />
              {quickRating > 0 && (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleSendQuickRating}
                    className="py-2 px-5 rounded-full bg-[#282B34] text-white font-semibold text-xs shadow-[0_4px_16px_rgba(40,43,52,0.15)] hover:shadow-[0_8px_24px_rgba(40,43,52,0.22)] hover:opacity-90 transition-all duration-300 ease-in-out"
                  >
                    Enviar calificación
                  </button>
                  <p className="text-xs text-ui-gray">
                    ¿Quieres compartir más detalles?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setModalInitialRating(quickRating);
                        setQuickRating(0);
                        setReviewModalOpen(true);
                      }}
                      className="font-semibold text-primary-dark hover:text-primary transition-colors duration-200 underline underline-offset-2"
                    >
                      Escribe una reseña.
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-end mb-3">
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value as "recent" | "best" | "worst")}
                className="text-xs text-ui-gray border border-ui-border rounded-full px-3 py-1.5 bg-white focus:outline-none focus:border-primary transition-colors duration-200"
              >
                <option value="recent">Más recientes</option>
                <option value="best">Mejor calificadas</option>
                <option value="worst">Menor calificación</option>
              </select>
            </div>
            <div className="divide-y divide-ui-border">
              {sortedReviews.map((r) => (
                <div
                  key={r.id}
                  className="py-4 first:pt-0 flex gap-3 px-2 -mx-2 rounded-xl transition-all duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-ui-gray">
                    {getInitials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.name}</p>
                      <p className="text-xs text-ui-gray shrink-0">{formatReviewDate(r.date)}</p>
                    </div>
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
      </div>

      <InfoModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        imgSrc={sizeGuideSrc}
        alt="Guía de tallas"
      />
      <PriceRangeModal
        open={quantityDiscountOpen}
        onClose={() => setQuantityDiscountOpen(false)}
        costo={product.costo}
        tiers={priceTiers}
      />
      <ReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        initialRating={modalInitialRating}
        onSubmit={handlePublishReview}
      />
    </div>
  );
}
