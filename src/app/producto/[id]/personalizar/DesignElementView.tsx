"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Moveable from "react-moveable";
import type { DesignElement } from "./types";
import { resolveFontFamilyCss } from "./textFonts";
import { measureTextBoxPx } from "./measureText";

// Movement/resize/rotation are NOT clamped anywhere — the user has full
// freedom to place the design anywhere on the product. This only checks
// the element's actual on-screen bounding box (which already accounts for
// rotation) against the CANVAS itself (the full product photo, not a
// printable sub-zone) on every drag/resize/rotate frame, and reports that
// up via onInteraction so the parent can show a discreet "fuera de la
// superficie del producto" notice — informational only, never corrective.
function isWithinCanvas(target: HTMLElement, container: HTMLElement): boolean {
  const t = target.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const left = t.left - c.left;
  const top = t.top - c.top;
  const right = t.right - c.left;
  const bottom = t.bottom - c.top;
  return left >= -0.5 && top >= -0.5 && right <= c.width + 0.5 && bottom <= c.height + 0.5;
}

// Handles scale visually with the selected art's own rendered size — a
// tiny logo gets tiny handles, a large one gets slightly bigger (never
// huge) ones, clamped at both ends. This ONLY changes react-moveable's
// `zoom` prop, which scales the control-box overlay via a CSS transform —
// it never touches the target's real width/height/position (those stay
// driven purely by element.xPct/yPct/widthPct/heightPct, same as always),
// so this can't affect the print-area validation above, which reads the
// target's actual getBoundingClientRect() and has no notion of handles at
// all. Base handle sizes (zoom = 1) are set in globals.css under
// `.merchy-moveable .moveable-control`.
const HANDLE_MIN_ZOOM = 0.6;
const HANDLE_MAX_ZOOM = 1.6;
const HANDLE_ZOOM_MIN_REF_PX = 40; // art this small or smaller -> smallest handles
const HANDLE_ZOOM_MAX_REF_PX = 280; // art this large or larger -> largest handles

function computeHandleZoom(boxSizePx: number): number {
  if (!Number.isFinite(boxSizePx) || boxSizePx <= 0) return 1;
  const t = Math.min(1, Math.max(0, (boxSizePx - HANDLE_ZOOM_MIN_REF_PX) / (HANDLE_ZOOM_MAX_REF_PX - HANDLE_ZOOM_MIN_REF_PX)));
  return HANDLE_MIN_ZOOM + t * (HANDLE_MAX_ZOOM - HANDLE_MIN_ZOOM);
}

// Text sizing model: `fontSizePx` is the real, author-set "Tamaño" (what
// the toolbar input shows/edits and what a corner-drag scales) — but it is
// NEVER applied directly as a CSS font-size. Instead every place text is
// rendered (this file, PreviewModal's MiniView) uses `fontSizeRatio`
// (font-size as a fraction of the box's OWN rendered width, applied as
// `${ratio * 100}cqw`) so the same element looks the same *relative* size
// whether it's drawn in the live canvas or a much smaller PreviewModal
// card — both containers are just percentages of whatever pixel size they
// currently render at, and cqw automatically tracks that. `cqw` only
// resolves against an actual query container, which is why the wrapper
// below sets `containerType: "inline-size"` — without it cqw silently
// falls back to the viewport, not this element (confirmed empirically:
// every text element was rendering at a flat ~40px regardless of its box,
// because 4vw comfortably exceeds the old clamp's ceiling on any normal
// screen — this is the root cause the "bounding box too big" complaint
// was actually describing).
export const DEFAULT_FONT_SIZE_PX = 32;
export const FONT_SIZE_MIN_PX = 6;
export const FONT_SIZE_MAX_PX = 400;

function clampFontSizePx(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_FONT_SIZE_PX;
  return Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, px));
}

// Fallback only — used for a render before the auto-fit effect below has
// had a chance to compute the real ratio for this element (or for any
// legacy element saved without one). A tight text box's width is roughly
// 2-3x its font-size for a short phrase, so ~0.35 is a reasonable guess,
// visually close enough that the effect's near-instant correction (before
// paint) is imperceptible either way.
export const DEFAULT_FONT_SIZE_RATIO = 0.35;

