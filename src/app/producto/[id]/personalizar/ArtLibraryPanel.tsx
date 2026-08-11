"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtAsset } from "@/lib/artLibrary/ArtLibraryContext";

function AssetThumbnail({
  asset,
  onSelect,
  onRemove,
}: {
  asset: ArtAsset;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border border-ui-border bg-white transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Colocar ${asset.fileName}`}
        className="flex h-full w-full items-center justify-center p-3"
      >
        {asset.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.src} alt={asset.fileName} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-400 bg-white/85 p-1 text-center">
            <span className="text-[10px] font-semibold uppercase text-ui-gray">{asset.fileType}</span>
            <span className="truncate px-1 text-[8px] leading-tight text-ui-gray">{asset.fileName}</span>
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar ${asset.fileName}`}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ui-gray opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity duration-150 ease-out hover:text-accent-coral group-hover:opacity-100"
      >
        ✕
      </button>

      {confirming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/95 p-2 text-center backdrop-blur-sm">
          <p className="text-[11px] font-medium leading-tight text-foreground">¿Eliminar este arte?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-ui-border px-2.5 py-1 text-[10px] font-semibold text-foreground transition-colors duration-150 hover:border-primary"
            >
              No
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full bg-accent-coral px-2.5 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-105"
            >
              Sí
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtLibraryPanel({
  open,
  onClose,
  assets,
  onSelect,
  onRemove,
  onAddNew,
}: {
  open: boolean;
  onClose: () => void;
  assets: ArtAsset[];
  onSelect: (asset: ArtAsset) => void;
  onRemove: (id: string) => void;
  onAddNew: (file: File) => void;
}) {
  const [entered, setEntered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[28px] bg-[#FAFAFA] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] transition-all duration-200 ease-out sm:p-8 ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Mis artes</h2>
            <p className="mt-0.5 text-sm text-ui-gray">Reutiliza tus logos y diseños en cualquier vista o producto.</p>
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

        {assets.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="mb-1 font-semibold text-foreground">Aún no has subido ningún arte</p>
            <p className="mb-6 text-sm text-ui-gray">Los logos y diseños que agregues aparecerán aquí para reutilizarlos.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
            >
              + Agregar nuevo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {assets.map((asset) => (
              <AssetThumbnail
                key={asset.id}
                asset={asset}
                onSelect={() => onSelect(asset)}
                onRemove={() => onRemove(asset.id)}
              />
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ui-border text-ui-gray transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              <span className="text-xl font-light leading-none">+</span>
              <span className="px-1 text-center text-[10px] font-semibold leading-tight">Agregar nuevo</span>
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.pdf,.ai"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddNew(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </div>
    </div>
  );
}