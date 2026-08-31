// Iconos genéricos de línea (cursor, capas, deshacer/rehacer, flecha, ojo,
// prenda de la pestaña) — no existe un recurso dedicado para estos en la
// carpeta de diseño "Personalizador" (se revisaron los 24 SVG provistos);
// se construyen aquí como trazos mínimos de un solo color para no romper
// el lenguaje visual del resto de la interfaz.

export function CursorIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 3l4.5 16 2.3-6.2L18 10.5 5 3Z" fill="currentColor" />
    </svg>
  );
}

export function TextToolIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5 6h14M12 6v12" />
    </svg>
  );
}

export function ImageToolIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M20 15l-5-5-9 9" strokeLinecap="round" />
    </svg>
  );
}

export function LayersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

export function UndoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 8H4V5" />
      <path d="M4.5 14A8 8 0 1 0 6 7.3L4 8" />
    </svg>
  );
}

export function RedoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h3V5" />
      <path d="M19.5 14a8 8 0 1 1-1.5-6.7L20 8" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" />
    </svg>
  );
}

export function GarmentTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <path d="M9 4 6 6l-3 3 2.5 2.5L7 10v10h10V10l1.5 1.5L21 9l-3-3-3-2-1 2h-4l-1-2Z" />
    </svg>
  );
}

// Iconos de las pestañas de eje (Frente/Reverso/Izquierda/Derecha/Funda,
// ver ViewName en types.ts) -- antes las 5 reusaban GarmentTabIcon (una
// prenda), que no tenía sentido para "Funda" ni para ejes de un producto
// que no es ropa (ej. Tapete de Yoga Minsk) -- pedido explícito: un ícono
// propio por eje. Como "frente"/"reverso" de un producto cualquiera (no
// solo prendas) son visualmente casi imposibles de distinguir como
// silueta (un rectángulo se ve igual de frente que de reverso), el
// lenguaje aquí es de ORIENTACIÓN, no de silueta de prenda -- mismo
// criterio que ya usan configuradores de producto reales: un plano visto
// de frente, ese mismo plano con una flecha de giro (reverso), un perfil
// angosto con flecha lateral (izquierda/derecha), y una bolsa con asa
// para "funda" (forma completamente distinta, nunca un plano).
export function FrenteTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="16" rx="2.5" />
    </svg>
  );
}

export function ReversoTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <rect x="4" y="4" width="13" height="16" rx="2.5" />
      <path d="M17.5 7.3a4.5 4.5 0 1 1-1 5" />
      <path d="M20.5 5.5v3.2h-3.2" />
    </svg>
  );
}

export function IzquierdaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <rect x="10" y="4" width="8" height="16" rx="2.2" />
      <path d="M6.5 9 3.5 12l3 3" />
    </svg>
  );
}

export function DerechaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <rect x="6" y="4" width="8" height="16" rx="2.2" />
      <path d="M17.5 9l3 3-3 3" />
    </svg>
  );
}

export function FundaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M8.5 9.5V8a3.5 3.5 0 0 1 7 0v1.5" />
      <rect x="5" y="9.5" width="14" height="10.5" rx="3" />
    </svg>
  );
}

// Variantes de Frente/Reverso/Izquierda/Derecha PARA PRENDAS -- pedido
// explícito ("en lo de prendas... iconos referentes a ellas"): en vez del
// lenguaje de orientación genérico de arriba (plano/flecha de giro/perfil),
// una prenda de vestir sí tiene una silueta reconocible propia (la misma
// playera de GarmentTabIcon, ya aprobada) -- usada como base en las 4,
// diferenciadas de forma real, no decorativa:
//  - Frente: la silueta con su cuello/escote (la abertura solo se ve por
//    el frente de una prenda real).
//  - Reverso: la MISMA silueta pero con el cuello cerrado/liso -- por la
//    espalda no hay abertura de cuello que dibujar, es la diferencia real
//    entre frente y espalda de cualquier playera.
//  - Izquierda/Derecha: la silueta de frente + una flecha lateral pequeña
//    (mismo lenguaje que IzquierdaTabIcon/DerechaTabIcon) para marcar el
//    costado sin inventar una silueta de perfil nueva.
// Escalada al 80% y recentrada (antes ocupaba casi todo el viewBox) para
// dejarle aire a las flechas de Izquierda/Derecha en la esquina.
const GARMENT_FRONT_PATH = "M9 4 6 6l-3 3 2.5 2.5L7 10v10h10V10l1.5 1.5L21 9l-3-3-3-2-1 2h-4l-1-2Z";
const GARMENT_BACK_PATH = "M9 4 6 6l-3 3 2.5 2.5L7 10v10h10V10l1.5 1.5L21 9l-3-3-3-2-6 0Z";

export function FrentePrendaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <path d={GARMENT_FRONT_PATH} />
    </svg>
  );
}

export function ReversoPrendaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <path d={GARMENT_BACK_PATH} />
    </svg>
  );
}

export function IzquierdaPrendaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <g transform="translate(2.4 2.4) scale(0.8)">
        <path d={GARMENT_FRONT_PATH} />
      </g>
      <path d="M4 10.5 1.6 12.7 4 15" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function DerechaPrendaTabIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
      <g transform="translate(2.4 2.4) scale(0.8)">
        <path d={GARMENT_FRONT_PATH} />
      </g>
      <path d="M20 10.5l2.4 2.2L20 15" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h3.6l2 2.1H19a1.5 1.5 0 0 1 1.5 1.5v8.9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.5Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.2c.45 2.75 1.1 4.3 2.15 5.35S15.85 10.05 18.6 10.5c-2.75.45-4.3 1.1-5.35 2.15S11.9 15.7 11.45 18.5c-.45-2.75-1.1-4.3-2.15-5.35S6.75 11.4 4 10.95c2.75-.45 4.3-1.1 5.3-2.1S11 5.95 11 3.2Z" />
      <path d="M18.3 15.2c.22 1.02.5 1.63.9 2.03s1.02.68 2.05.9c-1.03.22-1.65.5-2.05.9s-.68 1.01-.9 2.04c-.22-1.03-.5-1.64-.9-2.04s-1.02-.68-2.05-.9c1.03-.22 1.65-.5 2.05-.9s.68-1.01.9-2.03Z" />
    </svg>
  );
}

export function EyeIcon({ className = "", open = true }: { className?: string; open?: boolean }) {
  if (!open) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7-.6 1.7-1.8 3.6-3.5 5.1M6.5 6.9C4.7 8.3 3.4 10.2 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
        <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}