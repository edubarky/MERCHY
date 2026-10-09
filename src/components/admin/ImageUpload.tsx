"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  productId: string;
  variantId: string;
  existingUrls: string[];
  onUpdate: (urls: string[]) => void;
}

export default function ImageUpload({ productId, variantId, existingUrls, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const supabase = createClient();

  // Flechas de teclado / Escape para navegar la vista previa sin tener que
  // apuntarle a los botones (pedido explícito, ver charla 2026-10-09).
  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? i : (i + 1) % existingUrls.length));
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? i : (i - 1 + existingUrls.length) % existingUrls.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, existingUrls.length]);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        setError("Una imagen supera 5 MB.");
        continue;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${productId}/${variantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(`Error: ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      newUrls.push(publicUrl);
    }

    const updated = [...existingUrls, ...newUrls];
    onUpdate(updated);

    // Persist to DB
    await supabase
      .from("product_variants")
      .update({ images: updated })
      .eq("id", variantId);

    setUploading(false);
  }

  async function removeImage(url: string) {
    const updated = existingUrls.filter((u) => u !== url);
    onUpdate(updated);
    await supabase
      .from("product_variants")
      .update({ images: updated })
      .eq("id", variantId);
  }

  // La portada del catálogo usa la PRIMERA foto de este color (ver charla
  // 2026-10-09) -- promueve `url` al frente del arreglo, mismo patrón de
  // persistencia que handleFiles/removeImage de arriba.
  async function makeCover(url: string) {
    const updated = [url, ...existingUrls.filter((u) => u !== url)];
    onUpdate(updated);
    await supabase
      .from("product_variants")
      .update({ images: updated })
      .eq("id", variantId);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {existingUrls.map((url, idx) => (
          <div key={url} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-ui-border flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              onClick={() => setLightboxIdx(idx)}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-semibold text-white">
                Portada
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {idx !== 0 && (
                <button
                  onClick={() => makeCover(url)}
                  className="text-white"
                  title="Usar como portada"
                >
                  ★
                </button>
              )}
              <button
                onClick={() => removeImage(url)}
                className="text-white text-lg"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-ui-border hover:border-primary flex items-center justify-center text-ui-gray hover:text-primary transition-colors flex-shrink-0"
        >
          {uploading ? (
            <span className="text-xs">...</span>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute right-6 top-6 text-3xl text-white/80 hover:text-white"
            title="Cerrar"
          >
            ×
          </button>

          {existingUrls.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i === null ? i : (i - 1 + existingUrls.length) % existingUrls.length));
              }}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
              title="Anterior"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={existingUrls[lightboxIdx]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
          />

          {existingUrls.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i === null ? i : (i + 1) % existingUrls.length));
              }}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
              title="Siguiente"
            >
              ›
            </button>
          )}

          {existingUrls.length > 1 && (
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/70">
              {lightboxIdx + 1} / {existingUrls.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
