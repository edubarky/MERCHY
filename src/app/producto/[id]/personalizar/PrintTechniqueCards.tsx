"use client";

import type { PrintTechnique } from "@/types";

const SHEET_W = 388;
const SHEET_H = 108;

// Recorte de solo el ícono (sin la tarjeta ni el texto) dentro de
// "TÉCNICAS 2.svg" — mismo recurso original, solo se cambia cómo se
// posiciona/escala vía CSS, sin modificar el archivo.
const CARD_SLOTS = [
  { icon: { x: 22.9, y: 12.9, w: 60.2, h: 28 } },
  { icon: { x: 116.0, y: 13.0, w: 60.9, h: 28 } },
  { icon: { x: 210.0, y: 13.0, w: 60.9, h: 28 } },
  { icon: { x: 304.0, y: 13.0, w: 60.9, h: 28 } },
];

function TechniqueIcon({ slot }: { slot: (typeof CARD_SLOTS)[number] }) {
  const displayW = 44;
  const scale = displayW / slot.icon.w;
  const displayH = slot.icon.h * scale;
  return (
    <span
      aria-hidden
      className="block"
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: 'url("/Home/PERSONALIZADOR/TÉCNICAS 2.svg")',
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
        backgroundPosition: `${-slot.icon.x * scale}px ${-slot.icon.y * scale}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            className={`flex h-[120px] w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] ${
              isSelected
                ? "scale-[1.03] border-primary bg-primary/10 shadow-[0_8px_20px_rgba(87,224,217,0.25)]"
                : "border-ui-border bg-white hover:border-primary/50"
            }`}
          >
            <TechniqueIcon slot={slot} />
            <span className="text-sm font-bold text-foreground">{technique.name}</span>
            <span className="px-2 text-center text-[11px] leading-tight text-ui-gray">{technique.description}</span>
          </button>
        );
      })}
    </div>
  );
}