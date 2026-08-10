"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import type { Product, ProductVariant, PriceTier, PrintTechnique, CartItem, CustomizationElement } from "@/types";
import { getProductUnitPrice, getTechniquePrice, formatMXN } from "@/lib/pricing";
import { useCart } from "@/lib/cart/CartContext";
import CartPopover from "@/components/cart/CartPopover";
import {
  VIEW_ORDER,
  VIEW_LABELS,
  emptyViewElements,
  type ViewName,
  type DesignElement,
  type ViewElements,
  type LogoFileType,
  type GarmentColor,
  type ResolvedProductAssets,
} from "./types";
import { VIEW_ASSETS } from "./viewAssets";
import { analyzeDesignLuminance, LUMINANCE_THRESHOLD } from "./colorAnalysis";
import DesignElementView from "./DesignElementView";
import SelectionToolbar from "./SelectionToolbar";
import PrintTechniqueCards from "./PrintTechniqueCards";
import PreviewModal from "./PreviewModal";
import {
  CursorIcon,
  TextToolIcon,
  ImageToolIcon,
  LayersIcon,
  UndoIcon,
  RedoIcon,
  ArrowRightIcon,
  GarmentTabIcon,
  EyeIcon,
  CartIcon,
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

function ToolDockButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
  const [printAreaPx, setPrintAreaPx] = useState<{ left: number; top: number; right: number; bottom: number } | null>(
    null
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [garmentColor, setGarmentColor] = useState<GarmentColor>("blanco");

  const { addItem, totalItems, justAdded } = useCart();

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

  // Auto blanco/negro switch: re-analyzes every logo/text across all four
  // views on every change and flips the whole garment to whichever color
  // gives the design the most contrast. No elements → back to blanco.
  useEffect(() => {
    let cancelled = false;
    analyzeDesignLuminance(elements).then((avg) => {
      if (cancelled) return;
      if (avg === null) {
        setGarmentColor("blanco");
        return;
      }
      setGarmentColor(avg > LUMINANCE_THRESHOLD ? "negro" : "blanco");
    });
    return () => {
      cancelled = true;
    };
  }, [elements]);

  // No shared generic mockup fallback here on purpose: the Personalizador
  // must only ever show the actual selected product's own photography, per
  // explicit product decision — never a shirt illustration that could be
  // mistaken for a different product. VIEW_ASSETS is still used below for
  // layout geometry only (aspect ratio, print-area %), never for its `src`.
  function getViewSrc(view: ViewName, color: GarmentColor): string | null {
    return resolvedAssets[view][color];
  }

  const asset = VIEW_ASSETS[activeView];
  const hasRealPhoto = getViewSrc(activeView, "blanco") !== null || getViewSrc(activeView, "negro") !== null;
  const selectedElement = elements[activeView].find((e) => e.id === selectedId) ?? null;

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (!ctrlOrCmd || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    function recompute() {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const pa = VIEW_ASSETS[activeView].printArea;
      const rightAbs = ((pa.xPct + pa.widthPct) / 100) * rect.width;
      const bottomAbs = ((pa.yPct + pa.heightPct) / 100) * rect.height;
      setPrintAreaPx({
        left: (pa.xPct / 100) * rect.width,
        top: (pa.yPct / 100) * rect.height,
        right: rect.width - rightAbs,
        bottom: rect.height - bottomAbs,
      });
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [activeView]);

  function addElement(el: DesignElement) {
    const next = { ...elements, [el.view]: [...elements[el.view], el] };
    commit(next);
    setSelectedId(el.id);
  }

  function updateElement(id: string, patch: Partial<DesignElement>) {
    const next = { ...elements, [activeView]: elements[activeView].map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    commit(next);
  }

  function deleteElement(id: string) {
    const next = { ...elements, [activeView]: elements[activeView].filter((e) => e.id !== id) };
    commit(next);
    setSelectedId(null);
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

  function handleLogoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const fileType: LogoFileType = ext === "svg" || ext === "png" || ext === "pdf" || ext === "ai" ? ext : "png";
    const renderable = fileType === "svg" || fileType === "png";
    const src = renderable ? URL.createObjectURL(file) : undefined;
    const z = zCounter + 1;
    setZCounter(z);
    const pa = VIEW_ASSETS[activeView].printArea;
    const w = pa.widthPct * 0.6;
    const h = pa.heightPct * 0.6;
    addElement({
      id: uid(),
      type: "logo",
      view: activeView,
      fileName: file.name,
      fileType,
      src,
      xPct: pa.xPct + (pa.widthPct - w) / 2,
      yPct: pa.yPct + (pa.heightPct - h) / 2,
      widthPct: w,
      heightPct: h,
      rotation: 0,
      zIndex: z,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAddText() {
    const z = zCounter + 1;
    setZCounter(z);
    const pa = VIEW_ASSETS[activeView].printArea;
    const w = pa.widthPct * 0.85;
    const h = pa.heightPct * 0.5;
    addElement({
      id: uid(),
      type: "text",
      view: activeView,
      text: "Tu texto aquí",
      fontFamily: "DM Sans",
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

  const sizes = product.sizes_available;

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
              <ToolDockButton label="Seleccionar" active={!selectedId} onClick={() => setSelectedId(null)}>
                <CursorIcon className="h-5 w-5" />
              </ToolDockButton>
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
                  printAreaPx={printAreaPx}
                  selected={selectedId === el.id}
                  onSelect={setSelectedId}
                  onChange={updateElement}
                />
              ))}

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setSelectedId(null);
                  setPreviewOpen(true);
                }}
                aria-label="Vista previa del producto personalizado"
                className="absolute -bottom-6 -right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out hover:scale-110"
              >
                <EyeIcon className="h-6 w-6" />
              </button>
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
            {product.description && <p className="mt-4 text-base leading-relaxed text-gray-700">{product.description}</p>}
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ui-gray">
              {product.composition && (
                <span>
                  <span className="font-semibold text-foreground">Composición:</span> {product.composition}
                </span>
              )}
              {sizes.length > 0 && (
                <span>
                  <span className="font-semibold text-foreground">Tallas:</span>{" "}
                  {sizes.length > 1 ? `${sizes[0]} – ${sizes[sizes.length - 1]}` : sizes[0]}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">3. Agrega tu logo</span>
              <span className="text-sm font-semibold text-ui-gray">Archivos</span>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-14 flex-1 transition-transform duration-180 ease-out hover:-translate-y-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Home/PERSONALIZADOR/BOTÓN LOGO.svg" alt="+ Logo" className="h-full w-full" />
                <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[0_0_0_4px_rgba(87,224,217,0.3)] transition-opacity duration-200 ease-out group-hover:opacity-100" />
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="group relative h-14 flex-1 transition-transform duration-180 ease-out hover:-translate-y-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Home/PERSONALIZADOR/BOTÓN TEXTO.svg" alt="+ Texto" className="h-full w-full" />
                <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[0_0_0_4px_rgba(87,224,217,0.3)] transition-opacity duration-200 ease-out group-hover:opacity-100" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.pdf,.ai"
              className="hidden"
              onChange={(e) => handleLogoFiles(e.target.files)}
            />

            <div className="mt-5 rounded-2xl border border-ui-border p-4">
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
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {elements[filesTabView].length === 0 ? (
                  <p className="text-sm text-ui-gray">Sin elementos en esta vista.</p>
                ) : (
                  elements[filesTabView].map((el) => (
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
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <span className="mb-4 block text-2xl font-bold text-foreground">4. Selecciona el Tipo de impresión</span>
            <PrintTechniqueCards techniques={techniques} selectedId={selectedTechniqueId} onSelect={setSelectedTechniqueId} />
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
    </div>
  );
}