"use client";

import type { ArtAsset } from "@/lib/artLibrary/ArtLibraryContext";
import { FolderIcon, ChevronRightIcon } from "./Icons";

// Cuántas miniaturas caben en la tarjeta antes de mandar al usuario a la
// galería completa (el modal ArtLibraryPanel, que ya existe y ya soporta
// eliminar/agregar/reutilizar cualquier cantidad). 4 coincide con la
// referencia visual (grid de 2 columnas en móvil, 4 en pantallas normales
// -- ver className abajo).
const VISIBLE_DESKTOP = 4;

function DesignThumb({ asset, onSelect, onRemove }: { asset: ArtAsset; onSelect: () => void; onRemove: () => void }) {
  return (
    <div className="min-w-0">
      <div className="group relative aspect-square overflow-hidden rounded-2xl border border-ui-border bg-white transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Usar ${asset.fileName}`}
          className="flex h-full w-full items-center justify-center p-2.5"
        >
          {asset.src ? (
            // La imagen real, completa y sin recortar -- object-contain,
            // nunca object-cover, para nunca alterar el arte original.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.src} alt={asset.fileName} className="h-full w-full object-contain" draggable={false} />
          ) : (
            <span className="text-[10px] font-semibold uppercase text-ui-gray">{asset.fileType}</span>
          )}
        </button>

        {/* Una sola "×" que elimina directo -- sin confirmación intermedia,
            por pedido explícito ("eliminar rápido"). Misma acción de
            eliminar que ya existía, solo sin el paso "•••" -> "¿Eliminar?"
            Sí/No de antes. */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar ${asset.fileName}`}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-ui-gray opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity duration-150 ease-out hover:text-accent-coral group-hover:opacity-100"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 truncate text-[11px] text-ui-gray" title={asset.fileName}>
        {asset.fileName}
      </p>
    </div>
  );
}

export default function DesignsPreviewCard({
  assets,
  onOpenAll,
  onSelect,
  onRemove,
}: {
  assets: ArtAsset[];
  onOpenAll: () => void;
  onSelect: (asset: ArtAsset) => void;
  onRemove: (id: string) => void;
}) {
  const hasAssets = assets.length > 0;
  const visible = assets.slice(0, VISIBLE_DESKTOP);
  const hasMore = assets.length > VISIBLE_DESKTOP;

  return (
    <div className="rounded-2xl bg-primary/[0.06] p-4">
      {/* Encabezado -- misma identidad visual/comportamiento de siempre:
          abre la galería completa. Sigue siendo el único punto de entrada
          cuando todavía no hay ningún diseño (estado vacío intacto). */}
      <button
        type="button"
        onClick={onOpenAll}
        className="group flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-dark">
          <FolderIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Tus diseños</span>
          <span className="block text-xs text-ui-gray">Archivos que has subido</span>
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
      </button>

      {hasAssets && (
        <>
          {/* Clases literales a propósito -- Tailwind no puede resolver
              nombres de clase interpolados en tiempo de ejecución, solo
              texto literal presente en el código fuente. */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visible.map((asset) => (
              <DesignThumb key={asset.id} asset={asset} onSelect={() => onSelect(asset)} onRemove={() => onRemove(asset.id)} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={onOpenAll}
              className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-semibold text-primary-dark transition-colors duration-150 ease-out hover:text-primary"
            >
              Ver todos mis diseños
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}