"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product, PriceTier } from "@/types";
import { getProductUnitPrice, formatMXN } from "@/lib/pricing";

interface Props {
  product: Product & { variants: NonNullable<Product["variants"]> };
  priceTiers: PriceTier[];
  index?: number;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// Icono de corazón (botón de favorito de la tarjeta), extraído de "Group 1014.svg"
// dentro de /public/Home/FAVORITOS DEL MOMENTO/ — mismo trazo y color (#767788).
function HeartOutlineIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 25 22" className={`h-[16px] w-[18px] ${className}`} fill="none">
      <path
        d="M19.5357 1.515C16.9293 0.447798 14.1603 1.0843 12.0941 3.2141C9.8543 0.905698 6.7915 0.355498 4.0552 1.7848C0.1317 3.9548 -0.1208 8.3835 1.6576 11.6349C2.4054 13.0453 3.5296 14.3244 5.0944 15.5442L12.0941 21L19.6498 15.0793C20.7484 14.2191 21.6674 13.1234 22.5415 11.6314L22.5451 11.6243C23.2286 10.3204 23.5636 9.1088 23.5976 7.8108C23.6704 5.0646 22.0777 2.5929 19.5357 1.515Z"
        fill={filled ? "#30BE52" : "none"}
        stroke="#767788"
        strokeWidth={filled ? 0 : 1.4}
      />
    </svg>
  );
}

// Icono de bolsa de compras, extraído de "Group 1014.svg" (trazo blanco sobre círculo coral).
function ShoppingBagIcon() {
  return (
    <svg viewBox="56 412 12 13" className="h-[13px] w-[12px]" fill="none">
      <path
        d="M66.9608 415.599C66.8581 415.492 66.7215 415.434 66.5769 415.435L63.9318 415.452C63.8508 414.747 63.6941 414.209 63.4533 413.808C63.2943 413.543 63.0965 413.338 62.8653 413.199C62.6085 413.045 62.305 412.968 61.9639 412.972C61.6195 412.974 61.3148 413.052 61.058 413.203C60.8246 413.341 60.6257 413.543 60.4668 413.802C60.2235 414.2 60.0669 414.74 59.9888 415.452L57.3351 415.445C57.3346 415.445 57.3342 415.445 57.3336 415.445C57.1928 415.445 57.0603 415.502 56.9605 415.606C56.8604 415.711 56.8052 415.851 56.8052 415.999L56.8053 422.2C56.8053 422.464 56.8541 422.718 56.9503 422.954C57.0413 423.177 57.172 423.378 57.3389 423.553C57.6995 423.93 58.2001 424.146 58.7122 424.146L65.3502 424.125C65.7827 424.124 66.2237 423.933 66.56 423.602C66.9004 423.266 67.0966 422.821 67.0982 422.381L67.1202 416.329V416.001C67.1202 415.849 67.0635 415.706 66.9608 415.599ZM60.8806 415.453C60.9189 415.127 60.985 414.738 61.1353 414.431C61.2208 414.256 61.3272 414.123 61.4516 414.035C61.5832 413.942 61.7421 413.895 61.9239 413.895C61.9363 413.895 61.9489 413.895 61.9614 413.896L61.9659 413.896L61.9704 413.896C62.1602 413.885 62.3258 413.929 62.4626 414.026C62.5844 414.113 62.6896 414.246 62.7755 414.421C62.9252 414.727 62.9958 415.107 63.0417 415.453L60.8806 415.453ZM59.9173 417.115C59.9742 417.348 60.1543 417.502 60.3648 417.497C60.4664 417.494 60.5697 417.451 60.6483 417.379C60.7362 417.299 60.7865 417.19 60.7899 417.071L60.81 416.379L63.1134 416.38L63.1299 417.087C63.1354 417.326 63.3049 417.523 63.524 417.546C63.6441 417.558 63.7594 417.521 63.8487 417.441C63.9364 417.362 63.9936 417.247 64.0095 417.117L64.0104 417.109L63.9988 416.38L66.237 416.378L66.2203 422.366C66.2197 422.579 66.1114 422.789 65.9155 422.959C65.7293 423.12 65.4905 423.216 65.2767 423.216L58.6528 423.217C58.4389 423.217 58.1993 423.122 58.012 422.963C57.8144 422.795 57.7051 422.586 57.7044 422.373L57.6835 416.38L59.9246 416.379L59.9138 417.1L59.9173 417.115Z"
        fill="white"
      />
    </svg>
  );
}

