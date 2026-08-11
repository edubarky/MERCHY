import { VIEW_ASSETS } from "./viewAssets";
import type { ViewName } from "./types";

// Per-product, per-view print-area configuration. Each product/view gets
// its OWN area — this is not a single shared rectangle. Position/size are
// always required (% of that view's own image, so they stay correct
// regardless of render size); physical dimensions (cm) are optional and
// only shown in the "ÁREA DE DISEÑO" guide label when provided.
export interface PrintAreaConfig {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  widthCm?: number;
  heightCm?: number;
}

export type ProductPrintAreas = Record<ViewName, PrintAreaConfig>;

// Fallback used for any product/view that has no specific entry below —
// currently the same geometry the generic mockup used, which keeps
// existing spawn-centering/guide behavior unchanged until a product gets
// its own real measurements. No cm dimensions here on purpose: these are
// generic placeholders, not real specs, so the optional dimension label
// simply doesn't render for them.
const DEFAULT_PRINT_AREAS: ProductPrintAreas = {
  frente: { ...VIEW_ASSETS.frente.printArea },
  reverso: { ...VIEW_ASSETS.reverso.printArea },
  izquierda: { ...VIEW_ASSETS.izquierda.printArea },
  derecha: { ...VIEW_ASSETS.derecha.printArea },
};

function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Hoodie-with-kangaroo-pocket category default: measured directly from
// Sudadera Ocean's real photos (public/VISTA DE PRODUCTOS/SUDADERA OCEAN/)
// against a % grid — frente sits exactly on the kangaroo pocket panel
// (not the chest), reverso is the open back area below the hood, izquierda/
// derecha run the visible sleeve from shoulder seam to just above the
// cuff. Applied automatically to every product whose name contains
// "sudadera" (see PRODUCT_CATEGORY_MATCHERS) — every current catalog
// "SUDADERA *" product is this same hood+kangaroo-pocket style, verified
// against their own photos, not assumed. Non-hoodie products (playeras,
// polos, gorras, etc.) never get this shape.
const HOODIE_PRINT_AREAS: ProductPrintAreas = {
  frente: { xPct: 24, yPct: 58, widthPct: 52, heightPct: 17 },
  reverso: { xPct: 25, yPct: 32, widthPct: 50, heightPct: 48 },
  izquierda: { xPct: 20, yPct: 23, widthPct: 58, heightPct: 55 },
  derecha: { xPct: 22, yPct: 23, widthPct: 58, heightPct: 55 },
};

// Category default matchers, checked in order — the first whose keyword
// is contained in the (normalized) product name wins. Add more categories
// here as other garment shapes get their own measured print areas; until
// then everything not matched falls through to DEFAULT_PRINT_AREAS.
const PRODUCT_CATEGORY_MATCHERS: { keyword: string; areas: ProductPrintAreas }[] = [
  { keyword: "sudadera", areas: HOODIE_PRINT_AREAS },
];

// Real per-product overrides go here, keyed by the product's exact name
// (matched the same tolerant way as the photo folders — case/accent/
// whitespace-insensitive, via normalizeProductKey). A product/view found
// here wins over its category default; add an entry when a specific
// product's photo genuinely differs from its category (a smaller pocket,
// a differently-placed print zone, etc.) — most products won't need one.
//
// Example:
// "sudadera cap": {
//   frente: { xPct: 26, yPct: 60, widthPct: 48, heightPct: 15, widthCm: 26, heightCm: 20 },
// },
const PRODUCT_PRINT_AREAS: Record<string, Partial<ProductPrintAreas>> = {};

export function getPrintArea(productName: string, view: ViewName): PrintAreaConfig {
  const key = normalizeProductKey(productName);

  const productOverride = PRODUCT_PRINT_AREAS[key]?.[view];
  if (productOverride) return productOverride;

  const category = PRODUCT_CATEGORY_MATCHERS.find((m) => key.includes(m.keyword));
  if (category) return category.areas[view];

  return DEFAULT_PRINT_AREAS[view];
}
