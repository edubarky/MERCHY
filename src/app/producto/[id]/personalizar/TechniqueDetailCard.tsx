"use client";

import type { PrintTechnique } from "@/types";
import { formatMXN } from "@/lib/pricing";
import type { DesignElement, ViewName } from "./types";

// Editables reales (carpeta "POSICIONES, TAMAÑOS Y TINTAS"): cada archivo
// es la tarjeta de referencia completa que el usuario compartió (fondo +
// insignia de ícono + texto + campos + botón de basura, todo horneado en
// un solo SVG de 330x219). Como esta tarjeta necesita campos <input> reales
// y el precio en vivo, no se puede usar la imagen completa -- solo se
// recorta la insignia circular del ícono (idéntica posición/tamaño en los
// 7 archivos: cx=48 cy=41 r=21) y el resto de la tarjeta se construye con
// HTML real. Emparejado por el nombre real de la técnica en la base de
// datos, no por el nombre del archivo.
const ICON_SRC: Record<string, string> = {
  "Textil DTF": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/DTF TEXTIL.svg",
  "DTF UV": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/DTF UV.svg",
  "Serigrafía": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/SERIGRAFÍA.svg",
  "Bordado": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/BORDADO.svg",
  "DTG": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/DTG.svg",
  "Grabado en Láser": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/LÁSER.svg",
  "Tampografía": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/TAMPOGRAFÍA.svg",
};

// El nombre real en la base de datos ("Textil DTF") quedó así por cómo se
// dio de alta la técnica -- pero el editable/mockup y el resto de la app
// la llaman "DTF Textil". Este mapa solo cambia lo que se MUESTRA en el
// encabezado de la tarjeta; technique.name (usado para ICON_SRC, pricing,
// el snapshot guardado, etc.) no se toca en ningún otro lado.
const DISPLAY_NAME: Record<string, string> = {
  "Textil DTF": "DTF Textil",
};

const NATIVE_W = 330;
const NATIVE_H = 219;
// Caja de recorte (px, coordenadas nativas del SVG) centrada en la insignia
// circular (cx=48, cy=41, r=21) con un pequeño margen -- medida directamente
// de los archivos reales, no estimada.
const CROP = { x: 24, y: 17, size: 48 };

