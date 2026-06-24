"use client";

import { useRef, useState } from "react";
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
  const supabase = createClient();

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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {existingUrls.map((url) => (
          <div key={url} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-ui-border flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(url)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-lg"
              title="Eliminar"
            >
              ×
            </button>
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
    </div>
  );
}
