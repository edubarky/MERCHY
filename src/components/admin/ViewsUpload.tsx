"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VIEW_ORDER, VIEW_LABELS } from "@/app/producto/[id]/personalizar/types";

interface Props {
  productId: string;
  variantId: string;
  existingViews: Record<string, string> | null | undefined;
  onUpdate: (views: Record<string, string>) => void;
}

// Slots fijos que puede tener CUALQUIER producto (ver types.ts) + "con
// modelo" -- no todos aplican a todos los productos (getApplicableViews en
// printAreas.ts decide cuáles se muestran realmente en el Personalizador),
// así que un slot que este producto no usa simplemente se queda vacío y
// sin efecto, en vez de necesitar una lista distinta por producto aquí.
const SLOTS: { key: string; label: string }[] = [
  ...VIEW_ORDER.map((v) => ({ key: v, label: VIEW_LABELS[v] })),
  { key: "conModelo", label: "Con modelo" },
];

export default function ViewsUpload({ productId, variantId, existingViews, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const supabase = createClient();

  const views = existingViews ?? {};
  const filledCount = SLOTS.filter((s) => views[s.key]).length;

  async function handleFile(key: string, file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen supera 5 MB.");
      return;
    }
    setUploadingKey(key);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `products/${productId}/${variantId}/views/${key}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(`Error: ${uploadError.message}`);
      setUploadingKey(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    const updated = { ...views, [key]: publicUrl };
    onUpdate(updated);
    await supabase.from("product_variants").update({ views: updated }).eq("id", variantId);
    setUploadingKey(null);
  }

  async function removeView(key: string) {
    const updated = { ...views };
    delete updated[key];
    onUpdate(updated);
    await supabase.from("product_variants").update({ views: updated }).eq("id", variantId);
  }

  return (
    <div className="mt-3 pt-3 border-t border-ui-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-ui-gray hover:text-primary transition-colors flex items-center gap-1"
      >
        <svg
          viewBox="0 0 16 16" className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
        Vistas del Personalizador ({filledCount}/{SLOTS.length})
      </button>

      {open && (
        <div className="mt-3 flex flex-wrap gap-3">
          {SLOTS.map((slot) => {
            const url = views[slot.key];
            return (
              <div key={slot.key} className="flex flex-col items-center gap-1 w-20">
                <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-ui-border flex-shrink-0 bg-gray-50">
                  {url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={slot.label} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeView(slot.key)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-lg"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => inputRefs.current[slot.key]?.click()}
                      disabled={uploadingKey === slot.key}
                      className="w-full h-full flex items-center justify-center text-ui-gray hover:text-primary hover:border-primary transition-colors"
                    >
                      {uploadingKey === slot.key ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-ui-gray text-center leading-tight">{slot.label}</span>
                <input
                  ref={(el) => { inputRefs.current[slot.key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(slot.key, e.target.files[0])}
                />
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
