export type ViewName = "frente" | "reverso" | "izquierda" | "derecha";

export const VIEW_ORDER: ViewName[] = ["frente", "reverso", "izquierda", "derecha"];

export const VIEW_LABELS: Record<ViewName, string> = {
  frente: "Frente",
  reverso: "Reverso",
  izquierda: "Izquierda",
  derecha: "Derecha",
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
  return { frente: [], reverso: [], izquierda: [], derecha: [] };
}

// ---- Per-product real photography (blanco/negro auto-switch) ----

export type GarmentColor = "blanco" | "negro";

export interface ResolvedViewAsset {
  blanco: string | null;
  negro: string | null;
}

export type ResolvedProductAssets = Record<ViewName, ResolvedViewAsset>;

export function emptyResolvedAssets(): ResolvedProductAssets {
  return {
    frente: { blanco: null, negro: null },
    reverso: { blanco: null, negro: null },
    izquierda: { blanco: null, negro: null },
    derecha: { blanco: null, negro: null },
  };
}