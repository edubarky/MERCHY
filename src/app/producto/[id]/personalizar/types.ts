// Ejes aparte de los 4 costados clásicos de una prenda -- la superficie
// imprimible de un ACCESORIO o COMPONENTE distinto que trae el propio
// producto (ej. la funda transportadora del Tapete de Yoga Minsk, o la
// bolsa/liga de Set de ejercicio Bor) -- no todos los productos los
// tienen. "fundaHorizontal"/"fundaVertical" y "ligaFrente"/"ligaReverso"
// van como DOS ejes independientes cada par (nunca uno solo) porque ese
// accesorio tiene foto real en las dos orientaciones y el cliente debe
// poder ELEGIR con cuál personalizar (pedido explícito) -- cada
// orientación es una foto/print-area/lienzo propio, igual que cualquier
// otro eje, no una vista compartida con un selector encima (ver
// PersonalizerClient.tsx's tabGroups, que las agrupa visualmente bajo
// una sola pestaña con un toggle debajo). "bolsa" va sola porque ese
// componente solo se puede personalizar de un lado (pedido explícito:
// "la bolsa solo se va poder personalizar de la parte de enfrente").
// Qué ejes de esta lista se muestran REALMENTE para un producto dado
// (nunca todos a la fuerza) lo decide getApplicableViews en
// printAreas.ts, no este archivo -- aquí solo vive la forma completa que
// puede tomar el estado (ver emptyViewElements/emptyResolvedAssets
// abajo), para que un producto sin alguno de estos ejes simplemente
// nunca tenga nada ahí, en vez de necesitar un tipo distinto.
export type ViewName =
  | "frente"
  | "reverso"
  | "izquierda"
  | "derecha"
  | "fundaHorizontal"
  | "fundaVertical"
  | "bolsa"
  | "ligaFrente"
  | "ligaReverso";

export const VIEW_ORDER: ViewName[] = [
  "frente",
  "reverso",
  "izquierda",
  "derecha",
  "fundaHorizontal",
  "fundaVertical",
  "bolsa",
  "ligaFrente",
  "ligaReverso",
];

export const VIEW_LABELS: Record<ViewName, string> = {
  frente: "Frente",
  reverso: "Reverso",
  izquierda: "Izquierda",
  derecha: "Derecha",
  fundaHorizontal: "Funda Horizontal",
  fundaVertical: "Funda Vertical",
  bolsa: "Bolsa",
  ligaFrente: "Liga Frente",
  ligaReverso: "Liga Reverso",
};

export type LogoFileType = "svg" | "png" | "pdf" | "ai";

export interface DesignElement {
  id: string;
  type: "logo" | "text";
  view: ViewName;

  // logo-only
  fileName?: string;
  fileType?: LogoFileType;
  src?: string; // object URL — absent for "ai" (no in-browser preview possible)
  assetId?: string; // links back to the "Mis artes" library asset this was
  // placed from (see ArtLibraryContext) — purely for provenance/future
  // reuse. Each placement still carries its own fileName/fileType/src, so
  // removing the asset from the library never breaks an existing placement.

  // "Opciones de diseño" (logo-only, ver SelectionToolbar/
  // DesignOptionsPanel) — pedido explícito con referencias visuales de
  // Rotar/Girar/Cambiar color/Ajustes. Todos opcionales con un default
  // "sin efecto" (undefined se trata igual que el valor neutro) para que
  // ningún elemento ya colocado antes de este cambio se vea distinto.
  flipH?: boolean; // espejo horizontal — aplicado a la imagen, nunca al
  // contenedor que ya rota/mueve/redimensiona (ver DesignElementView),
  // así que nunca interfiere con esa lógica.
  flipV?: boolean; // espejo vertical
  opacity?: number; // 0-100, default 100 (opaco)
  brightness?: number; // -100 a 100, default 0 (sin cambio)
  contrast?: number; // -100 a 100, default 0 (sin cambio)
  // Recolor de silueta: reemplaza TODO pixel no transparente por este
  // color sólido (mismo criterio que "un solo color de tinta" en
  // bordado/DTF), preservando el canal alfa original -- no es una
  // paleta por zona, es un color único para todo el diseño. null/undefined
  // = "Sin cambio de color" (se usa el archivo original tal cual).
  recolor?: string | null;
  // Eliminar fondo: quita (transparenta) el color de fondo detectado en
  // los bordes de la imagen, y todo lo conectado a él -- inundación desde
  // el borde (ver removeBackground.ts), no un recorte por forma. Nunca
  // toca `src` (el archivo original) -- reversible con un solo toggle,
  // igual que recolor/flipH/flipV. Funciona mejor con fondos de un solo
  // color (el caso real más común en logos subidos); una foto con fondo
  // complejo puede no limpiarse del todo.
  bgRemoved?: boolean;

