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

  // text-only
  text?: string;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  letterSpacing?: number;

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