"use client";

import { useState } from "react";
import type { DesignElement } from "./types";

// Paleta corta de colores de recoloreo -- atajos comunes de tinta/hilo,
// más el propio color picker nativo para cualquier otro. No es un
// catálogo real de Pantone/hilos (eso queda para cuando haya uno que
// enlazar), solo una selección rápida razonable.
const RECOLOR_PRESETS = ["#1a1a1a", "#ffffff", "#e53935", "#1e88e5", "#43a047", "#fdd835", "#fb8c00", "#8e24aa"];

function RotateIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 8.5A5.5 5.5 0 1 1 13.7 4.6" />
      <path d="M14 3.5v3.6h-3.6" />
    </svg>
  );
}

function FlipHorizontalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v14" strokeDasharray="2.2 2.2" />
      <path d="M6.5 6.5 4 8.5v3l2.5 2" />
      <path d="M13.5 6.5 16 8.5v3l-2.5 2" />
    </svg>
  );
}

function FlipVerticalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h14" strokeDasharray="2.2 2.2" />
      <path d="M6.5 6.5 8.5 4h3l2 2.5" />
      <path d="M6.5 13.5 8.5 16h3l2-2.5" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ui-gray">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ui-border accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            value={Math.round(value)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
            }}
            className="w-14 rounded-full border border-ui-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          />
          <span className="text-xs text-ui-gray">%</span>
        </div>
      </div>
    </div>
  );
}

export default function DesignOptionsPanel({
  element,
  onChange,
}: {
  element: DesignElement;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const opacity = element.opacity ?? 100;
  const brightness = element.brightness ?? 0;
  const contrast = element.contrast ?? 0;

  function resetAjustes() {
    onChange(element.id, { opacity: 100, brightness: 0, contrast: 0 });
  }

  return (
    <div className="w-[300px] space-y-5 rounded-2xl border border-ui-border bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
      {/* Rotar */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Rotar</p>
        <div className="flex items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ui-gray">Ángulo</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                value={Math.round(element.rotation)}
                onChange={(e) => onChange(element.id, { rotation: Number(e.target.value) })}
                className="w-16 rounded-full border border-ui-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-ui-gray">°</span>
            </span>
          </label>

          <label className="flex flex-col items-center gap-1">
            <span className="text-xs text-ui-gray">90°</span>
            <button
              type="button"
              onClick={() => onChange(element.id, { rotation: (Math.round(element.rotation) + 90) % 360 })}
              aria-label="Rotar 90 grados"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ui-border text-foreground transition-colors hover:border-primary hover:text-primary-dark"
            >
              <RotateIcon className="h-4 w-4" />
            </button>
          </label>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-ui-gray">Girar</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange(element.id, { flipH: !element.flipH })}
                aria-label="Espejo horizontal"
                aria-pressed={!!element.flipH}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                  element.flipH ? "border-primary bg-primary/10 text-primary-dark" : "border-ui-border text-foreground hover:border-primary"
                }`}
              >
                <FlipHorizontalIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(element.id, { flipV: !element.flipV })}
                aria-label="Espejo vertical"
                aria-pressed={!!element.flipV}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                  element.flipV ? "border-primary bg-primary/10 text-primary-dark" : "border-ui-border text-foreground hover:border-primary"
                }`}
              >
                <FlipVerticalIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-ui-border" />

      {/* Cambiar color */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Cambiar color</p>
        <button
          type="button"
          onClick={() => setColorPickerOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-full border border-ui-border px-4 py-2.5 text-xs text-foreground transition-colors hover:border-primary"
        >
          <span className="flex items-center gap-2">
            {element.recolor && (
              <span className="h-4 w-4 rounded-full border border-ui-border" style={{ backgroundColor: element.recolor }} />
            )}
            {element.recolor ? element.recolor.toUpperCase() : "Sin cambio de color"}
          </span>
          <ChevronDownIcon className={`h-3.5 w-3.5 text-ui-gray transition-transform ${colorPickerOpen ? "rotate-180" : ""}`} />
        </button>

        {colorPickerOpen && (
          <div className="mt-2 space-y-2.5 rounded-2xl border border-ui-border p-3">
            <button
              type="button"
              onClick={() => onChange(element.id, { recolor: null })}
              className={`w-full rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                !element.recolor ? "border-primary bg-primary/5 text-primary-dark" : "border-ui-border text-foreground hover:border-primary/50"
              }`}
            >
              Sin cambio de color
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {RECOLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange(element.id, { recolor: c })}
                  aria-label={`Recolorear a ${c}`}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    element.recolor?.toLowerCase() === c ? "border-primary" : "border-white ring-1 ring-ui-border"
                  }`}
                />
              ))}
              <label
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-ui-gray text-ui-gray"
                title="Color personalizado"
              >
                +
                <input
                  type="color"
                  value={element.recolor ?? "#1a1a1a"}
                  onChange={(e) => onChange(element.id, { recolor: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-ui-border" />

      {/* Ajustes */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Ajustes</p>
        <div className="space-y-4">
          <SliderRow label="Opacidad" value={opacity} min={0} max={100} onChange={(v) => onChange(element.id, { opacity: v })} />
          <SliderRow label="Brillo" value={brightness} min={-100} max={100} onChange={(v) => onChange(element.id, { brightness: v })} />
          <SliderRow label="Contraste" value={contrast} min={-100} max={100} onChange={(v) => onChange(element.id, { contrast: v })} />
        </div>
        <button
          type="button"
          onClick={resetAjustes}
          className="mt-4 w-full rounded-full border border-ui-border py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-dark"
        >
          Restablecer
        </button>
      </div>
    </div>
  );
}
