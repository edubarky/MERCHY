// Measures the real, natural pixel size a single line of text occupies for
// a given font/size/weight/style/letter-spacing combination — the source
// of truth for making a text element's bounding box match its actual
// content instead of an arbitrary fixed rectangle. Uses one shared hidden
// <span> (off-screen, not display:none — display:none elements report
// zero size) rather than <canvas>.measureText, because a real DOM element
// picks up letter-spacing/font-weight/font-style exactly the same way the
// visible element itself renders them — no separate approximation logic
// to keep in sync.
let measureEl: HTMLSpanElement | null = null;

function getMeasureEl(): HTMLSpanElement {
  if (measureEl) return measureEl;
  const el = document.createElement("span");
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  el.style.visibility = "hidden";
  el.style.whiteSpace = "pre";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);
  measureEl = el;
  return el;
}

export interface MeasureTextOptions {
  text: string;
  fontFamilyCss: string;
  fontSizePx: number;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number;
}

export interface MeasuredTextBox {
  widthPx: number;
  heightPx: number;
}

/** Client-side only (reads/writes the DOM) — always called from inside a
 * "use client" component's effect, never during SSR. */
export function measureTextBoxPx({
  text,
  fontFamilyCss,
  fontSizePx,
  bold,
  italic,
  letterSpacing,
}: MeasureTextOptions): MeasuredTextBox {
  const el = getMeasureEl();
  el.style.fontFamily = fontFamilyCss;
  el.style.fontSize = `${fontSizePx}px`;
  el.style.fontWeight = bold ? "700" : "400";
  el.style.fontStyle = italic ? "italic" : "normal";
  el.style.letterSpacing = `${letterSpacing ?? 0}px`;
  // An empty/whitespace-only string collapses to near-zero width in most
  // browsers — fall back to a single space so the box never vanishes
  // while the user has cleared the field mid-edit.
  el.textContent = text && text.trim().length > 0 ? text : " ";
  const rect = el.getBoundingClientRect();
  return {
    widthPx: Math.max(rect.width, 2),
    heightPx: Math.max(rect.height, fontSizePx * 0.8),
  };
}