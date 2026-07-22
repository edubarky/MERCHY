"use client";

import { useEffect, useState } from "react";

// Panel temporal de ajuste visual para terminar de calibrar Contáctanos:
// 1) qué tanto espacio queda antes del Footer (altura del contenedor que
//    reserva espacio para la tarjeta, que está position:absolute), y
// 2) qué tanto se acerca la tarjeta al borde izquierdo (breakout, igual
//    que la tarjeta "Experiencia" de arriba). Eliminar este archivo y su
//    uso en page.tsx cuando el usuario termine de ajustar.
const WRAPPER_ID = "ctc-wrapper";
const PANEL_ID = "ctc-panel";

export default function AdjustPanel() {
  const [wrapperHeight, setWrapperHeight] = useState(500);
  const [panelLeft, setPanelLeft] = useState(30);

  useEffect(() => {
    const wrapper = document.getElementById(WRAPPER_ID);
    if (wrapper) wrapper.style.minHeight = `${wrapperHeight}px`;
  }, [wrapperHeight]);

  useEffect(() => {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.left = `${panelLeft}px`;
  }, [panelLeft]);

  return (
    <div className="fixed top-4 right-4 z-[9999] w-64 rounded-lg border border-ui-border bg-white p-4 shadow-2xl">
      <p className="mb-3 text-xs font-bold text-foreground">Ajuste Contáctanos (temporal)</p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ui-gray">
          <span className="flex items-center justify-between">
            <span>Altura del contenedor (espacio antes del Footer)</span>
            <span className="font-mono text-foreground">{wrapperHeight}px</span>
          </span>
          <input type="range" min={300} max={560} value={wrapperHeight} onChange={(e) => setWrapperHeight(Number(e.target.value))} />
          <input
            type="number"
            value={wrapperHeight}
            onChange={(e) => setWrapperHeight(Number(e.target.value))}
            className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ui-gray">
          <span className="flex items-center justify-between">
            <span>Left (acercar al borde izquierdo)</span>
            <span className="font-mono text-foreground">{panelLeft}px</span>
          </span>
          <input type="range" min={-300} max={300} value={panelLeft} onChange={(e) => setPanelLeft(Number(e.target.value))} />
          <input
            type="number"
            value={panelLeft}
            onChange={(e) => setPanelLeft(Number(e.target.value))}
            className="rounded border border-ui-border px-2 py-1 text-xs text-foreground"
          />
        </label>
      </div>
    </div>
  );
}
