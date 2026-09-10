"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product, PriceTier, ProductVariant } from "@/types";
import { getProductUnitPrice } from "@/lib/pricing";

type ProductWithVariants = Product & { variants: NonNullable<Product["variants"]> };

export type SortOption = "relevancia" | "price-asc" | "price-desc";

export interface AppliedFilters {
  keyword: string;
  material: string;
  minPrice: number;
  maxPrice: number;
  colors: string[];
  sort: SortOption;
}

export const DEFAULT_FILTERS: AppliedFilters = {
  keyword: "",
  material: "",
  minPrice: 0,
  maxPrice: 1000,
  colors: [],
  sort: "relevancia",
};

export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: "Más relevantes",
  "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor",
};

// Ordena por precio unitario real (1 pza) — misma fuente que el precio que
// muestra cada tarjeta. "relevancia" deja el orden como venga del servidor
// (created_at desc, ver catalogo/page.tsx). Ordena una copia, nunca el
// arreglo original.
export function sortProducts(
  products: ProductWithVariants[],
  priceTiers: PriceTier[],
  sort: SortOption
): ProductWithVariants[] {
  if (sort === "relevancia") return products;
  const withPrice = products.map((p) => ({ p, price: getProductUnitPrice(p.costo, 1, priceTiers) }));
  withPrice.sort((a, b) => (sort === "price-asc" ? a.price - b.price : b.price - a.price));
  return withPrice.map((x) => x.p);
}

