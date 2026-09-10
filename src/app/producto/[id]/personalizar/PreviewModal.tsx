"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { PrintTechnique } from "@/types";
import { VIEW_ORDER, VIEW_LABELS, type ViewElements, type DesignElement, type GarmentColor, type ResolvedProductAssets } from "./types";
import { resolveFontFamilyCss } from "./textFonts";
import { DEFAULT_FONT_SIZE_RATIO } from "./DesignElementView";
import { needsLogoProcessing, processLogoSrc } from "./logoImagePipeline";

// Mismas "Opciones de diseño" (fondo/color/espejo/opacidad/brillo-
// contraste) que ya aplica el lienzo real (ver DesignElementView) -- si no
// se replicaran aquí, esta vista previa mostraría el logo ORIGINAL sin los
// ajustes que el cliente ya eligió, inconsistente con lo que en realidad
// va a llevar el pedido. Componente propio (no inline en el .map de abajo)
// porque el procesamiento es async por elemento -- cada logo necesita su
// propio estado.
function MiniLogoImage({ element }: { element: DesignElement }) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!element.src || !needsLogoProcessing(element)) {
      setProcessedSrc(null);
      return;
    }
    let cancelled = false;
    processLogoSrc(element.src, element)
      .then((dataUrl) => {
        if (!cancelled) setProcessedSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setProcessedSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [element.src, element.bgRemoved, element.recolor]);

  if (!element.src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={processedSrc ?? element.src}
      alt=""
      className="h-full w-full select-none object-contain"
      draggable={false}
      style={{
        transform: `scaleX(${element.flipH ? -1 : 1}) scaleY(${element.flipV ? -1 : 1})`,
        opacity: (element.opacity ?? 100) / 100,
        filter: `brightness(${1 + (element.brightness ?? 0) / 100}) contrast(${1 + (element.contrast ?? 0) / 100})`,
      }}
    />
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5" />
      <path d="M4 15.5v.5A2 2 0 0 0 6 18h8a2 2 0 0 0 2-2v-.5" />
    </svg>
  );
}

// Una cara de la prenda: solo la etiqueta ("Frente"/"Reverso"/...) y la
// imagen con el arte colocado encima. Sin fondo gris, sin botón de
// descarga propio, sin etiquetas de "Logo"/"Texto"/técnica -- pedido
// explícito: "solo quiero ver las imágenes" (ver charla 2026-09-10). La
// descarga es una sola, del conjunto completo, y vive en el pie del modal.
function MiniView({
  view,
  elements,
  resolvedAssets,
  garmentColor,
}: {
  view: (typeof VIEW_ORDER)[number];
  elements: ViewElements;
  resolvedAssets: ResolvedProductAssets;
  garmentColor: GarmentColor;
}) {
  // No generic-mockup fallback here either — same rule as the live canvas:
  // only ever the selected product's own photography, or nothing.
  const imgSrc = resolvedAssets[view][garmentColor];
  const viewElements = elements[view];

  return (
    <div className="rounded-2xl border border-ui-border bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">{VIEW_LABELS[view]}</p>

      <div
        // aspectRatio fijo (1:1), NUNCA asset.aspect por vista: cada eje
        // trae su propia relación de aspecto real de foto, así que dos
        // tarjetas lado a lado terminaban con alturas distintas. Un
        // cuadrado fijo + object-contain deja todas iguales.
        className="relative mx-auto w-full overflow-hidden rounded-xl bg-white"
        style={{ aspectRatio: 1 }}
      >
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={VIEW_LABELS[view]} className="absolute inset-0 h-full w-full select-none object-contain" draggable={false} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-ui-gray">Fotografías no disponibles aún</p>
          </div>
        )}
        {viewElements.map((el) => (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.widthPct}%`,
              height: `${el.heightPct}%`,
              transform: `rotate(${el.rotation}deg)`,
              zIndex: el.zIndex,
              containerType: "inline-size",
            }}
          >
            {el.type === "logo" ? (
              el.src ? (
                <MiniLogoImage element={el} />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-gray-400 bg-white/85 text-[7px] text-ui-gray">
                  .AI
                </div>
              )
            ) : (
              <div
                className="flex h-full w-full items-center overflow-hidden whitespace-nowrap"
                style={{
                  fontFamily: resolveFontFamilyCss(el.fontFamily),
                  color: el.color || "#1a1a1a",
                  fontWeight: el.bold ? 700 : 400,
                  fontStyle: el.italic ? "italic" : "normal",
                  letterSpacing: `${el.letterSpacing ?? 0}px`,
                  justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
                  // Same cqw-of-own-box-width approach as the live canvas
                  // (DesignElementView) — this is what keeps text looking
                  // the same *relative* size here as it does in the editor,
                  // even though this card is a different pixel size.
                  fontSize: `${(el.fontSizeRatio ?? DEFAULT_FONT_SIZE_RATIO) * 100}cqw`,
                }}
              >
                {el.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PreviewModal({
  open,
  onClose,
  elements,
  productName,
  resolvedAssets,
  garmentColor,
}: {
  open: boolean;
  onClose: () => void;
  elements: ViewElements;
  productName: string;
  // Se conservan en la firma por compatibilidad con quien monta el modal,
  // aunque esta vista previa ya no los use (ahora es solo "mirar +
  // descargar"; confirmar/agregar al carrito vive en "Siguiente" del
  // editor).
  technique?: PrintTechnique | null;
  resolvedAssets: ResolvedProductAssets;
  garmentColor: GarmentColor;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmDisabledReason?: string;
}) {
  const [entered, setEntered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Only show views the user actually put art in — an untouched view (no
  // logo, no text) never appears here.
  const viewsWithArt = VIEW_ORDER.filter((view) => elements[view].length > 0);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Una sola descarga: toda la hoja de vistas (1, 2, 3 o 4) como una
  // imagen. Nunca una descarga por cara (pedido explícito, charla
  // 2026-09-10).
  async function handleDownloadAll() {
    if (!sheetRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(sheetRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${productName}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] transition-all duration-200 ease-out sm:p-8 ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Vista Previa</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-150 ease-out hover:scale-110"
          >
            ✕
          </button>
        </div>

        {viewsWithArt.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="mb-1 font-semibold text-foreground">Aún no has agregado ningún arte</p>
            <p className="text-sm text-ui-gray">Coloca un logo o texto en alguna vista para verla aquí.</p>
          </div>
        ) : (
          <>
            <div ref={sheetRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {viewsWithArt.map((view) => (
                <MiniView
                  key={view}
                  view={view}
                  elements={elements}
                  resolvedAssets={resolvedAssets}
                  garmentColor={garmentColor}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-10 text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <DownloadIcon className="h-5 w-5" />
                {downloading ? "Generando..." : "Descargar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
