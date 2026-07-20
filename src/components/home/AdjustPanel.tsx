"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para el contenido interno de la tarjeta "Experiencia"
// (ícono, título, párrafo y botón). Eliminar este archivo y su uso en page.tsx cuando
// el usuario termine de ajustar.
type Box = { top: number; left: number; width: number; height: number };

const TARGETS = ["exp-icon", "exp-heading", "exp-paragraph", "exp-button"] as const;
const LABELS = ["Ícono", "Título", "Párrafo", "Botón"];

const INITIAL: Record<(typeof TARGETS)[number], Box> = {
  "exp-icon": { top: 17, left: 58, width: 59, height: 59 },
  "exp-heading": { top: 88, left: 142, width: 438, height: 102 },
  "exp-paragraph": { top: 226, left: 146, width: 430, height: 57 },
  "exp-button": { top: 332, left: 146, width: 208, height: 34 },
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
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste contenido interno (temporal)</p>
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