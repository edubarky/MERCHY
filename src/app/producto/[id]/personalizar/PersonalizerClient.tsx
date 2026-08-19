"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import type { Product, ProductVariant, PriceTier, PrintTechnique, CartItem, CustomizationElement } from "@/types";
import { getProductUnitPrice, getTechniquePrice, formatMXN } from "@/lib/pricing";
import { useCart } from "@/lib/cart/CartContext";
import CartPopover from "@/components/cart/CartPopover";
import { useArtLibrary, type ArtAsset } from "@/lib/artLibrary/ArtLibraryContext";
import {
  VIEW_ORDER,
  VIEW_LABELS,
  emptyViewElements,
  type ViewName,
  type DesignElement,
  type ViewElements,
  type GarmentColor,
  type ResolvedProductAssets,
} from "./types";
import { VIEW_ASSETS } from "./viewAssets";
import { getPrintArea } from "./printAreas";
import DesignElementView, { DEFAULT_FONT_SIZE_PX } from "./DesignElementView";
import PrintAreaGuide from "./PrintAreaGuide";

import ArtLibraryPanel from "./ArtLibraryPanel";
import SelectionToolbar from "./SelectionToolbar";
import PrintTechniqueCards from "./PrintTechniqueCards";
import PreviewModal from "./PreviewModal";
import {
  TextToolIcon,
  ImageToolIcon,
  LayersIcon,
  UndoIcon,
  RedoIcon,
  ArrowRightIcon,
  GarmentTabIcon,
  EyeIcon,
  CartIcon,
  FolderIcon,
  ChevronRightIcon,
  SparkleIcon,
} from "./Icons";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
  techniques: PrintTechnique[];
  resolvedAssets: ResolvedProductAssets;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Reads an image's real natural pixel dimensions — the source of truth for
