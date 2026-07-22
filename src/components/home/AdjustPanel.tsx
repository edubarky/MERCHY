"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para la sección "Contáctanos": un único
// control que escala TODO (rectángulo + contenido) proporcionalmente,
// más posición (top/left). Eliminar este archivo y su uso en page.tsx
// cuando el usuario termine de ajustar.
const TARGET_ID = "ctc-panel";

export default function AdjustPanel() {
  const [top, setTop] = useState(-75);
  const [left, setLeft] = useState(125);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = document.getElementById(TARGET_ID);
    if (!el) return;
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = "top left";
  }, [top, left, scale]);

  return (
    <div className="fixed top-4 right-4 z-[9999] w-64 rounded-lg border border-ui-border bg-white p-4 shadow-2xl">
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste Contáctanos (temporal)</p>
      <p className="mb-2 text-xs font-semibold text-primary">Todo (rectángulo + contenido)</p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ui-gray">
          <span className="flex items-center justify-between">
            <span>Top</span>
            <span className="font-mono text-foreground">{top}px</span>
          </span>
          <input type="range" min={-300} max={900} value={top} onChange={(e) => setTop(Number(e.target.value))} />
          <input
            type="number"
            value={top}
            onChange={(e) => setTop(Number(e.target.value))}
            className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ui-gray">
          <span className="flex items-center justify-between">
            <span>Left</span>
            <span className="font-mono text-foreground">{left}px</span>
          </span>
          <input type="range" min={-300} max={900} value={left} onChange={(e) => setLeft(Number(e.target.value))} />
          <input
            type="number"
            value={left}
            onChange={(e) => setLeft(Number(e.target.value))}
            className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ui-gray">
          <span className="flex items-center justify-between">
            <span>Escala</span>
            <span className="font-mono text-foreground">{scale.toFixed(2)}x</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <input
            type="number"
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
          />
        </label>
      </div>
    </div>
  );
}