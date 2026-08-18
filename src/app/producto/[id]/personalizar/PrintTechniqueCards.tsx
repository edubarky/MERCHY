"use client";

import type { PrintTechnique } from "@/types";

// Editables de diseño (carpeta "Técnicas"): cada SVG es la tarjeta completa
// ya armada — fondo redondeado, sombra propia, el círculo selector de la
// esquina e ícono, todo en un solo archivo. Se usan tal cual. `dot` es el
// centro (en % del ancho/alto del propio SVG) de ese círculo — leído
// directamente de las coordenadas del editable de cada técnica — para poder
// dibujar ahí encima el indicador de "seleccionado" sin tocar el archivo.
//
// Se empareja por `name` (no por posición) contra lo que entrega la base de
// datos: así el orden visual de esta fila queda fijo aquí sin depender de
// que sort_order en la tabla coincida exactamente, y una técnica que no
// exista todavía en la base (ej. antes de darla de alta) simplemente no se
// dibuja, en vez de desalinear a las demás.
const CARDS = [
  { name: "DTF Textil", src: "/Home/PERSONALIZADOR/TECNICAS/DTF TEXTIL.svg", dot: { x: 19.34, y: 16.51 } },
  { name: "DTF UV", src: "/Home/PERSONALIZADOR/TECNICAS/DTF UV.svg", dot: { x: 21.03, y: 16.2 } },
  { name: "Serigrafía", src: "/Home/PERSONALIZADOR/TECNICAS/SERIGRAFÍA.svg", dot: { x: 22.9, y: 16.2 } },
  { name: "Bordado", src: "/Home/PERSONALIZADOR/TECNICAS/BORDADO.svg", dot: { x: 21.03, y: 16.2 } },
  { name: "DTG", src: "/Home/PERSONALIZADOR/TECNICAS/DTG.svg", dot: { x: 21.96, y: 16.2 } },
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
    // 4 columnas en desktop (misma proporción/tamaño de tarjeta que ya
    // existía) pero solo 3 técnicas se dejan fluir en la fila 1 — las
    // últimas 2 se ubican explícitamente en la fila 2, columnas 1-2, para
    // que la distribución quede 3 arriba + 2 abajo sin agrandar ni deformar
    // ninguna tarjeta. En móvil (sin el prefijo sm:) es una grilla de 2
    // columnas normal, sin esa colocación forzada.
    <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-4">
      {CARDS.map((card, i) => {
        const technique = techniques.find((t) => t.name === card.name);
        if (!technique) return null;
        const isSelected = selectedId === technique.id;
        return (
          <button
            key={technique.id}
            type="button"
            onClick={() => onSelect(technique.id)}
            aria-pressed={isSelected}
            // Un único contenedor: la tarjeta ES la imagen. El resaltado de
            // hover/selección se dibuja con filter:drop-shadow, que traza el
            // contorno real y transparente-respetuoso del SVG (no una caja
            // rectangular aparte) — así nunca aparece un "segundo cuadro".
            // Sin scale ni translate: la tarjeta no cambia de tamaño ni se mueve.
            className={`relative block w-full transition-[filter] duration-150 ease-out ${
              i === 3 ? "sm:[grid-row:2] sm:[grid-column:1]" : i === 4 ? "sm:[grid-row:2] sm:[grid-column:2]" : ""
            } ${
              isSelected
                ? "[filter:drop-shadow(0_0_2px_rgba(87,224,217,0.9))_drop-shadow(0_6px_16px_rgba(87,224,217,0.3))]"
                : "hover:[filter:drop-shadow(0_0_2px_rgba(87,224,217,0.85))_drop-shadow(0_6px_14px_rgba(87,224,217,0.18))]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.src} alt={`${technique.name} — ${technique.description}`} className="block h-auto w-full" />
            {/* Punto turquesa sobre el círculo selector ya dibujado en el
                editable — aparece solo cuando está seleccionada. */}
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-primary transition-all duration-150 ease-out"
              style={{
                left: `${card.dot.x}%`,
                top: `${card.dot.y}%`,
                width: "5.2%",
                height: "5.2%",
                transform: `translate(-50%, -50%) scale(${isSelected ? 1 : 0})`,
                opacity: isSelected ? 1 : 0,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}