import { VIEW_ASSETS } from "./viewAssets";
import { VIEW_ORDER, type ViewName } from "./types";

// Per-product, per-view print-area configuration. Each product/view gets
// its OWN area — this is not a single shared rectangle. Position/size are
// always required (% of that view's own image, so they stay correct
// regardless of render size); physical dimensions (cm) are optional. When
// provided, PersonalizerClient uses them to auto-measure each logo's real
// printed size (see pricing.ts's getElementRealCm/roundUpToConfiguredSize)
// for "by_size" technique pricing (DTF Textil, DTF UV) instead of asking
// the customer to pick a size manually. Never invented: a product/view
// with no widthCm/heightCm here simply keeps the manual size selector,
// exactly as before this existed.
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
  funda: { ...VIEW_ASSETS.funda.printArea },
};

export function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Hoodie-with-kangaroo-pocket category default: measured directly from
// Sudadera Ocean's real photos (public/VISTA DE PRODUCTOS/SUDADERA OCEAN/)
// against a % grid. Reverso is the open back area below the hood,
// izquierda/derecha run the visible sleeve from shoulder seam to just
// above the cuff. Applied automatically to every product whose name
// contains "sudadera" (see PRODUCT_CATEGORY_MATCHERS) — every current
// catalog "SUDADERA *" product is this same hood+kangaroo-pocket style,
// verified against their own photos, not assumed. Non-hoodie products
// (playeras, polos, gorras, etc.) never get this shape.
//
// frente: chest/upper-torso zone (below the hood drawstrings, above the
// kangaroo pocket) — confirmed as the correct zone directly by the user
// against a reference crop, after an earlier pass had it on the pocket
// itself (that was explicitly reversed; if this is ever revisited, get
// it in writing which of the two this actually means, this exact area
// has flipped more than once).
const HOODIE_PRINT_AREAS: ProductPrintAreas = {
  frente: { xPct: 20, yPct: 21, widthPct: 60, heightPct: 37 },
  reverso: { xPct: 25, yPct: 32, widthPct: 50, heightPct: 48 },
  izquierda: { xPct: 20, yPct: 23, widthPct: 58, heightPct: 55 },
  derecha: { xPct: 22, yPct: 23, widthPct: 58, heightPct: 55 },
  // Ninguna sudadera ofrece la pestaña "Funda" (getApplicableViews las deja
  // en los 4 costados de siempre) -- este valor nunca se lee en la
  // práctica, solo existe para que ProductPrintAreas (Record<ViewName, ...>)
  // quede completo.
  funda: { ...DEFAULT_PRINT_AREAS.funda },
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

// Los 4 costados clásicos de una prenda -- el default de getApplicableViews
// para todo el catálogo excepto los productos agregados a mano abajo.
// Deliberadamente NO es VIEW_ORDER completo: VIEW_ORDER incluye "funda"
// porque el TIPO de estado (ViewElements/ResolvedProductAssets) siempre
// tiene que poder representarlo, pero "funda" nunca debe aparecer por
// default en una prenda de vestir -- solo cuando un producto se agrega
// aquí explícitamente pidiéndolo.
const DEFAULT_APPLICABLE_VIEWS: ViewName[] = VIEW_ORDER.filter((v) => v !== "funda");

// Qué ejes ofrece REALMENTE cada producto -- no todo el catálogo es una
// prenda con cuatro costados. Por defecto (el resto del catálogo, toda
// prenda de vestir) los cuatro de siempre (DEFAULT_APPLICABLE_VIEWS); un
// producto agregado aquí a mano -- por su nombre exacto, mismo criterio
// tolerante que PRODUCT_PRINT_AREAS -- puede acotar a un subconjunto (ej.
// un tapete plano no tiene izquierda/derecha que imprimir) y/o sumar
// "funda" cuando el producto en sí incluye un accesorio con su propia
// superficie imprimible. Nunca se infiere automáticamente de la
// categoría/nombre del producto -- se agrega uno por uno según lo
// confirme el usuario, igual que PRODUCT_PRINT_AREAS.
//
// Tapete de Yoga Minsk: producto plano (sin costados que imprimir) que
// además incluye de fábrica una "funda transportadora de poliéster con
// asa para hombro" (ver su descripción real en Supabase) -- de ahí Frente
// + Reverso + Funda, pedido explícito del usuario.
const PRODUCT_APPLICABLE_VIEWS: Record<string, ViewName[]> = {
  "tapete de yoga minsk": ["frente", "reverso", "funda"],
};

export function getApplicableViews(productName: string): ViewName[] {
  const key = normalizeProductKey(productName);
  return PRODUCT_APPLICABLE_VIEWS[key] ?? DEFAULT_APPLICABLE_VIEWS;
}