// sizing a newly-placed logo's box to its own actual aspect ratio (see
// placeAsset). Object URLs (what every renderable asset's `src` is) decode
// from memory, so this resolves essentially instantly — no visible delay.
// Resolves null on failure so the caller can fall back.
function loadImageNaturalSizePx(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function ToolDockButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_8px_20px_rgba(87,224,217,0.35)] ${
        active ? "bg-primary text-white" : "bg-white text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function PersonalizerClient({ product, priceTiers, techniques, resolvedAssets }: Props) {
  const [activeView, setActiveView] = useState<ViewName>("frente");
  const [filesTabView, setFilesTabView] = useState<ViewName>("frente");
  const [elements, setElements] = useState<ViewElements>(emptyViewElements());
  const [history, setHistory] = useState<ViewElements[]>([emptyViewElements()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [zCounter, setZCounter] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [garmentColor, setGarmentColor] = useState<GarmentColor>("blanco");
  // Drives the discreet "fuera de la superficie del producto" notice — no
  // print-area rectangle involved anymore, this just tracks whether the
  // selected element's own bounding box currently sits fully inside the
  // canvas (the full product photo). See DesignElementView's
  // isWithinCanvas(); the notice shows only while true is false and
  // something is selected.
  const [interactionInBounds, setInteractionInBounds] = useState(true);
  const [artLibraryOpen, setArtLibraryOpen] = useState(false);

  const { addItem, totalItems, justAdded } = useCart();
  const { assets: artAssets, addAsset, removeAsset } = useArtLibrary();

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cartWrapperRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef({ history, historyIndex });
  historyRef.current = { history, historyIndex };

  useEffect(() => {
    if (!cartOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (cartWrapperRef.current && !cartWrapperRef.current.contains(e.target as Node)) {
        setCartOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cartOpen]);

  // Auto blanco/negro switch TEMPORALMENTE DESACTIVADO — por ahora TODAS las
  // prendas deben mostrarse siempre en blanco, sin importar el color del
  // arte/logo/texto colocado. `garmentColor` ya nace en "blanco" (ver
  // useState arriba) y, con este efecto fuera, nada más lo modifica —
  // ningún selector manual de color existe en la UI actual, así que queda
  // fijo. La lógica de análisis de brillo (colorAnalysis.ts,
  // analyzeDesignLuminance/LUMINANCE_THRESHOLD) NO se borra, solo se deja de
  // invocar aquí — reconectar este mismo efecto es lo único necesario para
  // reactivarla cuando existan más colores de prenda con sus ejes propios.

  // No shared generic mockup fallback here on purpose: the Personalizador
  // must only ever show the actual selected product's own photography, per
  // explicit product decision — never a shirt illustration that could be
  // mistaken for a different product. VIEW_ASSETS is still used below for
  // canvas aspect-ratio only, never for its `src` or its `printArea` (print
  // area comes from printAreas.ts's per-product/per-view config now).
  function getViewSrc(view: ViewName, color: GarmentColor): string | null {
    return resolvedAssets[view][color];
  }

  const asset = VIEW_ASSETS[activeView];
  const hasRealPhoto = getViewSrc(activeView, "blanco") !== null || getViewSrc(activeView, "negro") !== null;
  const selectedElement = elements[activeView].find((e) => e.id === selectedId) ?? null;

  // Fresh selection always starts "in bounds" (it was just placed/spawned
  // validly) — only an active drag/resize/rotate on it can mark it out.
  useEffect(() => {
    setInteractionInBounds(true);
  }, [selectedId]);

  const commit = useCallback((next: ViewElements) => {
    setElements(next);
    setHistory((prev) => {
      const truncated = prev.slice(0, historyRef.current.historyIndex + 1);
      return [...truncated, next];
    });
    setHistoryIndex((i) => i + 1);
  }, []);

  const undo = useCallback(() => {
    const { history: h, historyIndex: idx } = historyRef.current;
    if (idx === 0) return;
    setHistoryIndex(idx - 1);
    setElements(h[idx - 1]);
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    const { history: h, historyIndex: idx } = historyRef.current;
    if (idx >= h.length - 1) return;
    setHistoryIndex(idx + 1);
    setElements(h[idx + 1]);
    setSelectedId(null);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const deleteElement = useCallback(
    (id: string) => {
      const next = { ...elements, [activeView]: elements[activeView].filter((e) => e.id !== id) };
      commit(next);
      setSelectedId(null);
    },
    [elements, activeView, commit]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Suprimir/Delete/Backspace deletes the currently selected element —
      // but never while the user is typing somewhere (text edit mode's own
      // <input> in DesignElementView, the quantity/size/color/etc. fields
      // in this toolbar) — there Backspace must keep deleting characters,
      // not the element. Checking the focused element covers every such
      // field generically, with no need to know about them individually.
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement | null;
        const isEditableField =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable);
        if (isEditableField || !selectedId) return;
        e.preventDefault();
        deleteElement(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, deleteElement, selectedId]);

  function addElement(el: DesignElement) {
    const next = { ...elements, [el.view]: [...elements[el.view], el] };
    commit(next);
    setSelectedId(el.id);
  }

  // Live in-bounds status while dragging/resizing/rotating the selected
  // element (see DesignElementView's onInteraction) — the guide itself is
  // always shown while something is selected (see `selectedElement` below);
  // this only controls whether it reads as "safe" (turquoise) or "fuera
  // del área" (coral).
  function handleElementInteraction(_active: boolean, inBounds: boolean) {
    setInteractionInBounds(inBounds);
  }

  function updateElement(id: string, patch: Partial<DesignElement>) {
    const next = { ...elements, [activeView]: elements[activeView].map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    commit(next);
  }

  function duplicateElement(id: string) {
    const el = elements[activeView].find((e) => e.id === id);
    if (!el) return;
    const z = zCounter + 1;
    setZCounter(z);
    addElement({
      ...el,
      id: uid(),
      xPct: Math.min(el.xPct + 4, 100 - el.widthPct),
      yPct: Math.min(el.yPct + 4, 100 - el.heightPct),
      zIndex: z,
    });
  }

  function bringToFront(id: string) {
    const z = zCounter + 1;
    setZCounter(z);
    updateElement(id, { zIndex: z });
  }

  function sendToBack(id: string) {
    const minZ = Math.min(0, ...elements[activeView].map((e) => e.zIndex));
    updateElement(id, { zIndex: minZ - 1 });
  }

  // Places an already-registered "Mis artes" asset onto the active view as
  // a brand-new, independent instance (its own position/size/rotation) —
  // used both right after a fresh upload and when picking an existing
  // asset from the library. The asset itself (fileName/fileType/src) is
  // never duplicated, only referenced.
  //
  // The initial box is sized to the art's own real aspect ratio (see
  // loadImageNaturalSizePx below), fit inside the same max footprint the
  // print-area-based box used to occupy outright — same math as CSS
  // `object-fit: contain`, just applied to the element's own width/height
  // instead of only to how the <img> renders inside it. Without this, a
  // logo whose aspect ratio doesn't match the print area's own shape would
  // render letterboxed (via the `object-contain` on the <img> itself),
  // leaving empty space inside the box that Moveable's handles/hit-area
  // still cover — i.e. a bounding box bigger than the actual art, which is
  // exactly the "false print area" feel this fixes.
  async function placeAsset(asset: ArtAsset) {
    const z = zCounter + 1;
    setZCounter(z);
    const pa = getPrintArea(product.name, activeView);
    // Fallback (and the max footprint art is fit inside): used outright
    // whenever the real natural size can't be read (no src — e.g. .ai/.pdf
    // — or the image fails to decode).
    let w = pa.widthPct * 0.6;
    let h = pa.heightPct * 0.6;

    if (asset.src) {
      const natural = await loadImageNaturalSizePx(asset.src);
      const containerRect = canvasRef.current?.getBoundingClientRect();
      if (natural && containerRect && containerRect.width > 0 && containerRect.height > 0) {
        const maxWidthPx = (w / 100) * containerRect.width;
        const maxHeightPx = (h / 100) * containerRect.height;
        const scale = Math.min(maxWidthPx / natural.width, maxHeightPx / natural.height);
        w = ((natural.width * scale) / containerRect.width) * 100;
        h = ((natural.height * scale) / containerRect.height) * 100;
      }
    }

    addElement({
      id: uid(),
      type: "logo",
      view: activeView,
      assetId: asset.id,
      fileName: asset.fileName,
      fileType: asset.fileType,
      src: asset.src,
      xPct: pa.xPct + (pa.widthPct - w) / 2,
      yPct: pa.yPct + (pa.heightPct - h) / 2,
      widthPct: w,
      heightPct: h,
      rotation: 0,
      zIndex: z,
    });
  }

  function handleLogoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const asset = addAsset(files[0]);
    placeAsset(asset);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAddText() {
    const z = zCounter + 1;
    setZCounter(z);
    const pa = getPrintArea(product.name, activeView);
    // This starting box is only a placeholder to seed a reasonable center
    // point — DesignElementView's auto-fit effect immediately (before
    // paint) re-measures the real text content and snaps width/height to
    // it, recentered on this same center. widthPct/heightPct/fontSizePx
    // here never stay as authored below.
    const w = pa.widthPct * 0.4;
    const h = pa.heightPct * 0.15;
    addElement({
      id: uid(),
      type: "text",
      view: activeView,
      text: "Tu texto aquí",
      fontFamily: "DM Sans",
      fontSizePx: DEFAULT_FONT_SIZE_PX,
      color: "#1a1a1a",
      bold: false,
      italic: false,
      align: "center",
      letterSpacing: 0,
      xPct: pa.xPct + (pa.widthPct - w) / 2,
      yPct: pa.yPct + (pa.heightPct - h) / 2,
      widthPct: w,
      heightPct: h,
      rotation: 0,
      zIndex: z,
    });
  }

  const garmentUnit = getProductUnitPrice(product.costo, quantity, priceTiers);
  const numElements = VIEW_ORDER.reduce((sum, v) => sum + elements[v].length, 0);
  const selectedTechnique = techniques.find((t) => t.id === selectedTechniqueId) ?? null;
  const techniqueTotal = selectedTechnique ? getTechniquePrice(selectedTechnique, quantity, numElements) : 0;
  const unitPrice = garmentUnit + techniqueTotal;
  const subtotal = unitPrice * quantity;
  const total = subtotal;

  const uniqueColors = new Set(
    VIEW_ORDER.flatMap((v) => elements[v].filter((e) => e.type === "text").map((e) => e.color || "#1a1a1a"))
  ).size;

  async function handleAddToCart() {
    if (addingToCart) return;
    setAddingToCart(true);
    try {
      let canvasDataUrl = "";
      if (canvasRef.current && numElements > 0) {
        try {
          canvasDataUrl = await toPng(canvasRef.current, { pixelRatio: 2 });
        } catch {
          canvasDataUrl = "";
        }
      }

      const variant = product.variants.find((v) => v.active) ?? product.variants[0];
      const logos: CustomizationElement[] = [];
      const texts: CustomizationElement[] = [];
      VIEW_ORDER.forEach((v) => {
        elements[v].forEach((el) => {
          const shared = { x: el.xPct, y: el.yPct, width: el.widthPct, height: el.heightPct, rotation: el.rotation };
          if (el.type === "logo") logos.push({ type: "logo", url: el.src, ...shared });
          else texts.push({ type: "text", text: el.text, ...shared });
        });
      });

      const newItem: CartItem = {
        id: uid(),
        product,
        variants: variant
          ? [{ variant_id: variant.id, color_name: variant.color_name, color_hex: variant.color_hex, qty: quantity, sizes_breakdown: {} }]
          : [],
        total_quantity: quantity,
        technique_id: selectedTechnique?.id ?? null,
        technique: selectedTechnique ?? undefined,
        num_elements: numElements,
        customization_snapshot: numElements > 0 ? { canvas_data_url: canvasDataUrl, logos, texts, applied_to: "all" } : null,
        unit_price: unitPrice,
        total_price: total,
      };

      addItem(newItem);
      setSelectedId(null);
      setCartOpen(true);
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start lg:gap-10">
      {/* ── Canvas (izquierda, ~65%) ── */}
      <div className="w-full lg:w-[65%]">
        <div className="relative rounded-[24px] bg-white p-8 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {VIEW_ORDER.map((v) => {
                const active = activeView === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setActiveView(v);
                      setFilesTabView(v);
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 border-b-[3px] pb-3 transition-all duration-200 ease-out ${
                      active ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <GarmentTabIcon className={`h-4 w-4 transition-colors duration-200 ${active ? "text-primary" : "text-ui-gray"}`} />
                    <span className={`text-sm font-semibold transition-colors duration-200 ${active ? "text-foreground" : "text-ui-gray"}`}>
                      {VIEW_LABELS[v]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setPreviewOpen(true);
                }}
                aria-label="Vista previa del producto personalizado"
                className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.14)]"
              >
                <EyeIcon className="h-6 w-6" />
              </button>

              <div ref={cartWrapperRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setCartOpen((v) => !v);
                  }}
                  aria-label="Carrito"
                  aria-expanded={cartOpen}
                  className="relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.14)]"
                >
                  <CartIcon className="h-6 w-6" />
                  {totalItems > 0 && (
                    <span
                      className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white ${
                        justAdded ? "animate-total-pulse" : ""
                      }`}
                    >
                      {totalItems}
                    </span>
                  )}
                </button>
                <CartPopover open={cartOpen} />
              </div>
            </div>
          </div>

          {selectedElement && (
            <div className="mb-5">
              <SelectionToolbar
                element={selectedElement}
                onChange={updateElement}
                onDuplicate={() => duplicateElement(selectedElement.id)}
                onDelete={() => deleteElement(selectedElement.id)}
                onBringFront={() => bringToFront(selectedElement.id)}
                onSendBack={() => sendToBack(selectedElement.id)}
              />
            </div>
          )}

          <div className="relative flex justify-center">
            {/* Barra de herramientas flotante */}
            <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
              <ToolDockButton label="Texto" onClick={handleAddText}>
                <TextToolIcon className="h-5 w-5" />
              </ToolDockButton>
              <ToolDockButton label="Imagen" onClick={() => fileInputRef.current?.click()}>
                <ImageToolIcon className="h-5 w-5" />
              </ToolDockButton>
              <ToolDockButton label="Capas" active={layersOpen} onClick={() => setLayersOpen((v) => !v)}>
                <LayersIcon className="h-5 w-5" />
              </ToolDockButton>
            </div>

            <div
              ref={canvasRef}
              className="relative"
              style={{ height: "min(75vh, 720px)", aspectRatio: asset.aspect }}
              onMouseDown={() => setSelectedId(null)}
            >
              {hasRealPhoto ? (
                (["blanco", "negro"] as GarmentColor[]).map((c) => {
                  const src = getViewSrc(activeView, c);
                  if (!src) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={c}
                      src={src}
                      alt={`${product.name} — ${VIEW_LABELS[activeView]}`}
                      className={`pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-[250ms] ease-out ${
                        garmentColor === c ? "opacity-100" : "opacity-0"
                      }`}
                      draggable={false}
                    />
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-50">
                  <p className="text-sm text-ui-gray">Fotografías no disponibles aún</p>
                </div>
              )}

              {elements[activeView].map((el) => (
                <DesignElementView
                  key={el.id}
                  element={el}
                  containerRef={canvasRef}
                  selected={selectedId === el.id}
                  onSelect={setSelectedId}
                  onChange={updateElement}
                  onInteraction={handleElementInteraction}
                />
              ))}

              <PrintAreaGuide visible={Boolean(selectedElement) && !interactionInBounds} />
            </div>

            {layersOpen && (
              <div className="absolute right-6 top-0 z-20 w-60 rounded-2xl border border-ui-border bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ui-gray">Capas — {VIEW_LABELS[activeView]}</p>
                {elements[activeView].length === 0 ? (
                  <p className="text-xs text-ui-gray">Sin elementos.</p>
                ) : (
                  <div className="space-y-1">
                    {[...elements[activeView]]
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => setSelectedId(el.id)}
                          className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors duration-150 ease-out ${
                            selectedId === el.id ? "bg-primary/15 font-semibold text-foreground" : "text-ui-gray hover:bg-gray-50"
                          }`}
                        >
                          {el.type === "logo" ? el.fileName : `“${el.text}”`}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Deshacer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-foreground"
            >
              <UndoIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Rehacer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-foreground"
            >
              <RedoIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel (derecha, ~35%) ── */}
      <aside className="w-full lg:sticky lg:top-8 lg:w-[35%]">
        <div className="space-y-10 rounded-[24px] bg-white p-8 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
          <div>
            <h1 className="font-display text-[40px] font-bold uppercase leading-[1.05] text-foreground">{product.name}</h1>
            <p className="mt-2 text-base text-ui-gray">{product.sku}</p>
          </div>

          <div>
            <span className="mb-1 block text-2xl font-bold text-foreground">3. Personaliza tu producto</span>
            <p className="mb-4 text-sm text-ui-gray">Agrega un logo o crea un texto personalizado</p>

            {/* Tus diseños — biblioteca/atajo a lo ya subido, tarjeta horizontal de ancho completo */}
            <button
              type="button"
              onClick={() => setArtLibraryOpen(true)}
              className="group flex w-full items-center gap-3 rounded-2xl bg-primary/[0.06] px-4 py-3.5 text-left transition-all duration-200 ease-out hover:bg-primary/[0.1]"
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

            {/* Agregar logo / Agregar texto — acciones para crear elementos nuevos */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center gap-3 rounded-2xl border border-ui-border bg-white px-4 py-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_rgba(87,224,217,0.15)] active:translate-y-0 active:bg-primary/5"
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50">
                  <ImageToolIcon className="h-5 w-5 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-white">
                    +
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">Agregar logo</span>
                  <span className="block text-xs text-ui-gray">Sube tu logotipo o imagen</span>
                </span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="group flex items-center gap-3 rounded-2xl border border-ui-border bg-white px-4 py-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_rgba(87,224,217,0.15)] active:translate-y-0 active:bg-primary/5"
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50">
                  <TextToolIcon className="h-5 w-5 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-white">
                    +
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">Agregar texto</span>
                  <span className="block text-xs text-ui-gray">Crea un texto personalizado</span>
                </span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.pdf,.ai"
              className="hidden"
              onChange={(e) => handleLogoFiles(e.target.files)}
            />

            <div className="mt-5">
              <div className="mb-3 flex gap-6 text-sm">
                {VIEW_ORDER.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFilesTabView(v)}
                    className={`border-b-2 pb-1.5 transition-all duration-200 ease-out ${
                      filesTabView === v ? "border-primary font-semibold text-foreground" : "border-transparent text-ui-gray hover:text-foreground"
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
              {elements[filesTabView].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ui-border px-6 py-8 text-center">
                  <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <SparkleIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-bold text-foreground">Sin elementos en esta vista.</p>
                  <p className="mt-1 text-xs text-ui-gray">Agrega un logo o texto para comenzar a diseñar.</p>
                </div>
              ) : (
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-2xl border border-ui-border p-2">
                  {elements[filesTabView].map((el) => (
                    <div
                      key={el.id}
                      onClick={() => {
                        setActiveView(filesTabView);
                        setSelectedId(el.id);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 ease-out hover:bg-primary/10"
                    >
                      <span className="truncate text-foreground">{el.type === "logo" ? el.fileName : `“${el.text}”`}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView(filesTabView);
                          deleteElement(el.id);
                        }}
                        className="ml-2 shrink-0 text-ui-gray transition-colors duration-150 hover:text-accent-coral"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="mb-4 block text-2xl font-bold text-foreground">4. Selecciona el Tipo de impresión</span>
            {/* Solo esta fila "sangra" fuera del padding del panel (-mx-8) para
                ganar el máximo ancho posible sin tocar el padding compartido
                por el resto de secciones — el título arriba se queda alineado
                como siempre. */}
            <div className="-mx-8">
              <PrintTechniqueCards techniques={techniques} selectedId={selectedTechniqueId} onSelect={setSelectedTechniqueId} />
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="rounded-2xl border border-ui-border p-6">
            <p className="mb-5 text-base font-bold text-foreground">Resumen del pedido</p>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Cantidad</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-ui-border text-foreground transition-colors duration-150 ease-out hover:border-primary hover:text-primary"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-foreground">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-ui-border text-foreground transition-colors duration-150 ease-out hover:border-primary hover:text-primary"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Tipo de impresión</span>
                  <span className="font-semibold text-foreground">{selectedTechnique?.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Colores de impresión</span>
                  <span className="font-semibold text-foreground">
                    {uniqueColors} Color{uniqueColors === 1 ? "" : "es"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Logos / Elementos</span>
                  <span className="font-semibold text-foreground">{numElements} Elemento{numElements === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div className="space-y-3 border-l border-ui-border pl-8 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Precio unitario</span>
                  <span className="font-semibold text-foreground">{formatMXN(unitPrice)} MXN</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ui-gray">Subtotal ({quantity} unidades)</span>
                  <span className="font-semibold text-foreground">{formatMXN(subtotal)} MXN</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/10 px-6 py-5">
              <div>
                <p className="text-lg font-bold text-foreground">Total</p>
                <p className="text-xs text-ui-gray">IVA incluido</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatMXN(total)} <span className="text-sm font-normal text-ui-gray">MXN</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href={`/producto/${product.id}`}
              className="flex h-14 flex-1 items-center justify-center rounded-full border-2 border-foreground text-base font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)]"
            >
              Atrás
            </Link>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)] disabled:opacity-60"
            >
              {addingToCart ? "Agregando..." : "Siguiente"} <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        elements={elements}
        productName={product.name}
        technique={selectedTechnique}
        resolvedAssets={resolvedAssets}
        garmentColor={garmentColor}
        onConfirm={() => {
          setPreviewOpen(false);
          handleAddToCart();
        }}
      />

      <ArtLibraryPanel
        open={artLibraryOpen}
        onClose={() => setArtLibraryOpen(false)}
        assets={artAssets}
        onSelect={(asset) => {
          placeAsset(asset);
          setArtLibraryOpen(false);
        }}
        onRemove={removeAsset}
        onAddNew={(file) => {
          const asset = addAsset(file);
          placeAsset(asset);
          setArtLibraryOpen(false);
        }}
      />
    </div>
  );
}