export default function DesignElementView({
  element,
  containerRef,
  selected,
  onSelect,
  onChange,
  onInteraction,
}: {
  element: DesignElement;
  containerRef: React.RefObject<HTMLDivElement>;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
  onInteraction: (active: boolean, inBounds: boolean) => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);

  // react-moveable fires *Start immediately followed by *End with NO
  // intervening onDrag/onResize call when there's zero mouse movement — a
  // plain click on an already-selected element (e.g. the first click of a
  // double-click) is enough to trigger this. When that happens,
  // target.style.left/top/width/height are still whatever React's own
  // render last put there (percentage strings like "50.07%", from the
  // `left: ${element.xPct}%` style below) — not the pixel values onDrag/
  // onResize would normally have written. Reading those with parseFloat()
  // silently returns the *percentage number* as if it were a pixel count,
  // which pxToPct then re-divides by the container's pixel size — teleporting
  // the element toward the corner on nothing more than a stray click. These
  // flags track whether an actual onDrag/onResize happened so *End can skip
  // the position commit entirely when nothing really moved.
  const draggedRef = useRef(false);
  const resizedRef = useRef(false);

  // Captured at the start of a corner-drag on a TEXT element — resize for
  // text drives `fontSizePx` (scaled by how much the box grew/shrank),
  // never widthPct/heightPct directly; the auto-fit effect below then
  // re-measures at the new font size and sets the box to match exactly.
  // Logos/images are untouched — they keep the original direct pct-from-
  // drag behavior.
  const textResizeStartRef = useRef<{ fontSizePx: number; widthPx: number } | null>(null);

  // Text elements can be edited in place — double-click enters edit mode,
  // which swaps the static text display for a real <input> bound to the
  // same element.text the rest of the app already reads/writes (Capas
  // panel, PreviewModal, cart export). Nothing here is a second source of
  // truth: onChange still goes through the exact same DesignElement patch
  // path every other transform uses.
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(element.text ?? "");

  useLayoutEffect(() => {
    if (!editingText) return;
    setDraftText(element.text ?? "");
    const input = textInputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingText]);

  function commitText() {
    onChange(element.id, { text: draftText });
    setEditingText(false);
  }

  function cancelTextEdit() {
    setDraftText(element.text ?? "");
    setEditingText(false);
  }

  // Keeps the bounding box an exact fit around the text's real rendered
  // content — recomputed whenever anything that can change that content's
  // natural size changes (the text itself, font family, weight, style,
  // letter-spacing, or the authored font size). Runs as a layout effect
  // (before paint) so a freshly-created or freshly-edited text element
  // never flashes at the wrong size first. Recenters around the previous
  // center point so growing/shrinking content never makes the box jump.
  useLayoutEffect(() => {
    if (element.type !== "text") return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const fontSizePx = element.fontSizePx ?? DEFAULT_FONT_SIZE_PX;
    const measured = measureTextBoxPx({
      text: element.text ?? "",
      fontFamilyCss: resolveFontFamilyCss(element.fontFamily),
      fontSizePx,
      bold: element.bold,
      italic: element.italic,
      letterSpacing: element.letterSpacing,
    });

    const newWidthPct = (measured.widthPx / rect.width) * 100;
    const newHeightPct = (measured.heightPx / rect.height) * 100;
    const newFontSizeRatio = fontSizePx / measured.widthPx;

    const widthDiffPct = Math.abs(newWidthPct - element.widthPct);
    const heightDiffPct = Math.abs(newHeightPct - element.heightPct);
    const ratioDiff = Math.abs(newFontSizeRatio - (element.fontSizeRatio ?? 0));
    // Skip a no-op commit once already converged — otherwise this would
    // re-trigger itself every render (onChange -> new props -> effect
    // deps unchanged in value but effect still runs against the same
    // already-correct numbers).
    if (widthDiffPct < 0.02 && heightDiffPct < 0.02 && ratioDiff < 0.0005) return;

    const centerXPct = element.xPct + element.widthPct / 2;
    const centerYPct = element.yPct + element.heightPct / 2;

    onChange(element.id, {
      widthPct: newWidthPct,
      heightPct: newHeightPct,
      xPct: centerXPct - newWidthPct / 2,
      yPct: centerYPct - newHeightPct / 2,
      fontSizeRatio: newFontSizeRatio,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    element.type,
    element.text,
    element.fontFamily,
    element.fontSizePx,
    element.bold,
    element.italic,
    element.letterSpacing,
  ]);

  function pxToPct(left: number, top: number, width: number, height: number) {
    const container = containerRef.current;
    if (!container) return null;
    if (![left, top, width, height].every(Number.isFinite)) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      xPct: (left / rect.width) * 100,
      yPct: (top / rect.height) * 100,
      widthPct: (width / rect.width) * 100,
      heightPct: (height / rect.height) * 100,
    };
  }

  function reportBounds(target: HTMLElement) {
    const container = containerRef.current;
    if (!container) return;
    onInteraction(true, isWithinCanvas(target, container));
  }

  // Same check, but reports `active: false` — used on drag/resize/rotate
  // *End* so the notice's final state reflects where the art actually
  // landed, instead of always resetting to "safe" the instant the mouse is
  // released regardless of the real resting position.
  function reportBoundsEnd(target: HTMLElement) {
    const container = containerRef.current;
    if (!container) {
      onInteraction(false, true);
      return;
    }
    onInteraction(false, isWithinCanvas(target, container));
  }

  // Recomputed from the element's own current % size on every render — so
  // it updates the instant a resize/rotate commits, when a different art
  // gets selected, or when the view/product (and therefore the canvas'
  // rendered pixel size) changes. Uses the smaller of width/height so an
  // elongated design (a wide short banner, a tall narrow tag) still reads
  // by its narrowest dimension rather than its longest.
  const containerRect = containerRef.current?.getBoundingClientRect();
  const elementWidthPx = containerRect ? (element.widthPct / 100) * containerRect.width : 0;
  const elementHeightPx = containerRect ? (element.heightPct / 100) * containerRect.height : 0;
  const handleZoom = computeHandleZoom(Math.min(elementWidthPx, elementHeightPx));

  const textFontSize = `${(element.fontSizeRatio ?? DEFAULT_FONT_SIZE_RATIO) * 100}cqw`;
  const textFontFamilyCss = resolveFontFamilyCss(element.fontFamily);

  return (
    <>
      <div
        ref={targetRef}
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        onDoubleClick={(e) => {
          if (element.type !== "text") return;
          e.stopPropagation();
          onSelect(element.id);
          setEditingText(true);
        }}
        className={`absolute select-none transition-shadow duration-150 ${editingText ? "cursor-text" : "cursor-move"} ${
          selected ? "outline outline-2 outline-primary outline-offset-2" : ""
        }`}
        style={{
          left: `${element.xPct}%`,
          top: `${element.yPct}%`,
          width: `${element.widthPct}%`,
          height: `${element.heightPct}%`,
          transform: `rotate(${element.rotation}deg)`,
          zIndex: element.zIndex,
          containerType: "inline-size",
        }}
      >
        {element.type === "logo" ? (
          element.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={element.src}
              alt={element.fileName ?? "logo"}
              className="h-full w-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-400 bg-white/85 p-1 text-center pointer-events-none">
              <span className="text-[9px] font-semibold uppercase text-ui-gray">.AI</span>
              <span className="truncate text-[8px] text-ui-gray leading-tight">{element.fileName}</span>
            </div>
          )
        ) : editingText ? (
          <input
            ref={textInputRef}
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelTextEdit();
              }
            }}
            className="h-full w-full border-none bg-transparent p-0 outline-none"
            style={{
              fontFamily: textFontFamilyCss,
              color: element.color || "#1a1a1a",
              fontWeight: element.bold ? 700 : 400,
              fontStyle: element.italic ? "italic" : "normal",
              letterSpacing: `${element.letterSpacing ?? 0}px`,
              textAlign: element.align || "left",
              fontSize: textFontSize,
            }}
          />
        ) : (
          <div
            ref={textDisplayRef}
            className="flex h-full w-full items-center overflow-hidden whitespace-nowrap pointer-events-none"
            style={{
              fontFamily: textFontFamilyCss,
              color: element.color || "#1a1a1a",
              fontWeight: element.bold ? 700 : 400,
              fontStyle: element.italic ? "italic" : "normal",
              letterSpacing: `${element.letterSpacing ?? 0}px`,
              justifyContent:
                element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
              fontSize: textFontSize,
            }}
          >
            {element.text}
          </div>
        )}
      </div>

      {selected && !editingText && (
        <Moveable
          target={targetRef}
          draggable
          resizable
          rotatable
          // Corner handles must always scale proportionally (never distort),
          // for every element type — text included, not just logos. This is
          // react-moveable's own existing keepRatio mechanism (already used
          // for logos since the first build), just no longer gated to one
          // type — reusing it, not building a second scaling system.
          keepRatio
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={0}
          snappable
          snapCenter
          className="merchy-moveable"
          zoom={handleZoom}
          onDragStart={({ target }) => {
            draggedRef.current = false;
            reportBounds(target as HTMLElement);
          }}
          onDrag={({ target, left, top }) => {
            draggedRef.current = true;
            (target as HTMLElement).style.left = `${left}px`;
            (target as HTMLElement).style.top = `${top}px`;
            reportBounds(target as HTMLElement);
          }}
          onDragEnd={({ target }) => {
            const el = target as HTMLElement;
            if (draggedRef.current) {
              const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
              if (pct) onChange(element.id, { xPct: pct.xPct, yPct: pct.yPct });
            }
            reportBoundsEnd(el);
          }}
          onResizeStart={({ target }) => {
            resizedRef.current = false;
            if (element.type === "text") {
              textResizeStartRef.current = {
                fontSizePx: element.fontSizePx ?? DEFAULT_FONT_SIZE_PX,
                widthPx: (target as HTMLElement).offsetWidth,
              };
            }
            reportBounds(target as HTMLElement);
          }}
          onResize={({ target, width, height, drag }) => {
            resizedRef.current = true;
            const el = target as HTMLElement;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.left = `${drag.left}px`;
            el.style.top = `${drag.top}px`;
            // Text: live-preview the actual font size growing/shrinking
            // during the drag (imperative, same pattern as left/top above)
            // — the real fontSizePx only commits on release, which then
            // triggers the auto-fit effect to re-measure and snap the box
            // to the exact content size at that new size.
            const start = textResizeStartRef.current;
            if (element.type === "text" && start && start.widthPx > 0 && textDisplayRef.current) {
              const scale = width / start.widthPx;
              textDisplayRef.current.style.fontSize = `${clampFontSizePx(start.fontSizePx * scale)}px`;
            }
            reportBounds(el);
          }}
          onResizeEnd={({ target }) => {
            const el = target as HTMLElement;
            const start = textResizeStartRef.current;
            if (element.type === "text" && start && resizedRef.current) {
              const scale = start.widthPx > 0 ? el.offsetWidth / start.widthPx : 1;
              onChange(element.id, { fontSizePx: clampFontSizePx(start.fontSizePx * scale) });
            } else if (resizedRef.current) {
              const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
              if (pct) onChange(element.id, pct);
            }
            textResizeStartRef.current = null;
            reportBoundsEnd(el);
          }}
          onRotateStart={({ target }) => reportBounds(target as HTMLElement)}
          onRotate={({ target, rotate }) => {
            (target as HTMLElement).style.transform = `rotate(${rotate}deg)`;
            reportBounds(target as HTMLElement);
          }}
          onRotateEnd={({ target }) => {
            const el = target as HTMLElement;
            const match = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform);
            onChange(element.id, { rotation: match ? parseFloat(match[1]) : element.rotation });
            reportBoundsEnd(el);
          }}
        />
      )}
    </>
  );
}