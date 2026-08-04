"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { VIEW_ORDER, VIEW_LABELS, type ViewElements } from "./types";
import { VIEW_ASSETS } from "./viewAssets";

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5" />
      <path d="M4 15.5v.5A2 2 0 0 0 6 18h8a2 2 0 0 0 2-2v-.5" />
    </svg>
  );
}

function MiniView({ view, elements, productName }: { view: (typeof VIEW_ORDER)[number]; elements: ViewElements; productName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const asset = VIEW_ASSETS[view];

  async function handleDownload() {
    if (!ref.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${productName}-${view}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative rounded-2xl border border-ui-border bg-white p-3">
      <p className="mb-2 text-center text-sm font-semibold text-foreground">{VIEW_LABELS[view]}</p>
      <div
        ref={ref}
        className="relative mx-auto overflow-hidden rounded-xl bg-[#F5F5F5]"
        style={{ width: "100%", aspectRatio: asset.aspect }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.src} alt={VIEW_LABELS[view]} className="absolute inset-0 h-full w-full object-contain" />
        {elements[view].map((el) => (
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
                <img src={el.src} alt="" className="h-full w-full object-contain" />
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
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Descargar vista ${VIEW_LABELS[view]}`}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.12)] text-primary-dark transition-transform duration-150 ease-out hover:scale-110 disabled:opacity-50"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PreviewModal({
  open,
  onClose,
  elements,
  productName,
}: {
  open: boolean;
  onClose: () => void;
  elements: ViewElements;
  productName: string;
}) {
  const [entered, setEntered] = useState(false);

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
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-250 ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[28px] bg-[#FAFAFA] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] transition-all duration-250 ease-out sm:p-8 ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Vista previa general</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-150 ease-out hover:scale-110"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VIEW_ORDER.map((view) => (
            <MiniView key={view} view={view} elements={elements} productName={productName} />
          ))}
        </div>
      </div>
    </div>
  );
}