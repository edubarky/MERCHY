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

// Real per-product overrides go here, keyed by the product's exact name
// (matched the same tolerant way as the photo folders — case/accent/
// whitespace-insensitive, see normalizeProductKey below). Add an entry
// per product as real print-area measurements become available; any view
// left out of a product's entry falls back to DEFAULT_PRINT_AREAS for
// that view only.
//
// Example:
// "sudadera ocean": {
//   frente: { xPct: 34, yPct: 22, widthPct: 32, heightPct: 30, widthCm: 28, heightCm: 32 },
// },
const PRODUCT_PRINT_AREAS: Record<string, Partial<ProductPrintAreas>> = {};

function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getPrintArea(productName: string, view: ViewName): PrintAreaConfig {
  const key = normalizeProductKey(productName);
  return PRODUCT_PRINT_AREAS[key]?.[view] ?? DEFAULT_PRINT_AREAS[view];
}