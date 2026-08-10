"use client";

import { useRef } from "react";
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

  function pxToPct(left: number, top: number, width: number, height: number) {
    const container = containerRef.current;
    if (!container) return null;
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
        className={`absolute cursor-move select-none transition-shadow duration-150 ${
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

      {selected && (
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
          onDragStart={({ target }) => reportBounds(target as HTMLElement)}
          onDrag={({ target, left, top }) => {
            (target as HTMLElement).style.left = `${left}px`;
            (target as HTMLElement).style.top = `${top}px`;
            reportBounds(target as HTMLElement);
          }}
          onDragEnd={({ target }) => {
            const el = target as HTMLElement;
            const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
            if (pct) onChange(element.id, { xPct: pct.xPct, yPct: pct.yPct });
            onInteraction(false, true);
          }}
          onResizeStart={({ target }) => reportBounds(target as HTMLElement)}
          onResize={({ target, width, height, drag }) => {
            const el = target as HTMLElement;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.left = `${drag.left}px`;
            el.style.top = `${drag.top}px`;
            reportBounds(el);
          }}
          onResizeEnd={({ target }) => {
            const el = target as HTMLElement;
            const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
            if (pct) onChange(element.id, pct);
            onInteraction(false, true);
          }}
          onRotateStart={({ target }) => reportBounds(target as HTMLElement)}
          onRotate={({ target, rotate }) => {
            (target as HTMLElement).style.transform = `rotate(${rotate}deg)`;
            reportBounds(target as HTMLElement);
          }}
          onRotateEnd={({ target }) => {
            const match = /rotate\(([-\d.]+)deg\)/.exec((target as HTMLElement).style.transform);
            onChange(element.id, { rotation: match ? parseFloat(match[1]) : element.rotation });
            onInteraction(false, true);
          }}
        />
      )}
    </>
  );
}