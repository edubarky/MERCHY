"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { PrintTechnique } from "@/types";
import { VIEW_ORDER, type ViewElements, type ResolvedProductAssets } from "./types";
import MiniView from "./MiniView";

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5" />
      <path d="M4 15.5v.5A2 2 0 0 0 6 18h8a2 2 0 0 0 2-2v-.5" />
    </svg>
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
  garmentColor: string;
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

            {/* Solo el ícono, abajo a la derecha (pedido explícito charla
                2026-09-10). */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                aria-label={downloading ? "Generando imagen…" : "Descargar imagen"}
                title={downloading ? "Generando…" : "Descargar"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary-dark shadow-[0_6px_18px_rgba(0,0,0,0.14)] transition-transform duration-150 ease-out hover:scale-110 disabled:opacity-50"
              >
                <DownloadIcon className={`h-5 w-5 ${downloading ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
