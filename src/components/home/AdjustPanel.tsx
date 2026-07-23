"use client";

import { useEffect, useState } from "react";

const TARGET = "ftr-bg-rect";

type Box = { top: number; left: number; width: number; height: number };

const initial: Box = { top: 0, left: 0, width: 1400, height: 700 };

export default function AdjustPanel() {
  const [box, setBox] = useState<Box>(initial);
  const [measured, setMeasured] = useState(false);
  const [preview, setPreview] = useState(false);

  // Al montar, mide el ancho real (actualmente w-full/responsive) para que el
  // panel arranque mostrando el valor exacto que ya se ve en pantalla.
  useEffect(() => {
    const el = document.getElementById(TARGET);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBox((b) => ({ ...b, width: Math.round(rect.width) }));
    setMeasured(true);
  }, []);

  useEffect(() => {
    if (!measured) return;
    const el = document.getElementById(TARGET);
    if (!el) return;
    el.style.top = `${box.top}px`;
    el.style.left = `${box.left}px`;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
  }, [box, measured]);

  // Modo vista previa: sube el rectángulo temporalmente encima de todo para
  // verlo completo mientras se ajusta. Al desactivarlo vuelve a su capa real
  // (detrás de todo el contenido).
  useEffect(() => {
    const el = document.getElementById(TARGET);
    if (!el) return;
    el.style.zIndex = preview ? "99998" : "0";
    el.style.outline = preview ? "2px dashed #3b82f6" : "none";
  }, [preview]);

  function field(label: string, key: keyof Box, min: number, max: number) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
          <span>{label}</span>
          <span>{box[key]}px</span>
        </label>
        <input
          type="range"
          min={min}
          max={max}
          value={box[key]}
          onChange={(e) => setBox((b) => ({ ...b, [key]: Number(e.target.value) }))}
          style={{ width: "100%" }}
        />
        <input
          type="number"
          value={box[key]}
          onChange={(e) => setBox((b) => ({ ...b, [key]: Number(e.target.value) }))}
          style={{ width: "100%", marginTop: 2, fontSize: 12 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 99999,
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        width: 240,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Ajuste Fondo Footer</div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        Ver rectángulo completo (temporal)
      </label>
      {field("Top", "top", -2000, 800)}
      {field("Left", "left", -200, 400)}
      {field("Width", "width", 400, 2200)}
      {field("Height", "height", 0, 1400)}
    </div>
  );
}