"use client";

import { useRef } from "react";
import Moveable from "react-moveable";
import type { DesignElement } from "./types";

interface PrintAreaPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export default function DesignElementView({
  element,
  containerRef,
  printAreaPx,
  selected,
  onSelect,
  onChange,
}: {
  element: DesignElement;
  containerRef: React.RefObject<HTMLDivElement>;
  printAreaPx: PrintAreaPx | null;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
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
          bounds={printAreaPx ? { ...printAreaPx, position: "css" } : undefined}
          onDrag={({ target, left, top }) => {
            (target as HTMLElement).style.left = `${left}px`;
            (target as HTMLElement).style.top = `${top}px`;
          }}
          onDragEnd={({ target }) => {
            const el = target as HTMLElement;
            const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
            if (pct) onChange(element.id, { xPct: pct.xPct, yPct: pct.yPct });
          }}
          onResize={({ target, width, height, drag }) => {
            const el = target as HTMLElement;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.left = `${drag.left}px`;
            el.style.top = `${drag.top}px`;
          }}
          onResizeEnd={({ target }) => {
            const el = target as HTMLElement;
            const pct = pxToPct(parseFloat(el.style.left), parseFloat(el.style.top), el.offsetWidth, el.offsetHeight);
            if (pct) onChange(element.id, pct);
          }}
          onRotate={({ target, rotate }) => {
            (target as HTMLElement).style.transform = `rotate(${rotate}deg)`;
          }}
          onRotateEnd={({ target }) => {
            const match = /rotate\(([-\d.]+)deg\)/.exec((target as HTMLElement).style.transform);
            onChange(element.id, { rotation: match ? parseFloat(match[1]) : element.rotation });
          }}
        />
      )}
    </>
  );
}