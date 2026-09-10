"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrintTechnique } from "@/types";
import { formatMXN } from "@/lib/pricing";
import type { DesignElement, ViewName } from "./types";
import { suggestInkCount, MAX_TINTAS } from "./inkSuggest";

// Pop-up de "elegir técnica" -- por ahora solo para Serigrafía/Tampografía
// (pricing_type "by_tintas"). Se abre ya pre-llenado: resumen del diseño,
// posiciones automáticas (1 logo = 1 posición), tintas sugeridas por los
// colores del arte, y el precio en vivo CON IVA. El camino normal es
// mirar y "Confirmar técnica" (ver charla 2026-09-10). Confirmar es lo
// único que agrega la técnica a la selección real; cerrar/cancelar no
// agrega nada.

const ICON_SRC: Record<string, string> = {
  "Serigrafía": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/SERIGRAFÍA.svg",
  "Tampografía": "/Home/PERSONALIZADOR/TECNICAS/DETALLE/TAMPOGRAFÍA.svg",
};
const NATIVE_W = 330;
const NATIVE_H = 219;
const CROP = { x: 24, y: 17, size: 48 };

function IconBadge({ name }: { name: string }) {
  const src = ICON_SRC[name];
  if (!src) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M8 5v14" />
        </svg>
      </span>
    );
  }
  const size = 36;
  const scale = size / CROP.size;
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${src}")`,
        backgroundSize: `${NATIVE_W * scale}px ${NATIVE_H * scale}px`,
        backgroundPosition: `${-CROP.x * scale}px ${-CROP.y * scale}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

function LogoThumb({ logo }: { logo: DesignElement }) {
  if (logo.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo.src} alt="" className="h-[22px] w-[22px] shrink-0 rounded-md border border-ui-border bg-white object-contain" draggable={false} />;
  }
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-dashed border-ui-border bg-white text-[7px] font-semibold uppercase text-ui-gray">
      {(logo.fileType ?? logo.fileName?.split(".").pop() ?? "?").slice(0, 3)}
    </span>
  );
}

// Tarjeta compacta de una técnica YA confirmada (reemplaza a la
// TechniqueDetailCard grande para by_tintas). "✎" reabre el pop-up con lo
// elegido; el bote quita la técnica.
export function TechniqueConfirmedRow({
  technique,
  resumen,
  unitPrice,
  needsQuote,
  onEdit,
  onRemove,
}: {
  technique: PrintTechnique;
  resumen: string;
  unitPrice: number | null;
  needsQuote: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ui-border bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5">
        <IconBadge name={technique.name} />
        <h4 className="flex-1 truncate font-display text-sm font-bold text-primary-dark">{technique.name}</h4>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${technique.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-ui-gray transition-colors hover:bg-gray-100"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5ZM13.1 5.3l1.6-1.6a1.2 1.2 0 0 1 1.7 0l.9.9a1.2 1.2 0 0 1 0 1.7l-1.6 1.6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${technique.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-ui-gray transition-colors hover:bg-accent-coral/10 hover:text-accent-coral"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.2A1.5 1.5 0 0 0 8.1 16.5h3.8a1.5 1.5 0 0 0 1.5-1.3L14 6" />
          </svg>
        </button>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2.5 border-t border-dashed border-ui-border pt-2.5">
        <span className="text-[12.5px] font-semibold text-ui-gray">{resumen || "—"}</span>
        <span className="text-right">
          {needsQuote || unitPrice === null ? (
            <span className="font-display text-sm font-bold text-accent-coral">Por cotizar</span>
          ) : (
            <>
              <span className="font-display text-[15px] font-bold text-foreground">{formatMXN(unitPrice)}</span>
              <span className="text-[11px] text-ui-gray"> c/u · con IVA</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function TechniqueModal({
  technique,
  logosByView,
  posiciones,
  quantity,
  tintas,
  onTintasChange,
  unitPrice,
  needsQuote,
  resumen,
  onConfirm,
  onClose,
}: {
  technique: PrintTechnique;
  logosByView: { view: ViewName; viewLabel: string; logos: DesignElement[] }[];
  posiciones: number;
  quantity: number;
  tintas: string;
  onTintasChange: (v: string) => void;
  // Ya vienen calculados por PersonalizerClient (unitPrice CON IVA).
  unitPrice: number | null;
  needsQuote: boolean;
  resumen: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [suggested, setSuggested] = useState<number | null>(null);

  // `logosByView` se reconstruye en cada render del padre -- se deriva una
  // clave estable (ids de los logos) para no re-disparar la sugerencia en
  // cada render.
  const allLogos = useMemo(() => logosByView.flatMap((g) => g.logos), [logosByView]);
  const logoKey = allLogos.map((l) => l.id).join("|");

  // Sugerencia de tintas al abrir / cambiar de arte -- si el campo aún
  // está vacío, se pre-llena con la sugerencia; si el usuario ya escribió
  // algo, solo se muestra como referencia y no se pisa.
  useEffect(() => {
    let cancelled = false;
    const srcs = allLogos.map((l) => l.src ?? "").filter(Boolean);
    suggestInkCount(srcs).then((n) => {
      if (cancelled || n === null) return;
      setSuggested(n);
      if (!tintas) onTintasChange(String(n));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoKey]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const tintasNum = parseInt(tintas, 10);
  // Se puede confirmar aunque el precio caiga en "Por cotizar" (posiciones ×
  // tintas fuera de la tabla) -- la técnica queda elegida y "Siguiente"
  // sigue bloqueado hasta que haya un precio real, igual que antes.
  const canConfirm = posiciones > 0 && Number.isFinite(tintasNum) && tintasNum > 0;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,50,50,0.22)]"
      >
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <IconBadge name={technique.name} />
          <h3 className="flex-1 truncate font-display text-base font-bold text-primary-dark">{technique.name}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-ui-gray transition-colors hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-4">
          <p className="mb-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-ui-gray">Resumen de tu diseño</p>
          {logosByView.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ui-border px-3 py-3 text-xs text-ui-gray">
              Agrega un logo al lienzo para calcular el precio de esta técnica.
            </p>
          ) : (
            <div className="rounded-xl border border-ui-border bg-gray-50/60 px-2.5 py-1">
              {logosByView.map((g, gi) => (
                <div
                  key={g.view}
                  className={`flex items-center gap-2.5 py-1.5 text-[12.5px] ${gi > 0 ? "border-t border-dashed border-ui-border" : ""}`}
                >
                  <LogoThumb logo={g.logos[0]} />
                  <span className="flex-1 text-ui-gray">{g.viewLabel}</span>
                  <span className="font-semibold text-foreground">
                    {g.logos.length} {g.logos.length === 1 ? "logo" : "logos"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-ui-border bg-gray-50/60 px-2.5 py-2">
              <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-ui-gray">Posiciones</span>
              <span className="mt-0.5 flex items-center gap-1.5 font-display text-[17px] font-bold text-foreground">
                {posiciones > 0 && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.6}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {posiciones}
              </span>
            </div>
            <div className="rounded-xl border border-ui-border bg-gray-50/60 px-2.5 py-2">
              <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-ui-gray">Tintas</span>
              <select
                value={tintas || ""}
                onChange={(e) => onTintasChange(e.target.value)}
                className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 font-body text-[16px] font-bold text-foreground outline-none"
              >
                <option value="" disabled>
                  —
                </option>
                {Array.from({ length: MAX_TINTAS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {suggested !== null && (
                <span className="mt-0.5 block text-[10.5px] text-primary-dark">
                  Sugerido: <b>{suggested}</b> · ~{suggested} {suggested === 1 ? "color" : "colores"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3.5 flex items-start justify-between gap-2.5 border-t border-ui-border pt-3">
            <span className="pt-0.5 text-[12.5px] font-semibold text-ui-gray">{resumen || `${posiciones} posiciones`}</span>
            <span className="text-right">
              {needsQuote || unitPrice === null ? (
                <span className="font-display text-sm font-bold text-accent-coral">Por cotizar</span>
              ) : (
                <>
                  <span className="font-display text-[19px] font-bold text-foreground">{formatMXN(unitPrice)}</span>
                  <span className="text-[11.5px] text-ui-gray"> c/u · {formatMXN(unitPrice * quantity)} total</span>
                  <span className="block text-[10px] uppercase tracking-wide text-ui-gray">con IVA</span>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="mt-3.5 w-full rounded-full bg-primary py-3 font-display text-sm font-semibold text-white transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Confirmar técnica
          </button>
        </div>
      </div>
    </div>
  );
}
