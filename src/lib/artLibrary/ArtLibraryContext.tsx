"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LogoFileType } from "@/app/producto/[id]/personalizar/types";

// "Mis artes" — a session-scoped library of uploaded logo/image files,
// independent of any single product or view. Wrapped around the whole app
// (see layout.tsx, same pattern as CartProvider) specifically so it
// survives client-side navigation between different products' /personalizar
// pages, not just between Frente/Reverso/Izquierda/Derecha tabs within one
// product — Next.js client-side routing never unmounts this provider, so
// the object URLs created here stay valid across that navigation. It does
// NOT survive a hard page reload (blob URLs can't survive that regardless
// of how the reference is stored), which matches "durante toda la sesión
// del personalizador" rather than permanent storage.
export interface ArtAsset {
  id: string;
  fileName: string;
  fileType: LogoFileType;
  src?: string; // object URL — absent for "ai"/"pdf" (no in-browser preview possible)
  addedAt: number;
}

interface ArtLibraryContextValue {
  assets: ArtAsset[];
  addAsset: (file: File) => ArtAsset;
  removeAsset: (id: string) => void;
}

const ArtLibraryContext = createContext<ArtLibraryContextValue | null>(null);

function classifyFile(file: File): { fileType: LogoFileType; src?: string } {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const fileType: LogoFileType = ext === "svg" || ext === "png" || ext === "pdf" || ext === "ai" ? ext : "png";
  const renderable = fileType === "svg" || fileType === "png";
  return { fileType, src: renderable ? URL.createObjectURL(file) : undefined };
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ArtLibraryProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<ArtAsset[]>([]);

  // Registers the file exactly once — the returned asset's `src` is the
  // single object URL every future placement of this art will reuse, never
  // a fresh one per placement.
  const addAsset = useCallback((file: File): ArtAsset => {
    const { fileType, src } = classifyFile(file);
    const asset: ArtAsset = { id: uid(), fileName: file.name, fileType, src, addedAt: Date.now() };
    setAssets((prev) => [...prev, asset]);
    return asset;
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <ArtLibraryContext.Provider value={{ assets, addAsset, removeAsset }}>{children}</ArtLibraryContext.Provider>
  );
}

export function useArtLibrary() {
  const ctx = useContext(ArtLibraryContext);
  if (!ctx) throw new Error("useArtLibrary must be used within an ArtLibraryProvider");
  return ctx;
}