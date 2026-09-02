"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignElement } from "./types";
import { TEXT_FONT_CATEGORIES, DEFAULT_TEXT_FONT_LABEL } from "./textFonts";
import { DEFAULT_FONT_SIZE_PX, FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX } from "./DesignElementView";
import DesignOptionsPanel from "./DesignOptionsPanel";

// Common quick-pick sizes shown as a native suggestion dropdown — the
// input still accepts any value in between via free typing, this is not
// an exhaustive/enforced list.
const FONT_SIZE_PRESETS = [12, 16, 20, 24, 32, 40, 48, 60, 72, 96, 120];

function OptionsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h8M14.5 5.5h1.5" />
      <path d="M4 10h1.5M9 10h7" />
      <path d="M4 14.5h8M14.5 14.5h1.5" />
      <circle cx="12" cy="5.5" r="1.7" />
      <circle cx="7" cy="10" r="1.7" />
      <circle cx="12" cy="14.5" r="1.7" />
    </svg>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-all duration-150 ease-out hover:scale-110 hover:bg-teal-light"
    >
      {children}
    </button>
  );
}

export default function SelectionToolbar({
  element,
  onChange,
  onDuplicate,
  onDelete,
  onBringFront,
  onSendBack,
}: {
  element: DesignElement;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
}) {
  // "Opciones de diseño" -- pedido explícito (rotar por ángulo/90°/espejo,
  // cambiar color, opacidad/brillo/contraste). Solo tiene sentido para un
  // logo (imagen) -- el texto ya tiene su propio color/tamaño/negrita/
  // cursiva aquí mismo, y flip/recolor/filtros de imagen no aplican a
  // texto renderizado como texto real.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) setOptionsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [optionsOpen]);

  // Cerrado automáticamente al cambiar de elemento seleccionado (o
  // deseleccionar) -- nunca debe quedar abierto mostrando los controles
  // de un elemento que ya no es el activo.
  useEffect(() => {
    setOptionsOpen(false);
  }, [element.id]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ui-border bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      {element.type === "text" && (
        <>
          <span className="hidden text-[10px] text-ui-gray sm:inline">Doble clic en el texto para editarlo</span>

          <select
            value={element.fontFamily || DEFAULT_TEXT_FONT_LABEL}
            onChange={(e) => onChange(element.id, { fontFamily: e.target.value })}
            className="max-w-[140px] rounded-full border border-ui-border bg-white px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            {TEXT_FONT_CATEGORIES.map((category) => (
              <optgroup key={category.name} label={category.name}>
                {category.fonts.map((f) => (
                  <option key={f.label} value={f.label}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <input
            type="color"
            value={element.color || "#1a1a1a"}
            onChange={(e) => onChange(element.id, { color: e.target.value })}
            title="Color"
            className="h-7 w-7 cursor-pointer rounded-full border border-ui-border p-0.5"
          />

          <label className="flex items-center gap-1 text-[10px] text-ui-gray">
            Tamaño
            <input
              type="number"
              list="text-size-presets"
              min={FONT_SIZE_MIN_PX}
              max={FONT_SIZE_MAX_PX}
              value={Math.round(element.fontSizePx ?? DEFAULT_FONT_SIZE_PX)}
              onChange={(e) => {
                const next = Number(e.target.value);
                onChange(element.id, { fontSizePx: Number.isFinite(next) ? next : element.fontSizePx });
              }}
              className="w-16 rounded-full border border-ui-border px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
            <datalist id="text-size-presets">
              {FONT_SIZE_PRESETS.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>
          </label>

          <ToolbarIconButton label="Negrita" onClick={() => onChange(element.id, { bold: !element.bold })}>
            <span className={`text-sm ${element.bold ? "font-bold text-primary" : "font-bold text-ui-gray"}`}>B</span>
          </ToolbarIconButton>

          <ToolbarIconButton label="Cursiva" onClick={() => onChange(element.id, { italic: !element.italic })}>
            <span className={`text-sm italic ${element.italic ? "text-primary" : "text-ui-gray"}`}>I</span>
          </ToolbarIconButton>

          {(["left", "center", "right"] as const).map((align) => (
            <ToolbarIconButton
              key={align}
              label={`Alinear ${align}`}
              onClick={() => onChange(element.id, { align })}
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-4 w-4 ${element.align === align ? "text-primary" : "text-ui-gray"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
              >
                {align === "left" && <path d="M2 4h12M2 8h8M2 12h10" />}
                {align === "center" && <path d="M2 4h12M4 8h8M3 12h10" />}
                {align === "right" && <path d="M2 4h12M6 8h8M4 12h10" />}
              </svg>
            </ToolbarIconButton>
          ))}
        </>
      )}

      <label className="flex items-center gap-1 text-[10px] text-ui-gray">
        Rotación
        <input
          type="number"
          value={Math.round(element.rotation)}
          onChange={(e) => onChange(element.id, { rotation: Number(e.target.value) })}
          className="w-14 rounded-full border border-ui-border px-2 py-1 text-xs focus:outline-none focus:border-primary"
        />
      </label>

      {element.type === "logo" && (
        <div ref={optionsRef} className="relative">
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-expanded={optionsOpen}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              optionsOpen ? "border-primary bg-primary/10 text-primary-dark" : "border-ui-border text-foreground hover:border-primary"
            }`}
          >
            <OptionsIcon className="h-4 w-4" />
            Opciones de diseño
          </button>
          {optionsOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-[100]">
              <DesignOptionsPanel element={element} onChange={onChange} />
            </div>
          )}
        </div>
      )}

      <div className="mx-1 h-6 w-px bg-ui-border" />

      <ToolbarIconButton label="Duplicar" onClick={onDuplicate}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="6" y="6" width="10" height="10" rx="1.5" />
          <path d="M4 13.5V5.5A1.5 1.5 0 0 1 5.5 4h8" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Traer al frente" onClick={onBringFront}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="7" y="3" width="8" height="8" rx="1.2" />
          <rect x="5" y="9" width="8" height="8" rx="1.2" fill="white" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Enviar atrás" onClick={onSendBack}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ui-gray" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="5" y="9" width="8" height="8" rx="1.2" />
          <rect x="7" y="3" width="8" height="8" rx="1.2" fill="white" />
        </svg>
      </ToolbarIconButton>

      <ToolbarIconButton label="Eliminar" onClick={onDelete}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-accent-coral" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.2A1.5 1.5 0 0 0 8.1 16.5h3.8a1.5 1.5 0 0 0 1.5-1.3L14 6" />
        </svg>
      </ToolbarIconButton>
    </div>
  );
}