"use client";

import { useEffect, useState } from "react";

const TARGET = "ctc-panel";

type Box = { top: number; left: number; width: number; height: number; scale: number };

const initial: Box = { top: -139, left: 30, width: 998, height: 447, scale: 1.22 };

export default function AdjustPanel() {
  const [box, setBox] = useState<Box>(initial);

  useEffect(() => {
    const el = document.getElementById(TARGET);
    if (!el) return;
    el.style.top = `${box.top}px`;
    el.style.left = `${box.left}px`;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    el.style.transform = `scale(${box.scale})`;
    el.style.transformOrigin = "top left";
  }, [box]);

  function field(label: string, key: keyof Box, min: number, max: number, step = 1) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
          <span>{label}</span>
          <span>{box[key]}{key === "scale" ? "x" : "px"}</span>
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={box[key]}
          onChange={(e) => setBox((b) => ({ ...b, [key]: Number(e.target.value) }))}
          style={{ width: "100%" }}
        />
        <input
          type="number"
          step={step}
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
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Ajuste Rectángulo Contáctanos</div>
      {field("Top", "top", -400, 400)}
      {field("Left", "left", -200, 400)}
      {field("Width", "width", 400, 1400)}
      {field("Height", "height", 200, 900)}
      {field("Scale", "scale", 0.5, 2, 0.01)}
    </div>
  );
}