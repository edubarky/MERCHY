"use client";

import type { PrintAreaRectPx } from "./DesignElementView";
import type { PrintAreaConfig } from "./printAreas";

// Professional-design-tool style guide: thin corner brackets only (no
// filled rectangle, no thick border), Merchy turquoise when the design is
// within the printable zone, alert coral when it isn't. Shown only while
// the user is actively adding/dragging/resizing/rotating something (see
// PersonalizerClient) — never as a permanent overlay.
const BRACKET = 14;
const STROKE = 1.5;

export default function PrintAreaGuide({
  rectPx,
  config,
  inBounds,
}: {
  rectPx: PrintAreaRectPx;
  config: PrintAreaConfig;
  inBounds: boolean;
}) {
  const w = rectPx.right - rectPx.left;
  const h = rectPx.bottom - rectPx.top;
  if (w <= 0 || h <= 0) return null;

  const colorClass = inBounds ? "text-primary" : "text-accent-coral";
  const dimensionLabel =
    config.widthCm && config.heightCm ? `${config.widthCm} × ${config.heightCm} cm` : null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute transition-opacity duration-200 ease-out"
      style={{ left: rectPx.left, top: rectPx.top, width: w, height: h }}
    >
      <div className={`absolute left-1/2 -top-6 -translate-x-1/2 whitespace-nowrap text-center transition-colors duration-200 ${colorClass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
          {inBounds ? "Área de diseño" : "Fuera del área de impresión"}
        </p>
        {inBounds && dimensionLabel && <p className="text-[9px] font-medium opacity-70">{dimensionLabel}</p>}
      </div>

      <svg
        className={`absolute inset-0 h-full w-full transition-colors duration-200 ${colorClass}`}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={`M0,${BRACKET} L0,0 L${BRACKET},0`} stroke="currentColor" strokeWidth={STROKE} vectorEffect="non-scaling-stroke" />
        <path d={`M${w - BRACKET},0 L${w},0 L${w},${BRACKET}`} stroke="currentColor" strokeWidth={STROKE} vectorEffect="non-scaling-stroke" />
        <path d={`M${w},${h - BRACKET} L${w},${h} L${w - BRACKET},${h}`} stroke="currentColor" strokeWidth={STROKE} vectorEffect="non-scaling-stroke" />
        <path d={`M${BRACKET},${h} L0,${h} L0,${h - BRACKET}`} stroke="currentColor" strokeWidth={STROKE} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}