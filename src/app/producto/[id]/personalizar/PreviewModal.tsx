"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { PrintTechnique } from "@/types";
import { VIEW_ORDER, VIEW_LABELS, type ViewElements, type GarmentColor, type ResolvedProductAssets } from "./types";
import { VIEW_ASSETS } from "./viewAssets";

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5" />
      <path d="M4 15.5v.5A2 2 0 0 0 6 18h8a2 2 0 0 0 2-2v-.5" />
    </svg>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-ui-gray">{children}</span>
  );
}

function techniqueEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bordado")) return "🧵";
  if (n.includes("serigraf")) return "🎨";
  if (n.includes("dtf") || n.includes("dtg")) return "🖨";
  return "🖨";
}

function clampZoom(z: number) {
  return Math.min(3, Math.max(1, z));
}

function MiniView({
  view,
  elements,
  productName,
  technique,
  resolvedAssets,
  garmentColor,
}: {
  view: (typeof VIEW_ORDER)[number];
  elements: ViewElements;
  productName: string;
  technique: PrintTechnique | null;
  resolvedAssets: ResolvedProductAssets;
  garmentColor: GarmentColor;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const asset = VIEW_ASSETS[view];
  // No generic-mockup fallback here either — same rule as the live canvas:
  // only ever the selected product's own photography, or nothing.
  const imgSrc = resolvedAssets[view][garmentColor];
  const viewElements = elements[view];
  const hasLogo = viewElements.some((e) => e.type === "logo");
  const hasText = viewElements.some((e) => e.type === "text");
  const isEmpty = viewElements.length === 0;

  // React attaches onWheel as a passive listener, so e.preventDefault() there is a
  // silent no-op — a native listener is required to actually stop page/modal scroll
  // while zooming with the wheel.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setZoom((z) => {
        const next = clampZoom(z - e.deltaY * 0.0015);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  function handleDoubleClick() {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.2);
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
  }

  function stopDragging() {
    setDragging(false);
    dragRef.current = null;
  }

  async function handleDownload() {
    if (!contentRef.current || downloading) return;
    setDownloading(true);
    const hadZoom = zoom !== 1;
    if (hadZoom) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    try {
      const dataUrl = await toPng(contentRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${productName}-${view}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative rounded-2xl border border-ui-border bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{VIEW_LABELS[view]}</p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={`Descargar vista ${VIEW_LABELS[view]}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-dark shadow-[0_4px_10px_rgba(0,0,0,0.12)] transition-transform duration-150 ease-out hover:scale-110 disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative mx-auto overflow-hidden rounded-xl bg-[#F5F5F5]"
        style={{ width: "100%", aspectRatio: asset.aspect, cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div
          ref={contentRef}
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 150ms ease-out",
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
              }}
            >
              {el.type === "logo" ? (
                el.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={el.src} alt="" className="h-full w-full select-none object-contain" draggable={false} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-gray-400 bg-white/85 text-[7px] text-ui-gray">
                    .AI
                  </div>
                )
              ) : (
                <div
                  className="flex h-full w-full items-center overflow-hidden whitespace-nowrap"
                  style={{
                    fontFamily: el.fontFamily || "var(--font-dm-sans), sans-serif",
                    color: el.color || "#1a1a1a",
                    fontWeight: el.bold ? 700 : 400,
                    fontStyle: el.italic ? "italic" : "normal",
                    letterSpacing: `${el.letterSpacing ?? 0}px`,
                    justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
                    fontSize: "clamp(8px, 3.5cqw, 32px)",
                  }}
                >
                  {el.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex min-h-[26px] flex-wrap items-center gap-1.5">
        {isEmpty ? (
          <span className="text-xs text-ui-gray/70">Sin personalización</span>
        ) : (
          <>
            {hasLogo && <Tag>🏷 Logo</Tag>}
            {hasText && <Tag>🔤 Texto</Tag>}
            {technique && <Tag>{techniqueEmoji(technique.name)} {technique.name}</Tag>}
          </>
        )}
      </div>
    </div>
  );
}

export default function PreviewModal({
  open,
  onClose,
  elements,
  productName,
  technique,
  resolvedAssets,
  garmentColor,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  elements: ViewElements;
  productName: string;
  technique: PrintTechnique | null;
  resolvedAssets: ResolvedProductAssets;
  garmentColor: GarmentColor;
  onConfirm: () => void;
}) {
  const [entered, setEntered] = useState(false);
  // Only show views the user actually put art in — an untouched view (no
  // logo, no text) never appears here, same "real placed instance" check
  // MiniView already uses for its own "Sin personalización" tag/isEmpty.
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
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-[#FAFAFA] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] transition-all duration-200 ease-out sm:p-8 ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Vista previa del producto</h2>
            <p className="mt-0.5 text-sm text-ui-gray">Revisa las cuatro caras antes de agregarlo al carrito.</p>
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {viewsWithArt.map((view) => (
              <MiniView
                key={view}
                view={view}
                elements={elements}
                productName={productName}
                technique={technique}
                resolvedAssets={resolvedAssets}
                garmentColor={garmentColor}
              />
            ))}
          </div>
        )}

        <div className="mt-7 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center rounded-full border-2 border-foreground text-base font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)]"
          >
            Volver al editor
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-primary text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)]"
          >
            Confirmar diseño
          </button>
        </div>
      </div>
    </div>
  );
}