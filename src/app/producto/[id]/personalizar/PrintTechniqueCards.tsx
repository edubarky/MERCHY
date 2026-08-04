"use client";

import type { PrintTechnique } from "@/types";

const VIEWBOX_W = 388;
const VIEWBOX_H = 108;

// Posiciones exactas de las 4 tarjetas dentro de "TÉCNICAS 2.svg" (carpeta
// Personalizador) — se usa la imagen original sin modificar como fondo, y
// solo se superponen botones transparentes + el indicador de selección.
const CARD_SLOTS = [
  { rect: { x: 10, y: 6, w: 86, h: 86 }, radio: { cx: 20.5, cy: 17.5 } },
  { rect: { x: 103, y: 6, w: 87, h: 88 }, radio: { cx: 116.5, cy: 17.5 } },
  { rect: { x: 197, y: 6, w: 87, h: 88 }, radio: { cx: 211.5, cy: 17.5 } },
  { rect: { x: 291, y: 6, w: 87, h: 88 }, radio: { cx: 303.5, cy: 17.5 } },
];

export default function PrintTechniqueCards({
  techniques,
  selectedId,
  onSelect,
}: {
  techniques: PrintTechnique[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Home/PERSONALIZADOR/TÉCNICAS 2.svg"
        alt="Selecciona el tipo de impresión"
        className="absolute inset-0 h-full w-full"
      />
      {CARD_SLOTS.map((slot, i) => {
        const technique = techniques[i];
        if (!technique) return null;
        const isSelected = selectedId === technique.id;
        return (
          <button
            key={technique.id}
            type="button"
            onClick={() => onSelect(technique.id)}
            aria-pressed={isSelected}
            title={technique.name}
            className={`absolute rounded-[10px] transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isSelected
                ? "shadow-[0_6px_18px_rgba(87,224,217,0.35)] ring-2 ring-primary"
                : "ring-1 ring-transparent hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
            }`}
            style={{
              left: `${(slot.rect.x / VIEWBOX_W) * 100}%`,
              top: `${(slot.rect.y / VIEWBOX_H) * 100}%`,
              width: `${(slot.rect.w / VIEWBOX_W) * 100}%`,
              height: `${(slot.rect.h / VIEWBOX_H) * 100}%`,
            }}
          >
            {isSelected && (
              <span
                aria-hidden
                className="absolute rounded-full bg-primary"
                style={{
                  left: `${((slot.radio.cx - slot.rect.x) / slot.rect.w) * 100}%`,
                  top: `${((slot.radio.cy - slot.rect.y) / slot.rect.h) * 100}%`,
                  width: "9%",
                  height: "9%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}