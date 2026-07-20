"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para la tarjeta "Lo que ofrecemos"
// (título + ícono y texto de cada una de las 3 filas). Eliminar este archivo
// y su uso en page.tsx cuando el usuario termine de ajustar.
type Box = { top: number; left: number; width: number; height: number };

const TARGETS = [
  "ofr-title",
  "ofr-icon-0",
  "ofr-text-0",
  "ofr-icon-1",
  "ofr-text-1",
  "ofr-icon-2",
  "ofr-text-2",
] as const;

const LABELS = [
  "Título",
  "Ícono 1 (Calidad)",
  "Texto 1 (Calidad)",
  "Ícono 2 (Satisfacción)",
  "Texto 2 (Satisfacción)",
  "Ícono 3 (Entrega)",
  "Texto 3 (Entrega)",
];

const INITIAL: Record<(typeof TARGETS)[number], Box> = {
  "ofr-title": { top: 41, left: 41, width: 598, height: 36 },
  "ofr-icon-0": { top: 109, left: 185, width: 64, height: 64 },
  "ofr-text-0": { top: 109, left: 265, width: 230, height: 51 },
  "ofr-icon-1": { top: 218, left: 185, width: 64, height: 64 },
  "ofr-text-1": { top: 218, left: 265, width: 230, height: 51 },
  "ofr-icon-2": { top: 327, left: 185, width: 64, height: 64 },
  "ofr-text-2": { top: 327, left: 265, width: 230, height: 51 },
};

export default function AdjustPanel() {
  const [boxes, setBoxes] = useState(INITIAL);

  useEffect(() => {
    TARGETS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const box = boxes[id];
      el.style.top = `${box.top}px`;
      el.style.left = `${box.left}px`;
      el.style.width = `${box.width}px`;
      el.style.height = `${box.height}px`;
    });
  }, [boxes]);

  function update(id: (typeof TARGETS)[number], field: keyof Box, value: number) {
    setBoxes((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] w-64 max-h-[90vh] overflow-y-auto rounded-lg border border-ui-border bg-white p-4 shadow-2xl">
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste &quot;Lo que ofrecemos&quot; (temporal)</p>
      {TARGETS.map((id, i) => (
        <div key={id} className="mb-4 border-b border-ui-border pb-3 last:border-0">
          <p className="mb-2 text-xs font-semibold text-primary">{LABELS[i]}</p>
          <div className="flex flex-col gap-2">
            {(["top", "left", "width", "height"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-xs text-ui-gray">
                <span className="flex items-center justify-between">
                  <span className="capitalize">{field}</span>
                  <span className="font-mono text-foreground">{boxes[id][field]}px</span>
                </span>
                <input
                  type="range"
                  min={field === "top" || field === "left" ? -300 : 0}
                  max={900}
                  value={boxes[id][field]}
                  onChange={(e) => update(id, field, Number(e.target.value))}
                />
                <input
                  type="number"
                  value={boxes[id][field]}
                  onChange={(e) => update(id, field, Number(e.target.value))}
                  className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}