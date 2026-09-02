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

// ---- Per-product real photography (blanco/negro + per-product extra colors) ----

// "blanco"/"negro" are resolved generically for EVERY product (see
// resolveProductAssets.ts's flat-file scan). "royal"/"marino"/"rojo"/
// "gris" are currently only ever resolved for Sudadera Ocean
// specifically (see that same file's Sudadera-Ocean-only subfolder
// scan); "azul"/"rosa" were added for Tapete Century (its real variant
// colors — see detectColor in resolveProductAssets.ts, which needed its
// own explicit AZUL/ROSA check the same way it already had BLANCO/NEGRO,
// since neither is inferred automatically). For every other product any
// of these simply stay null, same as blanco/negro would if that product
// had no matching photos. Widening this type does not change behavior
// for any other product: GarmentColor is only ever the color the
// customer already picked on the product page (see
// normalizeGarmentColorName below) — there is no selector inside the
// Personalizador itself.
export type GarmentColor = "blanco" | "negro" | "royal" | "marino" | "rojo" | "gris" | "azul" | "rosa";

export const GARMENT_COLORS: GarmentColor[] = ["blanco", "negro", "royal", "marino", "rojo", "gris", "azul", "rosa"];

// Maps a real product_variants.color_name (Supabase — "Blanco", "Negro",
// "Royal", "Marino", "Rojo " [note: has a trailing space in the real row],
// "Gris") to the internal GarmentColor key used for asset resolution.
// Accent/case/whitespace-insensitive, same tolerance level as every other
// name-matcher in this feature (printAreas.ts, resolveProductAssets.ts).
// Returns null for a variant color this product's photography doesn't
// have a GarmentColor slot for. Shared between the personalizer page
// (Server Component — resolves the color the customer already picked on
// the product page) and PersonalizerClient (falls back to it if no color
// was passed at all, e.g. an old bookmarked link).
export function normalizeGarmentColorName(colorName: string): GarmentColor | null {
  const key = colorName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return (GARMENT_COLORS as string[]).includes(key) ? (key as GarmentColor) : null;
}

export type ResolvedViewAsset = Record<GarmentColor, string | null>;

export type ResolvedProductAssets = Record<ViewName, ResolvedViewAsset>;

function emptyResolvedViewAsset(): ResolvedViewAsset {
  return { blanco: null, negro: null, royal: null, marino: null, rojo: null, gris: null, azul: null, rosa: null };
}

export function emptyResolvedAssets(): ResolvedProductAssets {
  return {
    frente: emptyResolvedViewAsset(),
    reverso: emptyResolvedViewAsset(),
    izquierda: emptyResolvedViewAsset(),
    derecha: emptyResolvedViewAsset(),
    fundaHorizontal: emptyResolvedViewAsset(),
    fundaVertical: emptyResolvedViewAsset(),
    bolsa: emptyResolvedViewAsset(),
    ligaFrente: emptyResolvedViewAsset(),
    ligaReverso: emptyResolvedViewAsset(),
  };
}