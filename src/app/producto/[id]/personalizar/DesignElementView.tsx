"use client";

import { useEffect, useRef, useState } from "react";
import Moveable from "react-moveable";
import type { DesignElement } from "./types";

export interface PrintAreaRectPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Movement is intentionally NOT hard-clamped to the print area anymore —
// the user can drag/resize/rotate freely across the whole canvas. Instead
// this checks the element's actual on-screen bounding box (which already
// accounts for any rotation) against the print-area rect on every
// drag/resize/rotate frame, and reports that up via onInteraction so the
// parent can drive the HUD guide + "fuera del área de impresión" warning.
function isWithinPrintArea(target: HTMLElement, container: HTMLElement, rect: PrintAreaRectPx | null): boolean {
  if (!rect) return true;
  const t = target.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const left = t.left - c.left;
  const top = t.top - c.top;
  const right = t.right - c.left;
  const bottom = t.bottom - c.top;
  return left >= rect.left - 0.5 && top >= rect.top - 0.5 && right <= rect.right + 0.5 && bottom <= rect.bottom + 0.5;
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

export default function DesignElementView({
  element,
  containerRef,
  printAreaRectPx,
  selected,
  onSelect,
  onChange,
  onInteraction,
}: {
  element: DesignElement;
  containerRef: React.RefObject<HTMLDivElement>;
  printAreaRectPx: PrintAreaRectPx | null;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
  onInteraction: (active: boolean, inBounds: boolean) => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

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

  // Text elements can be edited in place — double-click enters edit mode,
  // which swaps the static text display for a real <input> bound to the
  // same element.text the rest of the app already reads/writes (Capas
  // panel, PreviewModal, cart export). Nothing here is a second source of
  // truth: onChange still goes through the exact same DesignElement patch
  // path every other transform uses.
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(element.text ?? "");

  useEffect(() => {
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
    onInteraction(true, isWithinPrintArea(target, container, printAreaRectPx));
  }

  // Same check, but reports `active: false` — used on drag/resize/rotate
  // *End* so the guide's final color reflects where the art actually
  // landed, instead of always resetting to "safe" the instant the mouse is
  // released regardless of the real resting position.
  function reportBoundsEnd(target: HTMLElement) {
    const container = containerRef.current;
    if (!container) {
      onInteraction(false, true);
      return;
    }
    onInteraction(false, isWithinPrintArea(target, container, printAreaRectPx));
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
              fontFamily: element.fontFamily || "var(--font-dm-sans), sans-serif",
              color: element.color || "#1a1a1a",
              fontWeight: element.bold ? 700 : 400,
              fontStyle: element.italic ? "italic" : "normal",
              letterSpacing: `${element.letterSpacing ?? 0}px`,
              textAlign: element.align || "left",
              fontSize: "clamp(10px, 4cqw, 40px)",
            }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center overflow-hidden whitespace-nowrap pointer-events-none"
            style={{
              fontFamily: element.fontFamily || "var(--font-dm-sans), sans-serif",
              color: element.color || "#1a1a1a",
              fontWeight: element.bold ? 700 : 400,
              fontStyle: element.italic ? "italic" : "normal",
              letterSpacing: `${element.letterSpacing ?? 0}px`,
              justifyContent:
                element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
              fontSize: "clamp(10px, 4cqw, 40px)",
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
          keepRatio={element.type === "logo"}
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
            reportBounds(target as HTMLElement);
          }}
          onResize={({ target, width, height, drag }) => {
            resizedRef.current = true;
            const el = target as HTMLElement;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.left = `${drag.left}px`;
            el.style.top = `${drag.top}px`;
            reportBounds(el);
          }}
          onResizeEnd={({ target }) => {
            const el = target as HTMLElement;
            if (resizedRef.current) {
              const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
              if (pct) onChange(element.id, pct);
            }
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