  // text-only
  text?: string;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  // Real, author-set font size in px — independent of any container's
  // current pixel size, the actual "Tamaño" the user typed/dragged to.
  // Used only for measuring the real content box (measureText.ts) and as
  // the source for the corner-drag scale factor; never applied directly
  // as a CSS font-size (see fontSizeRatio below).
  fontSizePx?: number;
  // font-size expressed as a fraction of the box's OWN rendered width
  // (i.e. the CSS value used is `${fontSizeRatio * 100}cqw`), recomputed
  // together with widthPct/heightPct every time text/font/weight/style/
  // spacing/fontSizePx changes. This is what keeps the text visually the
  // same relative size in both the live canvas and the (differently
  // sized) PreviewModal card — same principle a fixed-px value can't give,
  // since widthPct/heightPct are themselves just percentages of whatever
  // container currently renders them.
  fontSizeRatio?: number;

  // shared transform — all in % of the print-area box, so it stays
  // consistent regardless of the canvas' current rendered pixel size
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation: number;
  zIndex: number;
}

export type ViewElements = Record<ViewName, DesignElement[]>;

export function emptyViewElements(): ViewElements {
  return {
    frente: [],
    reverso: [],
    izquierda: [],
    derecha: [],
    fundaHorizontal: [],
    fundaVertical: [],
    bolsa: [],
    ligaFrente: [],
    ligaReverso: [],
  };
}

// ---- Per-product real photography (scales to any product/color) ----

// GarmentColor USED TO BE a small closed union (blanco/negro/royal/...),
// hand-extended one product at a time every time a new product needed a
// color it didn't already have -- that stopped scaling once real
// products started needing dozens of distinct real color names each
// (confirmed live: 21 catalog products, several with 20+ real variant
// colors), and worse, it had a silent-data-loss bug: any variant whose
// color_name wasn't already one of the enum literals was simply invisible
// to the whole system -- e.g. Playera Vintage's "Azul Winkle" variant
// already had real photos uploaded via the admin (product_variants.views)
// that were being discarded on every request because "azul winkle" isn't
// one of the ~19 hardcoded literals.
//
// Now: GarmentColor is just the normalized (accent/case/whitespace
// -insensitive) form of whatever color a product's OWN variants/
// photography actually use (see normalizeGarmentColorName below) --
// there is no shared list to run out of or hand-maintain. Adding a new
// product, or a new color to an existing product, never requires
// touching this file again: resolveProductAssets.ts discovers colors by
// listing what's actually on disk (per-color subfolder names, or
// per-file B/N/color-word suffixes) and by reading that product's own
// Supabase variants -- see the comment above resolveProductViewAssets.
export type GarmentColor = string;

// A small, deliberately short "known common colors" list -- NOT the set
// of valid colors (there isn't one anymore), just a preferred display
// order for PersonalizerClient's multicolor variant-picker bar (see its
// sort there). Any color not in this list still works everywhere else;
// it just sorts alphabetically after these, instead of in a specific
// hand-picked position.
export const GARMENT_COLORS: GarmentColor[] = ["blanco", "negro", "royal", "marino", "rojo", "gris", "azul", "rosa"];

// Normalizes a real product_variants.color_name (Supabase — "Blanco",
// "Azul Winkle", "Sal Marina", "Paprika " [note: real rows sometimes have
// a trailing space], etc.) into the internal key used for asset
// resolution. Accent/case/whitespace-insensitive, same tolerance level as
// every other name-matcher in this feature (printAreas.ts,
// resolveProductAssets.ts). Returns null only for a blank/empty name —
// every real color name normalizes to a usable key now (see the
// GarmentColor comment above for why this used to reject most of them).
// Shared between the personalizer page (Server Component — resolves the
// color the customer already picked on the product page) and
// PersonalizerClient (falls back to it if no color was passed at all,
// e.g. an old bookmarked link).
export function normalizeGarmentColorName(colorName: string): GarmentColor | null {
  const key = colorName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return key.length > 0 ? key : null;
}

// Partial on purpose (not every product has every color for every view —
// most products only have real photos for 1-2 colors so far): a color
// simply absent from an object here means "no photo," exactly the same
// as an explicit null would (every consumer only ever does a truthy
// check), so resolveProductAssets.ts never needs to know the full set of
// colors up front just to pre-fill nulls for the ones it doesn't have.
export type ResolvedViewAsset = Partial<Record<GarmentColor, string | null>>;

export type ResolvedProductAssets = Record<ViewName, ResolvedViewAsset>;

export function emptyResolvedAssets(): ResolvedProductAssets {
  return {
    frente: {},
    reverso: {},
    izquierda: {},
    derecha: {},
    fundaHorizontal: {},
    fundaVertical: {},
    bolsa: {},
    ligaFrente: {},
    ligaReverso: {},
  };
}