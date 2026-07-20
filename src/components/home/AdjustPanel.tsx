"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para el rectángulo blanco "Lo que ofrecemos".
// Eliminar este archivo y su uso en page.tsx cuando el usuario termine de ajustar.
const TARGET_ID = "ofrecemos-box";

export default function AdjustPanel() {
  const [top, setTop] = useState(20);
  const [left, setLeft] = useState(570);
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(410);

  useEffect(() => {
    const el = document.getElementById(TARGET_ID);
    if (!el) return;
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
  }, [top, left, width, height]);

  const fields: [string, number, (v: number) => void][] = [
    ["top", top, setTop],
    ["left", left, setLeft],
    ["width", width, setWidth],
    ["height", height, setHeight],
  ];

  return (
    <div className="fixed top-4 right-4 z-[9999] w-56 rounded-lg border border-ui-border bg-white p-4 shadow-2xl">
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste rectángulo (temporal)</p>
      <div className="flex flex-col gap-3">
        {fields.map(([label, value, setter]) => (
          <label key={label} className="flex flex-col gap-1 text-xs text-ui-gray">
            <span className="flex items-center justify-between">
              <span className="capitalize">{label}</span>
              <span className="font-mono text-foreground">{value}px</span>
            </span>
            <input
              type="range"
              min={0}
              max={900}
              value={value}
              onChange={(e) => setter(Number(e.target.value))}
            />
            <input
              type="number"
              value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
            />
          </label>
        ))}
      </div>
    </div>
  );
}