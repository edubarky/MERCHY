"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LogoFileType } from "@/app/producto/[id]/personalizar/types";

// "Mis artes" — biblioteca PERMANENTE del usuario (tabla `saved_logos` +
// bucket de Storage `saved-logos`, ver supabase/migrations/008), no un
// estado de la sesión del navegador. Sobrevive salir del personalizador,
// cambiar de producto, y cerrar/volver a abrir la página, porque vive en
// la base de datos asociada al usuario real (auth.uid()), no en memoria.
// Sigue envuelto en el layout raíz (mismo lugar/patrón que CartProvider) —
// eso ya no es lo que la hace sobrevivir la navegación (ahora es la base
// de datos), pero mantiene la carga inicial en un solo lugar.
//
// La tienda pública no tenía ningún sistema de autenticación de clientes
// antes de esto (confirmado: supabase.auth solo se usaba en middleware.ts
// y dentro de /admin). En vez de construir cuentas de cliente nuevas
// (fuera de alcance, y se pidió explícitamente no crear una segunda
// arquitectura de usuarios), se usa el inicio de sesión ANÓNIMO de
// Supabase Auth — la MISMA arquitectura de auth.users/RLS que
// `saved_logos` ya tenía diseñada, solo que sin pedirle registro a nadie.
// Cada visitante recibe un auth.uid() real la primera vez que hace falta,
// y Supabase persiste esa sesión sola (su propio localStorage interno) —
// por eso la biblioteca sigue ahí en visitas futuras desde el mismo
// navegador. Requiere que "Anonymous Sign-Ins" esté habilitado en el
// Dashboard de Supabase (Authentication → Providers); si no lo está,
// ensureSession() falla limpiamente (biblioteca vacía, resto de la app
// intacto) en vez de romper nada.
export interface ArtAsset {
  id: string;
  fileName: string;
  fileType: LogoFileType;
  src?: string; // URL pública del archivo en Storage — ausente para "ai"/"pdf" (sin preview en el navegador, igual que antes)
  storagePath: string; // ruta real dentro del bucket "saved-logos" — para poder borrar el objeto real al eliminar
  addedAt: number;
}

interface ArtLibraryContextValue {
  assets: ArtAsset[];
  loading: boolean;
  addAsset: (file: File) => Promise<ArtAsset | null>;
  removeAsset: (id: string) => void;
}

const ArtLibraryContext = createContext<ArtLibraryContextValue | null>(null);

const BUCKET = "saved-logos";

interface SavedLogoRow {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

function detectFileType(fileName: string): LogoFileType {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return ext === "svg" || ext === "png" || ext === "pdf" || ext === "ai" ? (ext as LogoFileType) : "png";
}

// `saved_logos` no guarda la ruta de Storage por separado (no se agregó
// ninguna columna nueva a una tabla que ya existía) — se reconstruye a
// partir de la URL pública real, que siempre sigue este mismo formato.
function storagePathFromPublicUrl(url: string): string {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? "" : url.slice(idx + marker.length);
}

function rowToAsset(row: SavedLogoRow): ArtAsset {
  const fileName = row.file_name ?? "archivo";
  const fileType = detectFileType(fileName);
  const renderable = fileType === "svg" || fileType === "png";
  return {
    id: row.id,
    fileName,
    fileType,
    src: renderable ? row.file_url : undefined,
    storagePath: storagePathFromPublicUrl(row.file_url),
    addedAt: new Date(row.created_at).getTime(),
  };
}

export function ArtLibraryProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<ArtAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const userIdRef = useRef<string | null>(null);

  // Garantiza una sesión (la real si el usuario algún día tiene una, o
  // anónima) antes de tocar saved_logos/Storage — una sola vez, la primera
  // vez que hace falta, no en cada llamada.
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (userIdRef.current) return userIdRef.current;
    const supabase = supabaseRef.current;
    const { data: existing } = await supabase.auth.getUser();
    if (existing.user) {
      userIdRef.current = existing.user.id;
      return existing.user.id;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.error("No se pudo iniciar sesión para 'Tus diseños':", error?.message);
      return null;
    }
    userIdRef.current = data.user.id;
    return data.user.id;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await ensureSession();
      if (!userId || cancelled) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabaseRef.current
        .from("saved_logos")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setAssets((data as SavedLogoRow[]).map(rowToAsset));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureSession]);

  // Sube el archivo real a Storage, guarda su fila en saved_logos, y
  // devuelve el asset ya listo para colocarse en el canvas — el mismo
  // archivo subido es el que queda guardado permanentemente, no una copia
  // aparte. null si no se pudo (sin sesión, o falla la subida/el insert) —
  // el llamador simplemente no coloca nada, sin romper el resto de la app.
  const addAsset = useCallback(async (file: File): Promise<ArtAsset | null> => {
    const userId = await ensureSession();
    if (!userId) return null;
    const supabase = supabaseRef.current;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (uploadError) {
      console.error("No se pudo subir el archivo a 'Tus diseños':", uploadError.message);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("saved_logos")
      .insert({ user_id: userId, file_url: publicUrl, file_name: file.name, file_size: file.size, thumbnail_url: publicUrl })
      .select()
      .single();

    if (insertError || !row) {
      console.error("No se pudo guardar el diseño en la biblioteca:", insertError?.message);
      return null;
    }

    const asset = rowToAsset(row as SavedLogoRow);
    setAssets((prev) => [asset, ...prev]);
    return asset;
  }, [ensureSession]);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => {
      const asset = prev.find((a) => a.id === id);
      if (asset) {
        const supabase = supabaseRef.current;
        // Fire-and-forget: la UI ya se actualizó de forma optimista arriba
        // (setAssets), y no hay ningún flujo que dependa de esperar esta
        // limpieza en el servidor.
        supabase.from("saved_logos").delete().eq("id", id);
        if (asset.storagePath) supabase.storage.from(BUCKET).remove([asset.storagePath]);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  return (
    <ArtLibraryContext.Provider value={{ assets, loading, addAsset, removeAsset }}>
      {children}
    </ArtLibraryContext.Provider>
  );
}

export function useArtLibrary() {
  const ctx = useContext(ArtLibraryContext);
  if (!ctx) throw new Error("useArtLibrary must be used within an ArtLibraryProvider");
  return ctx;
}