"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para las dos tarjetas de "Favoritos del momento".
// Eliminar este archivo y su uso en page.tsx cuando el usuario termine de ajustar.
type Box = { top: number; left: number; width: number; height: number };

const INITIAL: [Box, Box] = [
  { top: 0, left: 0, width: 288, height: 426 },
  { top: 0, left: 304, width: 288, height: 426 },
];

function getCard(index: number): HTMLElement | null {
  const heading = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent?.includes("Favoritos"));
  const grid = heading?.closest("div")?.querySelector(".grid");
  return (grid?.children[index] as HTMLElement) ?? null;
}

export default function AdjustPanel() {
  const [boxes, setBoxes] = useState<[Box, Box]>(INITIAL);

  useEffect(() => {
    boxes.forEach((box, i) => {
      const el = getCard(i);
      if (!el) return;
      el.style.top = `${box.top}px`;
      el.style.left = `${box.left}px`;
      el.style.width = `${box.width}px`;
      el.style.height = `${box.height}px`;
    });
  }, [boxes]);

  function update(cardIndex: 0 | 1, field: keyof Box, value: number) {
    setBoxes((prev) => {
      const next: [Box, Box] = [{ ...prev[0] }, { ...prev[1] }];
      next[cardIndex] = { ...next[cardIndex], [field]: value };
      return next;
    });
  }

  const cardLabels = ["Playera Over", "Sudadera Sand"];

  return (
    <div className="fixed top-4 right-4 z-[9999] w-64 max-h-[90vh] overflow-y-auto rounded-lg border border-ui-border bg-white p-4 shadow-2xl">
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste tarjetas (temporal)</p>
      {([0, 1] as const).map((cardIndex) => (
        <div key={cardIndex} className="mb-4 border-b border-ui-border pb-3 last:border-0">
          <p className="mb-2 text-xs font-semibold text-primary">{cardLabels[cardIndex]}</p>
          <div className="flex flex-col gap-2">
            {(["top", "left", "width", "height"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-xs text-ui-gray">
                <span className="flex items-center justify-between">
                  <span className="capitalize">{field}</span>
                  <span className="font-mono text-foreground">{boxes[cardIndex][field]}px</span>
                </span>
                <input
                  type="range"
                  min={field === "top" || field === "left" ? -300 : 0}
                  max={900}
                  value={boxes[cardIndex][field]}
                  onChange={(e) => update(cardIndex, field, Number(e.target.value))}
                />
                <input
                  type="number"
                  value={boxes[cardIndex][field]}
                  onChange={(e) => update(cardIndex, field, Number(e.target.value))}
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