// Insignia "mejor precio" (escudo con check), en el mismo verde (#30BE52) del texto de la etiqueta.
function BadgeIcon() {
  return (
    <svg viewBox="0 0 12 13" className="h-[13px] w-[12px]" fill="none">
      <path
        d="M6 0.5L11 2.3V5.9C11 8.9 8.9 11.4 6 12.5C3.1 11.4 1 8.9 1 5.9V2.3L6 0.5Z"
        fill="#30BE52"
      />
      <path
        d="M3.8 6.3L5.2 7.7L8.2 4.5"
        stroke="white"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Cursor de mano dentro del botón "Ver detalles", en círculo blanco translúcido.
function HandCursorIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/60 transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${className}`}>
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
        <path
          d="M6.5 8.5V3.2a1 1 0 0 1 2 0V7m0 0V2.4a1 1 0 0 1 2 0V7m0 .3V3.6a1 1 0 0 1 2 0V9m-6-.6L5.7 7.6a1 1 0 0 0-1.6 1.2l2.4 3.5a2.5 2.5 0 0 0 2.1 1.1h1.2a3 3 0 0 0 3-3V7.6"
          stroke="#076868"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function FavoritoProductCard({ product, priceTiers, index = 0 }: Props) {
  const [liked, setLiked] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const activeVariants = product.variants.filter((v) => v.active);
  const [selectedVariantId, setSelectedVariantId] = useState(activeVariants[0]?.id ?? null);
  const firstImage = activeVariants.flatMap((v) => v.images)[0] ?? null;
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? activeVariants[0];
  const [displayedImage, setDisplayedImage] = useState(selectedVariant?.images?.[0] ?? firstImage);
  const [imageVisible, setImageVisible] = useState(true);
  const precioDesde = getProductUnitPrice(product.costo, 1, priceTiers);
  const visibleVariants = activeVariants.slice(0, 3);
  const extraVariants = activeVariants.length - visibleVariants.length;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  function handleSelectVariant(v: NonNullable<Product["variants"]>[number]) {
    if (v.id === selectedVariantId) return;
    setSelectedVariantId(v.id);
    const nextImage = v.images?.[0];
    if (!nextImage) return; // sin foto propia: se conserva la imagen actual, solo cambia la selección
    setImageVisible(false);
    setTimeout(() => {
      setDisplayedImage(nextImage);
      setImageVisible(true);
    }, 100);
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_4px_25px_rgba(0,0,0,0.12)] [transition-property:opacity,transform,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[10px] hover:scale-[1.02] hover:shadow-[0_20px_45px_rgba(0,0,0,0.18)] ${
        mounted ? "opacity-100 translate-y-0 duration-300" : "opacity-0 translate-y-5 duration-500"
      }`}
    >
      {/* Imagen */}
      <Link
        href={`/producto/${product.id}`}
        className="group/card relative block aspect-[303/277] bg-white"
      >
        {displayedImage ? (
          <Image
            src={displayedImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`scale-[0.91] object-contain p-2 transition-[opacity_100ms_ease-out,transform_300ms_cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[0.955] ${
              imageVisible ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-light to-gray-100">
            <span className="select-none font-display text-3xl font-bold text-primary opacity-40">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Botón de favorito */}
        <button
          key={popKey}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
            setPopKey((k) => k + 1);
          }}
          aria-label={liked ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={liked}
          className={`absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F6] shadow-[0_4px_4px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:scale-105 ${
            popKey > 0 ? "animate-circle-pop" : ""
          }`}
        >
          <HeartOutlineIcon filled={liked} className={popKey > 0 ? "animate-heart-pop" : ""} />
        </button>
      </Link>

      {/* Divisor sutil */}
      <div className="h-px bg-gradient-to-r from-white via-[#DDF8FA] to-white" />

      {/* Info */}
      <div className="flex flex-col gap-2.5 px-3 pb-3 pt-2.5">
        <h3 className="text-center font-display text-lg font-bold text-foreground line-clamp-1">
          {toTitleCase(product.name)}
        </h3>

        <div className="flex items-stretch">
          {/* Colores */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="whitespace-nowrap text-[11px] font-medium text-foreground/80">
              Colores disponibles
            </span>
            {visibleVariants.length > 0 ? (
              <div className="flex items-center gap-3">
                {visibleVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    title={v.color_name}
                    onClick={() => handleSelectVariant(v)}
                    className={`h-4 w-4 shrink-0 rounded-full border border-ui-border ring-1 ring-offset-1 transition-[box-shadow] duration-[250ms] ease-out ${
                      selectedVariantId === v.id ? "ring-[#37D949]" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: v.color_hex }}
                  />
                ))}
                {extraVariants > 0 && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ui-border text-[9px] text-ui-gray">
                    +
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-ui-gray">—</span>
            )}
          </div>

          {/* Divisor vertical */}
          <div className="mx-3 w-px self-stretch bg-ui-border" />

          {/* Precio + etiqueta */}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#EDF7F0] px-1.5 py-0.5 text-[8px] font-semibold leading-tight text-[#30BE52] animate-badge-in"
              style={{ animationDelay: `${index * 80 + 250}ms` }}
            >
              <span className="shrink-0 [&_svg]:h-[8px] [&_svg]:w-[8px]">
                <BadgeIcon />
              </span>
              <span>Mejor precio por mayoreo</span>
            </span>
            <p className="leading-none">
              <span className="font-display text-xl font-bold text-foreground">
                {formatMXN(precioDesde)}
              </span>{" "}
              <span className="align-super text-[10px] font-semibold text-ui-gray">MXN</span>
            </p>
          </div>
        </div>

        {/* Banner inferior */}
        <div className="flex items-center justify-between gap-2 rounded-[7px] bg-[#D1F4F2]/50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#FC7C68]">
              <span className="[&_svg]:h-[10px] [&_svg]:w-[9px]">
                <ShoppingBagIcon />
              </span>
            </span>
            <p className="min-w-0 text-[10px] leading-tight text-foreground">
              Descubre más detalles, tallas y recomendaciones.
            </p>
          </div>
          <Link
            href={`/producto/${product.id}`}
            className="group/btn relative overflow-hidden flex shrink-0 items-center justify-center gap-1 rounded-[7px] bg-[#7FDED9] px-3 py-1.5 text-[11px] font-semibold text-[#076868] [transition:transform_320ms_cubic-bezier(0.22,1,0.36,1),box-shadow_320ms_cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2.5px] hover:shadow-[0_6px_14px_rgba(7,104,104,0.28)]"
          >
            {/* Capa coral: se desliza de izquierda a derecha cubriendo el turquesa (y a la inversa al salir) */}
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left scale-x-0 bg-accent-coral transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:scale-x-100"
            />
            {/* Brillo: recorre el botón una sola vez al iniciar el hover */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/3 -translate-x-[220%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover/btn:animate-[buttonShine_700ms_ease-out]"
            />
            {/* Contenido: encima de ambas capas; escala levemente al presionar (independiente de la elevación) */}
            <span className="relative z-10 flex items-center justify-center gap-1 transition-transform duration-150 ease-out group-active/btn:scale-[0.98]">
              <span className="transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-1">
                Ver detalles
              </span>
              <HandCursorIcon className="group-hover/btn:translate-x-1 group-hover/btn:scale-[1.09]" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
