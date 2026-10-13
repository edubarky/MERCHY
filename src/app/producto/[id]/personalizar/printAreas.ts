import { VIEW_ASSETS } from "./viewAssets";
import type { ViewName } from "./types";

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
  fundaHorizontal: { ...VIEW_ASSETS.fundaHorizontal.printArea },
  fundaVertical: { ...VIEW_ASSETS.fundaVertical.printArea },
  bolsa: { ...VIEW_ASSETS.bolsa.printArea },
  ligaFrente: { ...VIEW_ASSETS.ligaFrente.printArea },
  ligaReverso: { ...VIEW_ASSETS.ligaReverso.printArea },
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
// widthCm/heightCm aquí son un ESTIMADO genérico (no una medida tomada de
// un SKU real) — el tamaño típico del área imprimible en una sudadera
// unisex adulto talla M/L (ver charla 2026-09-16: "calcula unas medidas
// aprox... y hazlo un estimado como ChatGPT ya lo hace hoy"). Frente/
// reverso: zona de estampado completo típica del mercado (frente algo
// más chico que la espalda, que tiene más superficie libre). Izquierda/
// derecha: manga, angosta y alargada. Sirven para SUGERIR el tamaño real
// del logo (getElementRealCm) — el cliente siempre puede corregirlo a
// mano si su diseño en particular difiere.
const HOODIE_PRINT_AREAS: ProductPrintAreas = {
  frente: { xPct: 20, yPct: 21, widthPct: 60, heightPct: 37, widthCm: 28, heightCm: 32 },
  reverso: { xPct: 25, yPct: 32, widthPct: 50, heightPct: 48, widthCm: 32, heightCm: 38 },
  izquierda: { xPct: 20, yPct: 23, widthPct: 58, heightPct: 55, widthCm: 8, heightCm: 22 },
  derecha: { xPct: 22, yPct: 23, widthPct: 58, heightPct: 55, widthCm: 8, heightCm: 22 },
  // Ninguna sudadera ofrece pestañas de funda/bolsa/liga (getApplicableViews
  // las deja en los 4 costados de siempre) -- estos valores nunca se leen
  // en la práctica, solo existen para que ProductPrintAreas
  // (Record<ViewName, ...>) quede completo.
  fundaHorizontal: { ...DEFAULT_PRINT_AREAS.fundaHorizontal },
  fundaVertical: { ...DEFAULT_PRINT_AREAS.fundaVertical },
  bolsa: { ...DEFAULT_PRINT_AREAS.bolsa },
  ligaFrente: { ...DEFAULT_PRINT_AREAS.ligaFrente },
  ligaReverso: { ...DEFAULT_PRINT_AREAS.ligaReverso },
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
//
// Playera Infantil: medidas reales de la tabla de tallas del proveedor
// (ver charla 2026-10-12, Ancho/Largo por talla):
//   3-4: 32x45.5cm | 5-6: 36x47cm | 7-8: 39x50cm | 9-11: 43x54cm | 12-14: 44x63cm
// El sistema solo admite UN área por producto (no por talla), así que se
// toma 7-8 (39x50cm) como referencia -- la talla de en medio de las 5,
// mismo criterio que HOODIE_PRINT_AREAS con su adulto M/L. Área de
// impresión derivada de esa referencia (no medida directo del área
// imprimible, que el proveedor no especifica): Frente ~72% del Ancho x
// ~52% del Largo (deja margen de costura a los lados y espacio de cuello/
// dobladillo arriba/abajo); Reverso un poco más generoso (~77% x ~60%,
// la espalda no tiene cuello que esquivar) -- mismo criterio relativo que
// ya usa HOODIE_PRINT_AREAS. Izquierda/Derecha (manga corta, sin dato en
// la tabla) se dejan en su estimado genérico anterior. Sigue siendo una
// SUGERENCIA (getElementRealCm) que el cliente puede corregir a mano, no
// una medida tomada diseño por diseño.
const PLAYERA_INFANTIL_PRINT_AREAS: Partial<ProductPrintAreas> = {
  frente: { ...DEFAULT_PRINT_AREAS.frente, widthCm: 28, heightCm: 26 },
  reverso: { ...DEFAULT_PRINT_AREAS.reverso, widthCm: 30, heightCm: 30 },
  izquierda: { ...DEFAULT_PRINT_AREAS.izquierda, widthCm: 6, heightCm: 7 },
  derecha: { ...DEFAULT_PRINT_AREAS.derecha, widthCm: 6, heightCm: 7 },
};

const PRODUCT_PRINT_AREAS: Record<string, Partial<ProductPrintAreas>> = {
  "playera infantil": PLAYERA_INFANTIL_PRINT_AREAS,
};

export function getPrintArea(productName: string, view: ViewName): PrintAreaConfig {
  const key = normalizeProductKey(productName);

  const productOverride = PRODUCT_PRINT_AREAS[key]?.[view];
  if (productOverride) return productOverride;

  const category = PRODUCT_CATEGORY_MATCHERS.find((m) => key.includes(m.keyword));
  if (category) return category.areas[view];

  return DEFAULT_PRINT_AREAS[view];
}

// Mismo criterio que PRODUCT_PRINT_AREAS arriba, pero para el aspect ratio
// del LIENZO (VIEW_ASSETS[view].aspect es un solo valor compartido por
// TODO el catálogo, calibrado contra el mockup genérico 418x484 -- un
// producto cuyas fotos reales tienen otra proporción se veía letterboxed
// dentro de ese marco fijo, dejando la prenda chica con mucho margen
// blanco arriba/abajo). Playera Infantil: sus 4 fotos reales (Frente/
// Reverso/Izquierda/Derecha) son cuadradas (500x500 / 1254x1254,
// confirmado bajando los archivos), nada que ver con 418:484 -- ver
// charla 2026-10-12, "se ve muy chica la foto de la playera".
const PRODUCT_VIEW_ASPECTS: Record<string, Partial<Record<ViewName, number>>> = {
  "playera infantil": { frente: 1, reverso: 1, izquierda: 1, derecha: 1 },
};

export function getViewAspect(productName: string, view: ViewName): number {
  const key = normalizeProductKey(productName);
  return PRODUCT_VIEW_ASPECTS[key]?.[view] ?? VIEW_ASSETS[view].aspect;
}

// Los 4 costados clásicos de una prenda -- el default de getApplicableViews
// para todo el catálogo excepto los productos agregados a mano abajo.
// Lista explícita a propósito (no "VIEW_ORDER menos los ejes especiales"):
// VIEW_ORDER va a seguir creciendo cada vez que un producto necesite su
// propio accesorio/componente (funda, bolsa, liga, el que siga...), y
// ninguno de esos debe aparecer por default en una prenda de vestir sin
// tener que acordarse de excluirlo aquí a mano cada vez.
const DEFAULT_APPLICABLE_VIEWS: ViewName[] = ["frente", "reverso", "izquierda", "derecha"];

// Qué ejes ofrece REALMENTE cada producto -- no todo el catálogo es una
// prenda con cuatro costados. Por defecto (el resto del catálogo, toda
// prenda de vestir) los cuatro de siempre (DEFAULT_APPLICABLE_VIEWS); un
// producto agregado aquí a mano -- por su nombre exacto, mismo criterio
// tolerante que PRODUCT_PRINT_AREAS -- puede acotar a un subconjunto (ej.
// un tapete plano no tiene izquierda/derecha que imprimir) y/o sumar los
// ejes de funda cuando el producto en sí incluye un accesorio con su
// propia superficie imprimible. Nunca se infiere automáticamente de la
// categoría/nombre del producto -- se agrega uno por uno según lo
// confirme el usuario, igual que PRODUCT_PRINT_AREAS.
//
// Tapete de Yoga Minsk: producto plano (sin costados que imprimir) que
// además incluye de fábrica una "funda transportadora de poliéster con
// asa para hombro" (ver su descripción real en Supabase) -- de ahí Frente
// + Reverso + Funda Horizontal + Funda Vertical. Dos ejes de funda, no
// uno, porque hay foto real de la funda en las dos orientaciones y el
// cliente debe poder elegir con cuál personalizar (pedido explícito).
const PRODUCT_APPLICABLE_VIEWS: Record<string, ViewName[]> = {
  "tapete de yoga minsk": ["frente", "reverso", "fundaHorizontal", "fundaVertical"],
  // Tapete Century: mismo criterio que el Tapete de Yoga Minsk (producto
  // plano, sin costados que imprimir) -- también incluye "funda con
  // cordón para cierre de jareta y correa" según su descripción real.
  // Ya con las 3 fotos reales (Frente/Reverso/Funda, cada una en Azul,
  // Negro y Rosa) -- pero a diferencia del otro tapete, aquí solo hay UNA
  // foto de funda por color (sin horizontal/vertical), así que usa nada
  // más fundaVertical, sin su par fundaHorizontal -- eso es justo lo que
  // hace que PersonalizerClient nunca muestre el toggle Horizontal/
  // Vertical para este producto (ver isFundaViewActive: solo aparece
  // cuando el producto ofrece las DOS orientaciones).
  "tapete century": ["frente", "reverso", "fundaVertical"],
  // Set de ejercicio Bor: de los 3 artículos reales del set (banda
  // elástica, cuerda, bolso de malla) solo la banda ("liga") y la bolsa
  // se pueden personalizar -- pedido explícito ("solo se va poder
  // personalizar la banda y la bolsa"), la cuerda no tiene ningún eje.
  // La bolsa va sola (un solo eje, sin Reverso) porque solo se puede
  // personalizar de frente ("la bolsa solo se va poder personalizar de
  // la parte de enfrente"); la liga sí trae Frente y Reverso reales.
  "set de ejercicio bor": ["bolsa", "ligaFrente", "ligaReverso"],
};

export function getApplicableViews(productName: string): ViewName[] {
  const key = normalizeProductKey(productName);
  return PRODUCT_APPLICABLE_VIEWS[key] ?? DEFAULT_APPLICABLE_VIEWS;
}

// Es "prenda de vestir" (para elegir el set de íconos de las pestañas de
// eje, ver PersonalizerClient.tsx) exactamente cuando este producto usa
// los 4 costados clásicos de siempre y nada más -- se deriva de
// getApplicableViews en vez de mantener una segunda lista aparte: un
// producto que necesitó su propio PRODUCT_APPLICABLE_VIEWS (Tapete de
// Yoga Minsk, Tapete Century, Set de ejercicio Bor...) ya dejó de
// comportarse como una prenda estándar, así que tampoco debe verse como
// una en los íconos. Comparado contra DEFAULT_APPLICABLE_VIEWS en vez de
// un "views.length === 4" hardcodeado + una lista de exclusiones que
// mantener a mano cada vez que se agrega un componente nuevo.
export function isGarmentProduct(productName: string): boolean {
  const views = getApplicableViews(productName);
  return views.length === DEFAULT_APPLICABLE_VIEWS.length && DEFAULT_APPLICABLE_VIEWS.every((v) => views.includes(v));
}