function TechniqueIconBadge({ name, size = 44 }: { name: string; size?: number }) {
  const src = ICON_SRC[name];
  // Una técnica sin editable en esta carpeta simplemente no dibuja
  // insignia -- nunca se inventa/reutiliza el ícono de otra técnica.
  if (!src) return <div className="shrink-0 rounded-full bg-primary/10" style={{ width: size, height: size }} />;
  const scale = size / CROP.size;
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        // Comillas explícitas dentro de url() -- sin ellas, un nombre de
        // archivo con espacio (ej. "DTF TEXTIL.svg") produce un token CSS
        // inválido que el navegador simplemente ignora en silencio, dejando
        // la insignia en blanco. Con comillas es un <string> CSS válido,
        // espacios incluidos -- bug real, confirmado en producción.
        backgroundImage: `url("${src}")`,
        backgroundSize: `${NATIVE_W * scale}px ${NATIVE_H * scale}px`,
        backgroundPosition: `${-CROP.x * scale}px ${-CROP.y * scale}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-medium text-ui-gray">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="w-full rounded-xl border border-ui-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

// "Posiciones" ya no se escribe a mano -- es un bloque por cada eje real
// (Frente/Reverso/Izquierda/Derecha) donde el cliente ya colocó algún
// logo (ver logosByView en PersonalizerClient), con el conteo de logos
// de ese eje justo debajo del título -- pedido explícito ("si el usuario
// agregó 2 logos en la parte de enfrente, ahí va 2"). Cuando la técnica
// sí cobra por tamaño (todo menos "by_tintas"), cada logo de ese eje trae
// su propio panel de Largo/Alto (cm) -- ya no una sola medida compartida
// por técnica, porque dos logos del mismo eje pueden medir distinto.
function PositionGroup({
  viewLabel,
  logos,
  showSizeFields,
  logoSizeCm,
  onLogoSizeCmChange,
}: {
  viewLabel: string;
  logos: DesignElement[];
  showSizeFields: boolean;
  logoSizeCm: Record<string, { largo: string; alto: string }>;
  onLogoSizeCmChange: (elementId: string, patch: Partial<{ largo: string; alto: string }>) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-primary-dark">Posición {viewLabel}</p>
        <span className="whitespace-nowrap text-[11px] text-ui-gray">
          {logos.length} {logos.length === 1 ? "logo" : "logos"}
        </span>
      </div>
      {showSizeFields && (
        <div className="mt-2 flex flex-wrap gap-2">
          {logos.map((logo, i) => {
            const dims = logoSizeCm[logo.id] ?? { largo: "", alto: "" };
            return (
              <div key={logo.id} className="min-w-[150px] flex-1 rounded-xl border border-ui-border bg-gray-50/60 p-2.5">
                <p className="mb-2 truncate text-[10px] font-semibold text-ui-gray">Logo {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Largo (cm)" value={dims.largo} onChange={(v) => onLogoSizeCmChange(logo.id, { largo: v })} />
                  <Field label="Alto (cm)" value={dims.alto} onChange={(v) => onLogoSizeCmChange(logo.id, { alto: v })} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TechniqueDetailCard({
  technique,
  unitPrice,
  needsQuote,
  logosByView,
  logoSizeCm,
  onLogoSizeCmChange,
  tintas,
  onTintasChange,
  onRemove,
}: {
  technique: PrintTechnique;
  unitPrice: number | null;
  needsQuote: boolean;
  logosByView: { view: ViewName; viewLabel: string; logos: DesignElement[] }[];
  logoSizeCm: Record<string, { largo: string; alto: string }>;
  onLogoSizeCmChange: (elementId: string, patch: Partial<{ largo: string; alto: string }>) => void;
  tintas: string;
  onTintasChange: (v: string) => void;
  onRemove: () => void;
}) {
  const showSizeFields = technique.pricing_type !== "by_tintas";
  return (
    <div className="rounded-2xl border border-ui-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TechniqueIconBadge name={technique.name} />
          <p className="truncate text-base font-bold text-primary-dark">{DISPLAY_NAME[technique.name] ?? technique.name}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${technique.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-ui-gray shadow-sm transition-colors duration-150 ease-out hover:bg-accent-coral/10 hover:text-accent-coral"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.2A1.5 1.5 0 0 0 8.1 16.5h3.8a1.5 1.5 0 0 0 1.5-1.3L14 6" />
          </svg>
        </button>
      </div>

      <div className="my-4 h-px bg-ui-border" />

      {/* Un bloque "Posición X" por cada eje con logos, cada uno con su
          conteo y (salvo Serigrafía/Tampografía) un panel de Largo/Alto
          por logo -- ver PositionGroup arriba. Tintas es aparte, siempre
          el mismo campo compartido por técnica (no depende del eje). */}
      {logosByView.length === 0 ? (
        <p className="text-xs text-ui-gray">
          Agrega un logo para especificar sus posiciones{showSizeFields ? " y medidas" : ""}.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {logosByView.map((g) => (
            <PositionGroup
              key={g.view}
              viewLabel={g.viewLabel}
              logos={g.logos}
              showSizeFields={showSizeFields}
              logoSizeCm={logoSizeCm}
              onLogoSizeCmChange={onLogoSizeCmChange}
            />
          ))}
        </div>
      )}

      {!showSizeFields && (
        <Field label="Tintas" value={tintas} onChange={onTintasChange} className="mt-3 max-w-[140px]" />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-ui-gray">Precio de esta técnica (sin IVA)</span>
        <span className={`text-sm font-bold ${needsQuote ? "text-accent-coral" : "text-primary-dark"}`}>
          {needsQuote ? "Por cotizar" : formatMXN(unitPrice ?? 0)}
        </span>
      </div>
    </div>
  );
}
