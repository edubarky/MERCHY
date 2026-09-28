"use client";

import { useEffect, useState } from "react";
import { VIEW_LABELS, type ViewName, type ViewElements, type DesignElement, type ResolvedProductAssets } from "./types";
import { resolveFontFamilyCss } from "./textFonts";
import { DEFAULT_FONT_SIZE_RATIO } from "./DesignElementView";
import { needsLogoProcessing, processLogoSrc } from "./logoImagePipeline";
import { VIEW_ASSETS } from "./viewAssets";

// Extraído de PreviewModal.tsx (ver charla 2026-09-25) para reusarlo también
// en el paso "Selecciona el Tipo de impresión" (miniatura por vista) — sin
// cambios de comportamiento, mismo componente que ya se usaba ahí.

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

// Una cara de la prenda: SOLO la prenda con el arte colocado encima. Sin
// marco, sin fondo gris, sin nombre de vista, sin etiquetas -- pedido
// explícito ("que solo estén los productos y los logos", charla
// 2026-09-10). Independiente del lienzo en vivo (no usa canvasRef) -- arma
// la vista entera a partir de las posiciones en % ya guardadas, así se
// puede renderizar cualquier vista aunque no sea la activa en el editor.
export default function MiniView({
  view,
  elements,
  resolvedAssets,
  garmentColor,
}: {
  view: ViewName;
  elements: ViewElements;
  resolvedAssets: ResolvedProductAssets;
  garmentColor: string;
}) {
  // No generic-mockup fallback here either — same rule as the live canvas:
  // only ever the selected product's own photography, or nothing.
  const imgSrc = resolvedAssets[view][garmentColor];
  const viewElements = elements[view];
  const asset = VIEW_ASSETS[view];

  return (
    <div
      // Cuadrado fijo (1:1) SOLO en este contenedor exterior -- para que
      // dos caras lado a lado en la cuadrícula terminen con la misma
      // altura (mismo motivo de siempre). El bug real (charla 2026-09-21:
      // "el de la derecha y atrás se distorsionaron") era que las
      // posiciones/tamaños de los elementos (xPct/yPct/widthPct/heightPct)
      // se calcularon en el lienzo real, cuyo contenedor SIEMPRE tiene el
      // aspecto real de la foto (asset.aspect, ver PersonalizerClient) --
      // nunca cuadrado. Aplicar esos mismos porcentajes directo sobre un
      // cuadrado los distorsiona en cualquier vista cuyo aspecto real no
      // sea ~1:1 (Reverso/Izquierda/Derecha, todas más angostas que altas
      // -- Frente casi no se notaba porque su aspecto ya es casi cuadrado).
      // La corrección: un contenedor INTERNO con el aspecto real de la
      // foto (igual que el lienzo), centrado dentro del cuadrado exterior
      // -- ahí sí, los mismos porcentajes caen exactamente en el mismo
      // lugar relativo que en el editor.
      className="relative mx-auto flex w-full items-center justify-center overflow-hidden bg-white"
      style={{ aspectRatio: 1 }}
    >
      <div
        className="relative"
        style={{
          aspectRatio: asset.aspect,
          width: asset.aspect >= 1 ? "100%" : "auto",
          height: asset.aspect >= 1 ? "auto" : "100%",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
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
