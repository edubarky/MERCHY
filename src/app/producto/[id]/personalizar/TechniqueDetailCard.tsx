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

// Miniatura real del arte (o una insignia ".AI"/".PDF" con la extensión
// cuando el elemento no tiene `src` rasterizable -- mismo criterio que ya
// usa DesignElementView en el canvas) -- para que "Logo 1"/"Logo 2" no
// sean solo números cuando dos logos son el mismo archivo/arte repetido.
// También es el botón que selecciona ese logo en el canvas (ver
// onSelectLogo abajo), así el usuario puede confirmar cuál es cuál
// viéndolo resaltado ahí en vez de adivinar por el número.
function LogoThumb({ logo }: { logo: DesignElement }) {
  if (logo.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logo.src}
        alt={logo.fileName ?? "logo"}
        className="h-8 w-8 shrink-0 rounded-lg border border-ui-border bg-white object-contain"
        draggable={false}
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-ui-border bg-white">
      <span className="text-[8px] font-semibold uppercase text-ui-gray">
        .{(logo.fileType ?? logo.fileName?.split(".").pop() ?? "?").slice(0, 3)}
      </span>
    </div>
  );
}

// "Posiciones" ya no se escribe a mano -- es un bloque por cada eje real
// (Frente/Reverso/Izquierda/Derecha) donde el cliente ya colocó algún
// logo (ver logosByView en PersonalizerClient), con el conteo de logos
// de ese eje justo debajo del título -- pedido explícito ("si el usuario
// agregó 2 logos en la parte de enfrente, ahí va 2"). Cuando la técnica
// sí cobra por tamaño (todo menos "by_tintas"), cada logo de ese eje trae
// su propio panel de Largo/Alto (cm) -- ya no una sola medida compartida
// por técnica, porque dos logos del mismo eje pueden medir distinto. Cada
// panel arranca con la miniatura real del logo (ver LogoThumb) y es
// clicable -- selecciona ese elemento en el canvas (cambiando de vista si
// hace falta) para desambiguar cuando dos logos son el mismo arte.
function PositionGroup({
  view,
  viewLabel,
  logos,
  showSizeFields,
  logoSizeCm,
  onLogoSizeCmChange,
  selectedElementId,
  onSelectLogo,
}: {
  view: ViewName;
  viewLabel: string;
  logos: DesignElement[];
  showSizeFields: boolean;
  logoSizeCm: Record<string, { largo: string; alto: string }>;
  onLogoSizeCmChange: (elementId: string, patch: Partial<{ largo: string; alto: string }>) => void;
  selectedElementId: string | null;
  onSelectLogo: (view: ViewName, elementId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-primary-dark">Posición {viewLabel}</p>
        <span className="whitespace-nowrap text-[11px] text-ui-gray">
          {logos.length} {logos.length === 1 ? "logo" : "logos"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {logos.map((logo, i) => {
          const dims = logoSizeCm[logo.id] ?? { largo: "", alto: "" };
          const isSelected = selectedElementId === logo.id;
          return (
            <div
              key={logo.id}
              className={`min-w-[150px] flex-1 rounded-xl border p-2.5 transition-colors duration-150 ease-out ${
                isSelected ? "border-primary bg-primary/5" : "border-ui-border bg-gray-50/60"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectLogo(view, logo.id)}
                title="Ver este logo en el lienzo"
                className="mb-2 flex w-full items-center gap-2 rounded-lg text-left"
              >
                <LogoThumb logo={logo} />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-ui-gray">Logo {i + 1}</span>
              </button>
              {showSizeFields && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Largo (cm)" value={dims.largo} onChange={(v) => onLogoSizeCmChange(logo.id, { largo: v })} />
                  <Field label="Alto (cm)" value={dims.alto} onChange={(v) => onLogoSizeCmChange(logo.id, { alto: v })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  selectedElementId,
  onSelectLogo,
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
  // Qué elemento está seleccionado ahora mismo en el canvas -- resalta su
  // panel aquí (ver PositionGroup) cuando coincide, para que el resaltado
  // funcione en los dos sentidos: clic en el panel selecciona en el
  // canvas, y clic en el canvas resalta el panel correcto.
  selectedElementId: string | null;
  onSelectLogo: (view: ViewName, elementId: string) => void;
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
              view={g.view}
              viewLabel={g.viewLabel}
              logos={g.logos}
              showSizeFields={showSizeFields}
              logoSizeCm={logoSizeCm}
              onLogoSizeCmChange={onLogoSizeCmChange}
              selectedElementId={selectedElementId}
              onSelectLogo={onSelectLogo}
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