// Colores de ejemplo tomados del diseño de referencia (carpeta Filtros).
const EXAMPLE_COLORS = [
  { name: "Turquesa", hex: "#00ADB0" },
  { name: "Negro", hex: "#111111" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Plata", hex: "#BFBFBF" },
  { name: "Dorado", hex: "#F5B232" },
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorDistance(a: string, b: string) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  return Math.sqrt((pa.r - pb.r) ** 2 + (pa.g - pb.g) ** 2 + (pa.b - pb.b) ** 2);
}

// The one place "does this product have color X" is decided — used both to
// filter the catalog AND (via resolvePreferredVariant below) to pick which
// real variant/image a product card should display for that color, so a
// card can never show a color that disagrees with why it passed the filter.
function findMatchingVariant(variants: ProductVariant[], colorName: string): ProductVariant | null {
  const active = variants.filter((v) => v.active);
  const byName = active.find((v) => v.color_name.toLowerCase().includes(colorName.toLowerCase()));
  if (byName) return byName;
  const example = EXAMPLE_COLORS.find((c) => c.name === colorName);
  if (example) {
    const byDistance = active.find((v) => colorDistance(v.color_hex, example.hex) < 60);
    if (byDistance) return byDistance;
  }
  return active.find((v) => v.color_name.toLowerCase() === colorName.toLowerCase()) ?? null;
}

// Which real variant a product card should display when one or more color
// filters are active — the first *selected* color (in the order the user
// picked them) this product actually has, per explicit spec ("la tarjeta
// debe mostrar preferentemente el primer color seleccionado disponible").
export function resolvePreferredVariant(variants: ProductVariant[], colorFilters: string[]): ProductVariant | null {
  for (const colorName of colorFilters) {
    const match = findMatchingVariant(variants, colorName);
    if (match) return match;
  }
  return null;
}

// Extrae nombres de material desde el texto de composición ("50% Algodón Peinado 50% Poliéster").
function extractMaterials(composition: string | null): string[] {
  if (!composition) return [];
  return composition
    .split(/\d+%\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Normaliza para que la búsqueda ignore mayúsculas/acentos ("térmico" debe
// encontrar "termico" y viceversa) — mismo patrón NFD ya usado en otras
// partes del proyecto (ver resolveProductAssets.ts).
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Todo el texto real del producto que puede relacionarse con una palabra
// clave: nombre, descripción, categoría, composición, tallas y colores
// disponibles — nada inventado, solo datos que ya existen en el catálogo.
function productSearchableText(p: ProductWithVariants): string {
  return [
    p.name,
    p.description,
    p.category?.name,
    p.composition,
    ...(p.sizes_available ?? []),
    ...(p.variants ?? []).map((v) => v.color_name),
  ]
    .filter(Boolean)
    .join(" ");
}

// Coincidencia parcial (substring), no exacta — "player" encuentra "Playera".
export function matchesKeyword(p: ProductWithVariants, keyword: string): boolean {
  const k = normalizeText(keyword);
  if (!k) return true;
  return normalizeText(productSearchableText(p)).includes(k);
}

export function applyFilters(
  products: ProductWithVariants[],
  priceTiers: PriceTier[],
  filters: AppliedFilters
): ProductWithVariants[] {
  return products.filter((p) => {
    if (!matchesKeyword(p, filters.keyword)) return false;

    if (filters.material) {
      const materials = extractMaterials(p.composition).map((m) => m.toLowerCase());
      if (!materials.some((m) => m.includes(filters.material.toLowerCase()))) return false;
    }

    const price = getProductUnitPrice(p.costo, 1, priceTiers);
    if (price < filters.minPrice || price > filters.maxPrice) return false;

    if (filters.colors.length > 0 && !resolvePreferredVariant(p.variants ?? [], filters.colors)) {
      return false;
    }

    return true;
  });
}

// Number of distinct filter *types* currently applied (not individual color
// selections) — shown as a small badge on the "Filtros" trigger button so
// the user can tell at a glance that something is filtering the catalog.
export function countActiveFilters(filters: AppliedFilters): number {
  let count = 0;
  if (filters.keyword.trim()) count += 1;
  if (filters.material) count += 1;
  if (filters.minPrice > DEFAULT_FILTERS.minPrice || filters.maxPrice < DEFAULT_FILTERS.maxPrice) count += 1;
  if (filters.colors.length > 0) count += 1;
  return count;
}

// ── Iconos extraídos de la carpeta de diseño "Filtros" (no rediseñados) ──

function LayersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" className={className} fill="none">
      <path
        d="M16.1594 28.0001H15.8459L15.6121 27.8992L3.45288 21.3313C3.14964 21.1674 3.00372 20.8886 3.00101 20.5883C2.9983 20.288 3.16049 20.0037 3.44908 19.848L6.83076 18.0213C7.25713 17.7911 7.75457 17.9654 7.95907 18.3785C8.15002 18.7643 8.01169 19.2475 7.6081 19.47L5.55707 20.5943L16.0032 26.2396L26.452 20.5921L24.3283 19.4311C23.9296 19.1785 23.8308 18.6662 24.0663 18.2897C24.3012 17.9144 24.7704 17.801 25.1756 18.0202L28.5557 19.848C28.8491 20.0069 29.0032 20.2853 29.001 20.5894C28.9988 20.8935 28.8594 21.1658 28.5529 21.3313L16.3937 27.8992L16.16 28.0001H16.1594Z"
        fill="#68D5CF"
      />
      <path
        d="M16.4507 14.693C16.1333 14.8645 15.8664 14.8617 15.5762 14.705L3.45447 8.15681C3.15287 7.99352 3.00044 7.71518 3.00098 7.41272C3.00152 7.11027 3.15015 6.83357 3.4523 6.67029L15.6137 0.100681C15.8616 -0.0335603 16.1431 -0.0335603 16.391 0.100681L28.5518 6.66974C28.8572 6.83466 28.9994 7.11082 28.9994 7.41163C28.9994 7.71244 28.8551 7.99133 28.5491 8.15681L16.4507 14.693ZM16.0037 13.0646L26.4563 7.41272L16.0021 1.76144L5.54619 7.41327L16.0037 13.0646Z"
        fill="#68D5CF"
      />
      <path
        d="M25.0661 11.3768L28.5704 13.2716C28.8487 13.4222 28.9946 13.6989 29 13.974C29.006 14.2874 28.8725 14.5718 28.5644 14.7389L16.4182 21.3008C16.1459 21.4477 15.859 21.4477 15.5872 21.3008L3.44047 14.7389C3.15188 14.5833 3.01084 14.3099 3.00054 14.0288C2.98969 13.7263 3.1432 13.4294 3.43396 13.2721L6.95723 11.3664C7.36841 11.144 7.83709 11.2432 8.08282 11.6393C8.31174 12.0081 8.21302 12.5247 7.80888 12.7762L5.55931 14.0096L16.0027 19.6538L26.4456 14.0096L24.266 12.8146C23.8591 12.5916 23.7143 12.1028 23.9199 11.704C24.1293 11.2969 24.6159 11.1325 25.0666 11.3763L25.0661 11.3768Z"
        fill="#68D5CF"
      />
    </svg>
  );
}

function TagFilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 31" className={className} fill="none">
      <path
        d="M20.9642 25.7456L16.4175 9.47934C16.1941 8.68258 15.833 8.22819 15.128 7.85399L10.2108 5.25369C9.83755 5.05641 9.35732 5.13914 8.89315 5.22059C8.73531 5.2486 8.58282 5.27405 8.44236 5.28805L8.06246 2.97158C7.9287 2.15191 7.45918 0.979669 6.57899 0.375095C6.1175 0.0581713 5.60651 -0.0589251 5.06208 0.0276244C4.5618 0.106537 3.905 0.503647 3.61473 1.10695C2.72117 2.96903 3.51307 5.17859 4.1217 6.41574L3.3686 6.92231L0.440451 11.6329C0.23445 11.9651 -0.0946153 12.5875 0.0257745 13.0151L4.59657 29.2852C4.85073 30.1914 5.54097 30.9983 6.43185 30.9983C6.55625 30.9983 6.68467 30.9831 6.81576 30.9487L19.6721 27.6891C20.4038 27.5033 21.1769 26.508 20.9629 25.7443L20.9642 25.7456ZM6.86258 5.69916L5.68276 6.01609C5.02864 5.22441 4.49357 2.92576 4.89487 1.94062C5.00724 1.6657 5.17578 1.52315 5.40987 1.50406C5.42058 1.50406 5.43128 1.50406 5.44064 1.50406C5.56103 1.50406 5.67607 1.55751 5.79378 1.66825C6.52014 2.34791 6.88131 4.73948 6.86124 5.70044L6.86258 5.69916ZM8.49185 9.18278C8.72327 9.41061 8.83028 9.86881 8.7527 10.0712C8.54402 10.6096 8.06781 10.859 7.53944 10.7089C7.29598 10.6401 6.88532 10.2583 6.83716 9.91845C6.8171 9.77972 6.86793 9.67917 6.99635 9.6028C7.25318 9.45007 7.85111 9.18914 8.18018 9.08605C8.24974 9.06441 8.35809 9.05041 8.49319 9.18405L8.49185 9.18278ZM6.84519 7.24305C6.87863 7.33342 6.89468 7.45561 6.87194 7.55234C6.8599 7.60198 6.84118 7.62743 6.83315 7.63125C5.6453 8.19255 5.04871 9.3457 5.38312 10.4365C5.75901 11.6622 6.9094 12.3584 8.24305 12.1687C9.40548 12.0033 10.275 11.0538 10.3084 9.91209C10.3418 8.78185 9.61951 7.85145 8.46109 7.52561C8.41159 7.42761 8.36879 7.23542 8.3942 7.05977C8.40892 6.95922 8.44102 6.90576 8.46644 6.88795C8.74735 6.69194 9.46701 6.54429 9.71716 6.67666L13.9709 8.93586C14.0137 8.95877 14.0606 8.98295 14.1127 9.00841C14.3522 9.12932 14.712 9.31006 14.8123 9.51116L19.3577 25.6616C19.4045 25.8296 19.4701 26.233 19.0527 26.3399L6.91073 29.4455C6.65792 29.5105 6.47599 29.5105 6.35694 29.4455C6.27267 29.3997 6.21381 29.3157 6.17903 29.1884L1.55473 12.7491L4.61396 7.82472L6.84653 7.24305H6.84519Z"
        fill="#3FD0CD"
      />
    </svg>
  );
}

function PaletteIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 25 28" className={className} fill="none">
      <path
        d="M13.7044 -0.00066974C13.8967 -0.00066974 14.1167 0.0324671 14.3328 0.0468877C16.4836 0.192322 18.6218 0.706863 20.505 1.797C22.2361 2.79908 23.7742 4.35007 24.5381 6.22875C24.7755 6.81201 24.9484 7.40111 24.9849 8.03746C25.0354 8.91897 24.9572 9.77377 24.7718 10.6329C24.4654 12.0525 23.7767 13.3206 22.7666 14.3494C22.3125 14.8118 21.8356 15.2036 21.3167 15.5881L19.9658 16.5889C19.7119 16.7767 19.4995 16.9982 19.3108 17.2455C19.0378 17.6033 18.9389 18.0227 19.0394 18.4657C19.3477 19.8247 20.1444 20.4902 19.984 22.2743C19.9326 22.8462 19.8386 23.3795 19.6538 23.921C19.176 25.3208 18.2073 26.4631 16.9111 27.1672C15.9844 27.6704 14.9603 27.9555 13.8973 27.9926C11.5454 28.0742 9.23335 27.4547 7.2083 26.2474C3.16702 23.8385 0.51625 19.3224 0.0697892 14.6354C-0.090596 12.9531 0.0299211 11.2609 0.385386 9.61913C0.627637 8.50015 1.00349 7.4453 1.52299 6.43432C2.91138 3.7309 5.22007 1.81971 8.05527 0.81241C9.25161 0.387461 10.476 0.148753 11.7359 0.0435127C11.9383 0.0266375 12.1273 0.0425922 12.3044 -0.000976562H13.7044V-0.00066974ZM18.2149 19.5258C17.7453 18.3329 17.8357 17.159 18.7183 16.2204C19.0859 15.8295 19.4934 15.5147 19.9317 15.2002C21.0766 14.3786 22.1819 13.6345 22.9309 12.4008C23.3284 11.746 23.5837 11.0437 23.724 10.2843C23.8643 9.52494 23.9215 8.8395 23.8716 8.10036C23.8308 7.49776 23.6391 6.9464 23.3926 6.4021C22.9361 5.39419 22.2599 4.53079 21.4296 3.80362C18.9015 1.58898 15.2129 0.957537 11.9642 1.15513C10.0322 1.27264 8.10365 1.80989 6.4295 2.79356C3.73795 4.37492 2.03245 6.98015 1.42439 10.0478C1.13344 11.5156 1.0318 13.0141 1.17392 14.5114C1.46517 17.5793 2.7443 20.4816 4.77483 22.7775C7.12521 25.4352 10.4927 27.0647 14.0531 26.8595C14.9287 26.8092 15.7577 26.5502 16.507 26.1167C17.6464 25.4573 18.4477 24.381 18.7396 23.0917C18.9356 22.2252 18.9745 21.456 18.6498 20.6316L18.2146 19.5264L18.2149 19.5258Z"
        fill="#64D1CB"
      />
      <path
        d="M16.6692 21.8423C16.6692 23.6992 15.1761 25.2042 13.3346 25.2042C11.4931 25.2042 10 23.6989 10 21.8423C10 19.9857 11.4931 18.4805 13.3346 18.4805C15.1761 18.4805 16.6692 19.9857 16.6692 21.8423ZM15.5678 21.8423C15.5678 20.5991 14.5681 19.5912 13.3349 19.5912C12.1017 19.5912 11.102 20.5991 11.102 21.8423C11.102 23.0856 12.1017 24.0935 13.3349 24.0935C14.5681 24.0935 15.5678 23.0856 15.5678 21.8423Z"
        fill="#64D1CB"
      />
      <path
        d="M15.1243 7.59562C14.4916 8.75326 13.1964 9.36476 12.007 8.66889C11.5551 8.40441 11.2078 8.01996 10.9604 7.5453C10.415 6.49904 10.419 5.2291 10.9753 4.18836C11.2109 3.74776 11.5271 3.39645 11.9391 3.13289C13.1178 2.37934 14.4715 2.97273 15.1207 4.15768C15.7035 5.22143 15.7062 6.53034 15.1243 7.59532V7.59562ZM13.7816 7.54561C14.6855 6.72241 14.6669 4.9367 13.7183 4.16381C13.3205 3.83981 12.7861 3.84226 12.389 4.16688C12.2085 4.31446 12.0627 4.49549 11.9507 4.70934C11.5837 5.41135 11.573 6.24438 11.9057 6.96295C12.0241 7.21915 12.1872 7.43025 12.4017 7.60299C12.8156 7.9362 13.3765 7.91472 13.7816 7.54561Z"
        fill="#64D1CB"
      />
      <path
        d="M7.59743 18.649C6.8585 19.171 5.93058 19.1673 5.19896 18.6601C3.89792 17.7583 3.5665 15.8738 4.21443 14.4575C4.43842 13.9679 4.76224 13.5662 5.19348 13.2662C6.38161 12.4393 7.79068 13.0155 8.46144 14.2486C9.23902 15.6781 8.95781 17.6887 7.59774 18.6487L7.59743 18.649ZM7.04232 17.685C8.09106 16.8511 7.98729 14.8009 6.91754 14.152C6.23857 13.7399 5.54773 14.2121 5.23791 14.8819C4.91258 15.5854 4.91958 16.4031 5.2653 17.0956C5.39404 17.3536 5.56842 17.5672 5.79607 17.727C6.18044 17.997 6.66525 17.9848 7.04232 17.685Z"
        fill="#64D1CB"
      />
      <path
        d="M9.04644 10.3359C8.40459 11.573 7.02382 12.202 5.81408 11.4181C5.34723 11.1156 5.0012 10.6918 4.76717 10.1752C4.11619 8.73862 4.46831 6.83417 5.79156 5.95696C6.45745 5.51545 7.28037 5.48016 7.97335 5.87995C8.47459 6.16928 8.84862 6.60129 9.10122 7.13271C9.58207 8.14399 9.56229 9.34152 9.04674 10.3356L9.04644 10.3359ZM7.65379 10.3605C8.61245 9.50874 8.53911 7.62915 7.54575 6.91916C7.17142 6.65161 6.70366 6.65437 6.33176 6.92836C5.29458 7.69296 5.30828 9.68424 6.33267 10.4332C6.74079 10.7314 7.26668 10.7044 7.65379 10.3605Z"
        fill="#64D1CB"
      />
      <path
        d="M21.3516 10.1639C20.7737 11.4494 19.4066 12.2113 18.1351 11.4786C17.6162 11.1794 17.2312 10.718 16.982 10.1623C16.341 8.73468 16.6904 6.84342 18.0027 5.96284C18.734 5.47223 19.6467 5.48205 20.3683 5.9877C21.6587 6.8916 21.9865 8.75186 21.3516 10.1642V10.1639ZM19.8826 10.3529C20.7935 9.53548 20.7734 7.77126 19.8616 6.98794C19.4547 6.63847 18.8999 6.62988 18.4893 6.97536C17.4969 7.81084 17.5629 9.74014 18.5809 10.4523C18.9888 10.7373 19.5013 10.6947 19.8823 10.3529H19.8826Z"
        fill="#64D1CB"
      />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 9 20 18" className={className} fill="none">
      <path
        d="M0.146748 16.7553C0.0268974 16.7522 -0.043278 16.8885 0.0296571 16.9834C0.866243 18.0732 1.70283 19.163 2.53981 20.2528C2.59461 20.319 2.70894 20.3707 2.77872 20.368C2.84535 20.3653 2.94588 20.3139 3.00778 20.2383C3.87669 19.1916 4.7456 18.1449 5.61412 17.0982C5.70638 16.9873 5.62674 16.82 5.48205 16.8192C4.78621 16.8164 4.2804 16.8039 4.09313 16.789C4.04819 16.7855 3.94844 16.7757 3.88182 16.7032C3.88182 16.7032 3.77971 16.6134 3.81755 16.4438C4.46648 13.5341 6.85205 11.3133 9.77774 10.8482C14.008 10.1757 17.8613 13.2312 18.2134 17.4031C18.5678 21.6012 15.2384 25.2433 10.9447 25.2609C10.5027 25.2629 10.1247 25.6023 10.0766 26.0369C10.0257 26.495 10.3249 26.8484 10.7531 27.0005H11.5337C15.9473 26.6588 19.6047 23.2855 19.9559 18.8083L19.9823 18.4721C20.0068 18.1602 20.0064 17.8471 19.9816 17.5351L19.9548 17.2036C19.5704 12.4188 15.3476 8.66033 10.537 9.02438L10.2039 9.04946C6.12428 9.35826 2.77438 12.4165 2.04306 16.4073C2.00127 16.6354 1.82031 16.7917 1.57943 16.7914C1.102 16.7792 0.624177 16.7674 0.146748 16.7553Z"
        fill="#00B3AF"
      />
      <path
        d="M10.5373 9.02438C15.3477 8.66037 19.5707 12.4185 19.9553 17.2031L19.9816 17.5351C20.0065 17.8469 20.007 18.1599 19.9826 18.4716L19.9562 18.8086L19.9133 19.2246C19.3753 23.4931 15.8098 26.6687 11.5344 27H10.7531C10.3252 26.8479 10.0257 26.4949 10.0764 26.0371C10.1244 25.6026 10.5027 25.2629 10.9445 25.2607C15.1041 25.2436 18.3594 21.8253 18.2365 17.7949L18.2131 17.4033C17.861 13.2314 14.0078 10.1761 9.77754 10.8486L9.50508 10.8965C6.70481 11.4524 4.44632 13.6248 3.81758 16.4433C3.77999 16.6118 3.88062 16.7018 3.88203 16.7031C3.94848 16.7754 4.04786 16.7855 4.09297 16.789C4.28023 16.8039 4.78677 16.8166 5.48261 16.8193C5.62707 16.8204 5.70663 16.9878 5.61445 17.0986C4.74599 18.1452 3.87686 19.1916 3.00801 20.2382C2.94611 20.3139 2.84514 20.3654 2.77851 20.3681L2.71992 20.3603C2.67718 20.3493 2.63003 20.327 2.59101 20.2988L2.54023 20.2529C1.70325 19.1631 0.866076 18.0732 0.0294899 16.9834C-0.0431942 16.8886 0.0270591 16.7519 0.146677 16.7548C0.623994 16.767 1.10198 16.7788 1.57929 16.791C1.82018 16.7914 2.00137 16.6353 2.04316 16.4072C2.77451 12.4164 6.12468 9.35857 10.2043 9.04977L10.5373 9.02438Z"
        fill="#00B3AF"
      />
    </svg>
  );
}

function SearchKeywordIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 8" className={className} fill="none">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="#00C5C9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 10" className={className} fill="none">
      <path d="M1 5L4.5 8.5L11 1" stroke="black" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Swatch de color con tooltip + doble borde + check (estado seleccionado) ──
function ColorSwatch({
  name,
  hex,
  selected,
  onToggle,
}: {
  name: string;
  hex: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const isWhite = hex.toLowerCase() === "#ffffff";
  return (
    <div className="group relative flex flex-col items-center">
      <div
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#39D5D3] bg-[#F3F9FA] px-2.5 py-1 text-[11px] font-semibold text-[#00C5C9] opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0"
      >
        {name}
        <span className="absolute left-1/2 -bottom-[3px] -translate-x-1/2 h-2 w-2 rotate-45 border-b border-r border-[#39D5D3] bg-[#F3F9FA]" />
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={name}
        aria-pressed={selected}
        className={`relative h-10 w-10 rounded-full transition-all duration-200 ease-out hover:scale-110 ${
          isWhite ? "border border-ui-border" : ""
        }`}
        style={{
          backgroundColor: hex,
          boxShadow: selected ? `0 0 0 2px white, 0 0 0 4px ${hex}` : "none",
        }}
      >
        {selected && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CheckIcon className="h-2.5 w-2.5" />
          </span>
        )}
      </button>
    </div>
  );
}

