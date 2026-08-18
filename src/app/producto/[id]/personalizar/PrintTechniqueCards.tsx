"use client";

import type { PrintTechnique } from "@/types";

// Editables provistos por diseño (carpeta "Técnicas", 18 ago 2026): cada
// SVG es la tarjeta completa ya armada — fondo redondeado, sombra, el
// círculo selector de la esquina y el ícono, todo en un solo archivo por
// técnica. Se usan tal cual, sin recortar ni reconstruir nada; el orden
// aquí debe coincidir con el orden en que la base de datos entrega
// `techniques` (ya verificado: DTF Textil, DTG, Serigrafía, Bordado).
const CARD_IMAGES = [
  "/Home/PERSONALIZADOR/TECNICAS/DTF TEXTIL.svg",
  "/Home/PERSONALIZADOR/TECNICAS/DTG.svg",
  "/Home/PERSONALIZADOR/TECNICAS/SERIGRAFÍA.svg",
  "/Home/PERSONALIZADOR/TECNICAS/BORDADO.svg",
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CARD_IMAGES.map((src, i) => {
        const technique = techniques[i];
        if (!technique) return null;
        const isSelected = selectedId === technique.id;
        return (
          <button
            key={technique.id}
            type="button"
            onClick={() => onSelect(technique.id)}
            aria-pressed={isSelected}
            className={`w-full rounded-[18px] transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isSelected
                ? "scale-[1.03] shadow-[0_8px_20px_rgba(87,224,217,0.25)] ring-2 ring-primary"
                : "hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${technique.name} — ${technique.description}`} className="block h-auto w-full rounded-[18px]" />
          </button>
        );
      })}
    </div>
  );
}