// ── Botón-disparador de un menú, con su popover anclado abajo ──
function FilterDropdown({
  label,
  active,
  count,
  open,
  onToggle,
  icon,
  children,
  width = "w-64",
}: {
  label: string;
  active?: boolean;
  count?: number;
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
          active || open
            ? "border-primary bg-[#ECF9F9] text-[#00A7AB]"
            : "border-ui-border bg-white text-foreground hover:border-primary"
        }`}
      >
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
        {label}
        {count ? (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#00A7AB] px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        ) : null}
        <ChevronDownIcon className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-0 top-[calc(100%+8px)] z-30 ${width} rounded-2xl border border-ui-border bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)]`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SortIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#00A7AB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  );
}

export default function FiltersPanel({
  products,
  appliedFilters,
  resultCount,
  categoryLabel,
  onApply,
  onOpen,
}: {
  products: ProductWithVariants[];
  appliedFilters: AppliedFilters;
  resultCount: number;
  /** Nombre de la categoría activa, para el conteo ("N productos en X"). */
  categoryLabel?: string | null;
  onApply: (filters: AppliedFilters) => void;
  /** Se llama la primera vez que se abre CUALQUIER menú del filtro — deja
   * que el padre traiga el catálogo completo (sin paginar) para que
   * filtrar/sugerir no se limite a la página ya cargada. */
  onOpen?: () => void;
}) {
  const { keyword, material, minPrice, maxPrice, colors, sort } = appliedFilters;

  // Un solo menú abierto a la vez.
  const [openMenu, setOpenMenu] = useState<null | "sort" | "color" | "material" | "price">(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [showMoreColors, setShowMoreColors] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const keywordWrapperRef = useRef<HTMLDivElement>(null);
  const openedOnceRef = useRef(false);

  function updateFilters(patch: Partial<AppliedFilters>) {
    onApply({ ...appliedFilters, ...patch });
  }

  function toggleMenu(menu: "sort" | "color" | "material" | "price") {
    if (!openedOnceRef.current) {
      openedOnceRef.current = true;
      onOpen?.();
    }
    setOpenMenu((cur) => (cur === menu ? null : menu));
  }

  // Cierra el menú abierto al hacer clic fuera de toda la barra.
  useEffect(() => {
    if (!openMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (keywordWrapperRef.current && !keywordWrapperRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [suggestionsOpen]);

  const materials = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => extractMaterials(p.composition).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [products]);

  const keywordSuggestions = useMemo(() => {
    if (!keyword.trim()) return [];
    return products.filter((p) => matchesKeyword(p, keyword)).slice(0, 8);
  }, [products, keyword]);

  const extraColors = useMemo(() => {
    const known = new Set(EXAMPLE_COLORS.map((c) => c.name.toLowerCase()));
    const map = new Map<string, string>();
    products.forEach((p) =>
      (p.variants ?? []).forEach((v) => {
        if (!known.has(v.color_name.toLowerCase())) map.set(v.color_name, v.color_hex);
      })
    );
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [products]);

  function toggleColor(name: string) {
    updateFilters({ colors: colors.includes(name) ? colors.filter((c) => c !== name) : [...colors, name] });
  }

  const priceChanged = minPrice > DEFAULT_FILTERS.minPrice || maxPrice < DEFAULT_FILTERS.maxPrice;
  const activeCount = countActiveFilters(appliedFilters);
  const anyActive = activeCount > 0 || sort !== "relevancia";

  const priceLabel = priceChanged
    ? minPrice > DEFAULT_FILTERS.minPrice && maxPrice < DEFAULT_FILTERS.maxPrice
      ? `$${minPrice}–$${maxPrice}`
      : maxPrice < DEFAULT_FILTERS.maxPrice
      ? `Hasta $${maxPrice}`
      : `Desde $${minPrice}`
    : "Precio";

  // Chips: uno por cada valor aplicado (incluye el orden), cada uno se
  // quita individualmente. Se arma fresco en cada render.
  const chips = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    if (sort !== "relevancia") {
      list.push({ key: "sort", label: SORT_LABELS[sort], onRemove: () => updateFilters({ sort: "relevancia" }) });
    }
    if (keyword.trim()) {
      list.push({ key: "keyword", label: `"${keyword}"`, onRemove: () => updateFilters({ keyword: "" }) });
    }
    colors.forEach((c) => {
      list.push({ key: `color-${c}`, label: c, onRemove: () => updateFilters({ colors: colors.filter((x) => x !== c) }) });
    });
    if (material) {
      list.push({ key: "material", label: material, onRemove: () => updateFilters({ material: "" }) });
    }
    if (priceChanged) {
      list.push({
        key: "price",
        label: priceLabel,
        onRemove: () => updateFilters({ minPrice: DEFAULT_FILTERS.minPrice, maxPrice: DEFAULT_FILTERS.maxPrice }),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, keyword, colors, material, minPrice, maxPrice]);

  const sortLabel = sort === "relevancia" ? "Ordenar" : SORT_LABELS[sort];

  return (
    <div ref={barRef} className="mb-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Ordenar */}
        <FilterDropdown
          label={sortLabel}
          active={sort !== "relevancia"}
          open={openMenu === "sort"}
          onToggle={() => toggleMenu("sort")}
          icon={<SortIcon className="h-4 w-4" />}
          width="w-60"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ui-gray">Ordenar por</p>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                updateFilters({ sort: opt });
                setOpenMenu(null);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-[#ECF9F9]"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  sort === opt ? "border-[#00A7AB]" : "border-ui-border"
                }`}
              >
                {sort === opt && <span className="h-2 w-2 rounded-full bg-[#00A7AB]" />}
              </span>
              {SORT_LABELS[opt]}
            </button>
          ))}
        </FilterDropdown>

        {/* Color */}
        <FilterDropdown
          label="Color"
          count={colors.length}
          open={openMenu === "color"}
          onToggle={() => toggleMenu("color")}
          icon={<PaletteIcon className="h-4 w-4" />}
          width="w-[280px]"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ui-gray">Elige uno o varios</p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {EXAMPLE_COLORS.map((c) => (
              <ColorSwatch key={c.name} name={c.name} hex={c.hex} selected={colors.includes(c.name)} onToggle={() => toggleColor(c.name)} />
            ))}
            {extraColors.length > 0 && !showMoreColors && (
              <button
                type="button"
                onClick={() => setShowMoreColors(true)}
                aria-label="Más colores"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[#00C5C9] text-[#00C5C9] transition-all duration-200 ease-out hover:scale-110 hover:bg-[#ECF9F9]"
              >
                +
              </button>
            )}
            {showMoreColors &&
              extraColors.map((c) => (
                <ColorSwatch key={c.name} name={c.name} hex={c.hex} selected={colors.includes(c.name)} onToggle={() => toggleColor(c.name)} />
              ))}
          </div>
        </FilterDropdown>

        {/* Material / Acabado */}
        {materials.length > 0 && (
          <FilterDropdown
            label={material || "Material"}
            active={!!material}
            open={openMenu === "material"}
            onToggle={() => toggleMenu("material")}
            icon={<LayersIcon className="h-4 w-4" />}
            width="w-64"
          >
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ui-gray">Acabado</p>
            <button
              type="button"
              onClick={() => {
                updateFilters({ material: "" });
                setOpenMenu(null);
              }}
              className={`flex w-full items-center rounded-lg px-2 py-2 text-left text-sm hover:bg-[#ECF9F9] ${
                !material ? "font-semibold text-[#00A7AB]" : "text-foreground"
              }`}
            >
              Todos los materiales
            </button>
            {materials.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  updateFilters({ material: m });
                  setOpenMenu(null);
                }}
                className={`flex w-full items-center rounded-lg px-2 py-2 text-left text-sm hover:bg-[#ECF9F9] ${
                  material === m ? "font-semibold text-[#00A7AB]" : "text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </FilterDropdown>
        )}

        {/* Precio */}
        <FilterDropdown
          label={priceLabel}
          active={priceChanged}
          open={openMenu === "price"}
          onToggle={() => toggleMenu("price")}
          icon={<TagFilterIcon className="h-4 w-4" />}
          width="w-[280px]"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ui-gray">Rango de precio</p>
          <div className="flex items-center gap-2">
            <label className="flex-1 rounded-xl border border-[#00C5C9] bg-[#ECF9F9] px-3 py-2 focus-within:border-[#00A7AB]">
              <span className="block text-[10px] text-ui-gray">Mínimo</span>
              <span className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#00A7AB]">$</span>
                <input
                  type="number"
                  min={0}
                  value={minPrice || ""}
                  placeholder="0"
                  onChange={(e) => updateFilters({ minPrice: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-transparent text-sm font-bold text-[#00A7AB] focus:outline-none"
                />
              </span>
            </label>
            <span className="text-ui-gray">—</span>
            <label className="flex-1 rounded-xl border border-[#00C5C9] bg-[#ECF9F9] px-3 py-2 focus-within:border-[#00A7AB]">
              <span className="block text-[10px] text-ui-gray">Máximo</span>
              <span className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#00A7AB]">$</span>
                <input
                  type="number"
                  min={0}
                  value={maxPrice < DEFAULT_FILTERS.maxPrice ? maxPrice : ""}
                  placeholder="∞"
                  onChange={(e) => {
                    const v = e.target.value === "" ? DEFAULT_FILTERS.maxPrice : Math.max(0, Number(e.target.value));
                    updateFilters({ maxPrice: v });
                  }}
                  className="w-full bg-transparent text-sm font-bold text-[#00A7AB] focus:outline-none"
                />
              </span>
            </label>
          </div>
        </FilterDropdown>

        {/* Palabra clave — input siempre visible, sin clic previo */}
        <div className="relative min-w-[190px] flex-1 sm:max-w-[280px]" ref={keywordWrapperRef}>
          <SearchKeywordIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00A7AB]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              updateFilters({ keyword: e.target.value });
              setSuggestionsOpen(true);
              if (!openedOnceRef.current) {
                openedOnceRef.current = true;
                onOpen?.();
              }
            }}
            onFocus={() => setSuggestionsOpen(true)}
            placeholder="Palabra clave, ej. sudadera"
            className="w-full rounded-full border border-ui-border bg-[#fafafa] py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-ui-gray focus:border-primary focus:bg-white focus:outline-none"
          />
          {suggestionsOpen && keyword.trim() && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-[#00C5C9]/40 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
              {keywordSuggestions.length > 0 ? (
                <ul className="max-h-52 overflow-y-auto py-1">
                  {keywordSuggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          updateFilters({ keyword: p.name });
                          setSuggestionsOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground hover:bg-[#ECF9F9]"
                      >
                        <SearchKeywordIcon className="h-3.5 w-3.5 shrink-0 text-[#00C5C9]" />
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-ui-gray">No encontramos productos relacionados.</p>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-ui-gray">
            <span className="font-semibold text-foreground">{resultCount}</span> producto{resultCount !== 1 ? "s" : ""}
            {categoryLabel && !anyActive ? ` en ${categoryLabel}` : ""}
          </span>
          {anyActive && (
            <button
              type="button"
              onClick={() => onApply({ ...DEFAULT_FILTERS })}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-[#00B3AF] transition-transform duration-150 hover:scale-[1.03]"
            >
              <RefreshIcon className="h-4 w-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="flex items-center gap-1.5 rounded-full border border-[#00C5C9]/50 bg-[#ECF9F9] px-3 py-1 text-xs font-semibold text-[#00A7AB] transition-colors duration-150 hover:bg-[#D9F2F1]"
            >
              {chip.label}
              <span className="text-sm leading-none">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
