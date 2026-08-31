"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import type { Product, ProductVariant, PriceTier, PrintTechnique, CartItem, CustomizationElement } from "@/types";
import {
  getProductUnitPrice,
  findQtyPrice,
  findTintasPrice,
  findSizePrice,
  roundUpToConfiguredSize,
  formatMXN,
} from "@/lib/pricing";
import { useCart } from "@/lib/cart/CartContext";
import { useArtLibrary, type ArtAsset } from "@/lib/artLibrary/ArtLibraryContext";
import {
  VIEW_ORDER,
  VIEW_LABELS,
  emptyViewElements,
  normalizeGarmentColorName,
  GARMENT_COLORS,
  type ViewName,
  type DesignElement,
  type ViewElements,
  type GarmentColor,
  type ResolvedProductAssets,
} from "./types";
import { VIEW_ASSETS } from "./viewAssets";
import { getPrintArea, getApplicableViews } from "./printAreas";
import DesignElementView, { DEFAULT_FONT_SIZE_PX, FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX } from "./DesignElementView";
import PrintAreaGuide from "./PrintAreaGuide";

import ArtLibraryPanel from "./ArtLibraryPanel";
import DesignsPreviewCard from "./DesignsPreviewCard";
import SelectionToolbar from "./SelectionToolbar";
import PrintTechniqueCards from "./PrintTechniqueCards";
import TechniqueDetailCard from "./TechniqueDetailCard";
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
  SparkleIcon,
} from "./Icons";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
  techniques: PrintTechnique[];
  resolvedAssets: ResolvedProductAssets;
  // El color de la prenda ya se eligió en la página del producto (ver
  // ProductDetail.tsx) -- este es el id de esa variante, pasado por
  // page.tsx vía ?variant=. El Personalizador NUNCA vuelve a mostrar el
  // selector completo de los 6 colores: solo carga los ejes de este color
  // específico (o de la lista acotada de multicolorVariantIds, ver abajo).
  // null cuando no llegó ninguno (ej. un link viejo sin el query param) --
  // en ese caso cae al mismo comportamiento de siempre (primera variante
  // activa).
  initialVariantId: string | null;
  // Solo presente cuando el usuario activó "Multicolor" en la página del
  // producto Y seleccionó MÁS de un color (ver ProductDetail.tsx / page.tsx
  // ?colors=). Cuando llega con 2+ ids reales de este producto, el
  // Personalizador muestra una barra para alternar ÚNICAMENTE entre esos
  // colores -- nunca los 6. null (Multicolor apagado, o solo un color
  // elegido) significa "sin barra", igual que el comportamiento de antes.
  multicolorVariantIds: string[] | null;
  // La cantidad que el cliente ya eligió en "2. Selecciona Cantidad" de la
  // ficha del producto (ver ProductDetail.tsx / page.tsx ?qty=). El
  // Personalizador arranca con esa misma cantidad -- antes siempre volvía
  // a 1, lo que además dejaba el precio por tramos de cada técnica
  // desincronizado del que el cliente ya había visto. null (link viejo/sin
  // el query param, o un valor inválido) -> 1, mismo comportamiento de
  // siempre.
  initialQuantity: number | null;
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

export default function PersonalizerClient({
  product,
  priceTiers,
  techniques,
  resolvedAssets,
  initialVariantId,
  multicolorVariantIds,
  initialQuantity,
}: Props) {
  const [activeView, setActiveView] = useState<ViewName>("frente");
  const [filesTabView, setFilesTabView] = useState<ViewName>("frente");
  const [elements, setElements] = useState<ViewElements>(emptyViewElements());
  const [history, setHistory] = useState<ViewElements[]>([emptyViewElements()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Drag-over highlight while a file is dragged over the canvas — a ref
  // counter (not a plain boolean) because dragenter/dragleave fire once
  // per child element the pointer crosses, not just for the container as
  // a whole; without counting, moving over the product photo/an existing
  // design element inside the canvas would fire a spurious dragleave and
  // flicker the highlight off mid-drag.
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const dragCounterRef = useRef(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  // Selección múltiple: el usuario puede activar varias técnicas a la vez
  // (ej. DTF Textil + Bordado), cada una suma su propio precio por
  // separado. Cada técnica seleccionada pide su propio parámetro (ver
  // PrintTechnique.pricing_type) — nunca se inventa un valor por defecto
  // que no haya escrito el usuario. Ambos guardan texto crudo tal cual lo
  // escribe (no number), igual que cualquier otro <input> controlado de
  // este archivo — se parsean solo al calcular el precio. "Posiciones" ya
  // NO es un campo que el usuario escribe -- se deriva en vivo de en qué
  // ejes (frente/reverso/izquierda/derecha) hay elementos colocados (ver
  // activePositionLabels más abajo), así que no necesita su propio estado.
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
  const [techniqueTintas, setTechniqueTintas] = useState<Record<string, string>>({});
  // Medida por LOGO, no una sola compartida por técnica: técnica -> id de
  // elemento -> {largo, alto}. Se agrupan visualmente por posición
  // (Frente/Reverso/Izquierda/Derecha) en la tarjeta, con un panel propio
  // por cada logo de esa posición -- pedido explícito: "si el usuario
  // agregó 2 logos en la parte de enfrente, ahí va 2 y se desglosan 2
  // paneles donde se va a especificar las medidas de largo y ancho".
  const [techniqueLogoSizeCm, setTechniqueLogoSizeCm] = useState<Record<string, Record<string, { largo: string; alto: string }>>>(
    {}
  );
  // El stepper se había quitado de "Resumen del pedido" por pedido
  // explícito -- pero regresa aquí: los tramos de precio por cantidad de
  // la tabla de cada técnica (ej. DTF Textil: 1-9/10-49/50-99/...) dependen
  // de esta cantidad real de PRENDAS del pedido (confirmado explícitamente
  // con el usuario), no del número de logos -- sin un control editable
  // aquí, esos tramos nunca pueden bajar de precio, que es justo el bug
  // reportado ("si el usuario agrega más piezas el costo baja"). Arranca
  // en `initialQuantity` (la cantidad que el cliente ya eligió en la ficha
  // del producto) en vez de siempre en 1 -- así el precio por tramos
  // coincide desde el inicio con lo que ya vio ahí.
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  // Input SIEMPRE visible y editable (no click-to-edit, se reportó como
  // "muy complicado") -- un cuadro de texto normal entre los botones -/+,
  // igual que cualquier campo de cantidad estándar. qtyDraft es el texto
  // crudo que se ve mientras se escribe (para poder borrar y volver a
  // teclear sin que se resetee a cada tecla); se confirma a `quantity` en
  // cada cambio válido y también al perder el foco (por si queda vacío).
  const [qtyDraft, setQtyDraft] = useState(String(initialQuantity ?? 1));
  const [zCounter, setZCounter] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  // Drives the discreet "fuera de la superficie del producto" notice — no
  // print-area rectangle involved anymore, this just tracks whether the
  // selected element's own bounding box currently sits fully inside the
  // canvas (the full product photo). See DesignElementView's
  // isWithinCanvas(); the notice shows only while true is false and
  // something is selected.
  const [interactionInBounds, setInteractionInBounds] = useState(true);
  const [artLibraryOpen, setArtLibraryOpen] = useState(false);

  // El botón/popover de carrito interno de este panel se eliminó -- el
  // carrito ahora vive únicamente en PublicHeader (barra superior, ver
  // page.tsx), que ya usa este mismo CartContext, así que el conteo/pulso
  // sigue siendo el carrito real de la plataforma, no uno nuevo. `addItem`
  // es lo único que este componente todavía necesita del contexto.
  const { addItem } = useCart();
  const { assets: artAssets, loading: artLibraryLoading, addAsset, removeAsset } = useArtLibrary();

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef({ history, historyIndex });
  historyRef.current = { history, historyIndex };
  // Mismo patrón que historyRef -- addElement/updateElement/etc. leen esto
  // (nunca el `elements` cerrado en el render) para no perder un elemento.
  // Bug real confirmado: dos subidas rápidas seguidas a la MISMA vista (ej.
  // 2 logos en Frente) son asíncronas (addAsset sube a Supabase antes de
  // poder colocarse) -- si la segunda `addElement` corría con el `elements`
  // capturado en un render viejo (antes de que la primera terminara de
  // re-renderizar), pisaba el arreglo y el primer logo desaparecía.
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  // Portapapeles interno para Ctrl/Cmd+C + Ctrl/Cmd+V sobre el elemento
  // seleccionado (logo o texto) -- pedido explícito para que duplicar sea
  // tan fácil como en cualquier editor real. Guarda una copia de los datos
  // del elemento en el momento del copy (no solo el id, porque el usuario
  // puede seguir editándolo o incluso borrarlo antes de pegar). Vive fuera
  // de React state a propósito: copiar/pegar no debe generar historial de
  // undo por sí solo, solo el pegado (que sí crea un elemento real).
  const copiedElementRef = useRef<DesignElement | null>(null);

  // El/los color(es) de la prenda YA se eligieron en la página del producto
  // (ver ProductDetail.tsx's "1. Selecciona Color" + el switch Multicolor)
  // — el Personalizador nunca vuelve a mostrar el selector completo de los
  // 6 colores. Dos casos, controlados por si `multicolorVariantIds` llegó
  // (ver Props):
  //  - Un solo color (Multicolor apagado, o encendido pero con solo un
  //    color tocado): la prenda queda completamente fija durante toda la
  //    sesión, igual que antes -- ninguna barra se dibuja.
  //  - Varios colores + Multicolor activo: SÍ aparece una barra, pero
  //    ÚNICAMENTE con esos colores ya elegidos (nunca los 6) -- sirve para
  //    alternar entre ellos, no para elegir uno nuevo. `activeVariantId`
  //    es lo único que cambia al tocar la barra; `elements` (los diseños
  //    colocados) nunca se tocan, así el arte se conserva igual en
  //    cualquiera de los colores.
  // `initialVariantId` (siempre presente, ver Props) decide cuál de los
  // colores se muestra primero en ambos casos.
  const barVariants = (multicolorVariantIds ?? [])
    .map((id) => product.variants.find((v) => v.id === id))
    .filter((v): v is ProductVariant => !!v)
    // Orden canónico fijo (blanco, negro, royal, marino, rojo, gris) --
    // no el orden en que el usuario los fue tocando en la página del
    // producto, para que la barra siempre se lea igual.
    .sort((a, b) => {
      const ia = GARMENT_COLORS.indexOf(normalizeGarmentColorName(a.color_name) ?? "blanco");
      const ib = GARMENT_COLORS.indexOf(normalizeGarmentColorName(b.color_name) ?? "blanco");
      return ia - ib;
    });
  const showColorBar = barVariants.length > 1;

  const fallbackVariant = product.variants.find((v) => v.active) ?? product.variants[0] ?? null;
  const [activeVariantId, setActiveVariantId] = useState<string | null>(initialVariantId ?? fallbackVariant?.id ?? null);
  const activeVariant = product.variants.find((v) => v.id === activeVariantId) ?? fallbackVariant;
  const garmentColor: GarmentColor = (activeVariant && normalizeGarmentColorName(activeVariant.color_name)) ?? "blanco";

  // No shared generic mockup fallback here on purpose: the Personalizador
  // must only ever show the actual selected product's own photography, per
  // explicit product decision — never a shirt illustration that could be
  // mistaken for a different product. VIEW_ASSETS is still used below for
  // canvas aspect-ratio only, never for its `src` or its `printArea` (print
  // area comes from printAreas.ts's per-product/per-view config now).
  function getViewSrc(view: ViewName, color: GarmentColor): string | null {
    return resolvedAssets[view][color];
  }

  // Qué pestañas de eje mostrar en el canvas -- no todo el catálogo es una
  // prenda con cuatro costados (ver getApplicableViews). El resto del
  // catálogo sigue viendo los 4 de siempre, sin cambio de comportamiento.
  const applicableViews = getApplicableViews(product.name);

  const asset = VIEW_ASSETS[activeView];
  // Único eje que este Personalizador carga para la vista activa: el del
  // color ya elegido en la página del producto. No se resuelven ni cargan
  // los ejes de ningún otro color.
  const activeViewSrc = getViewSrc(activeView, garmentColor);
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

  // Shift+ArrowRight/ArrowLeft grows/shrinks the currently selected element
  // — same keepRatio-preserving scaling react-moveable's own corner-drag
  // already does, just driven by keyboard instead of a mouse gesture. Text
  // scales via `fontSizePx` (DesignElementView's own auto-fit effect then
  // re-measures and resizes the box, exactly like a real corner drag ends
  // for text — see that file's onResizeEnd for the mouse equivalent); logos
  // scale `widthPct`/`heightPct` directly, both anchored on the element's
  // own current center so it grows/shrinks in place rather than drifting
  // toward a corner.
  const RESIZE_STEP_FACTOR = 1.06;
  const LOGO_MIN_PCT = 1;

  function resizeSelectedElementByKeyboard(direction: 1 | -1) {
    const el = elements[activeView].find((e) => e.id === selectedId);
    if (!el) return;
    const factor = direction === 1 ? RESIZE_STEP_FACTOR : 1 / RESIZE_STEP_FACTOR;

    if (el.type === "text") {
      const currentPx = el.fontSizePx ?? DEFAULT_FONT_SIZE_PX;
      const nextPx = Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, currentPx * factor));
      updateElement(el.id, { fontSizePx: nextPx });
      return;
    }

    const centerXPct = el.xPct + el.widthPct / 2;
    const centerYPct = el.yPct + el.heightPct / 2;
    const nextWidthPct = Math.max(LOGO_MIN_PCT, el.widthPct * factor);
    const nextHeightPct = Math.max(LOGO_MIN_PCT, el.heightPct * factor);
    updateElement(el.id, {
      widthPct: nextWidthPct,
      heightPct: nextHeightPct,
      xPct: centerXPct - nextWidthPct / 2,
      yPct: centerYPct - nextHeightPct / 2,
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isEditableField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Suprimir/Delete/Backspace deletes the currently selected element —
      // but never while the user is typing somewhere (text edit mode's own
      // <input> in DesignElementView, the quantity/size/color/etc. fields
      // in this toolbar) — there Backspace must keep deleting characters,
      // not the element. Checking the focused element covers every such
      // field generically, with no need to know about them individually.
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isEditableField || !selectedId) return;
        e.preventDefault();
        deleteElement(selectedId);
        return;
      }

      // Shift+flecha resizes the selected element. This needs a NARROWER
      // guard than Delete/Backspace above: it must still be blocked while
      // literally typing the design's own text content (the type="text"
      // inline edit <input> in DesignElementView, or any future
      // contentEditable/textarea), where Shift+Arrow is a real text-
      // selection gesture — but it must NOT be blocked just because focus
      // happens to be sitting in an unrelated numeric field like the
      // toolbar's "Rotación" input (type="number", the only other input
      // this toolbar has besides the color swatch) — real reported bug:
      // clicking that field (or any non-text control) before pressing the
      // shortcut made it silently do nothing, since the broader
      // isEditableField check above treated every input the same way.
      const isTypingFreeText =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text"));
      if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        if (isTypingFreeText || !selectedId) return;
        e.preventDefault();
        resizeSelectedElementByKeyboard(e.key === "ArrowRight" ? 1 : -1);
        return;
      }

      // Ctrl/Cmd+C copia el elemento seleccionado a copiedElementRef; el
      // pegado real ocurre en el listener "paste" de abajo (mismo evento
      // nativo que ya maneja pegar una imagen del portapapeles del SO), no
      // aquí en el keydown de "v" -- así los dos flujos (pegar una imagen
      // externa vs. pegar un elemento copiado dentro del propio lienzo)
      // conviven en un solo lugar sin arriesgarse a disparar los dos a la
      // vez. Mismo criterio que Shift+flecha arriba: se ignora mientras se
      // esté escribiendo texto libre de verdad, pero SÍ actúa aunque el
      // foco esté en un campo numérico como "Rotación" -- ahí Ctrl+C no
      // tiene nada útil que copiar de todos modos.
      if (ctrlOrCmd && e.key.toLowerCase() === "c") {
        if (isTypingFreeText || !selectedId) return;
        const el = elementsRef.current[activeView].find((item) => item.id === selectedId);
        if (el) {
          copiedElementRef.current = el;
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, deleteElement, selectedId, elements, activeView]);

  // Ctrl/Cmd+V hace dos cosas distintas con el mismo evento nativo "paste",
  // en este orden de prioridad: 1) si el portapapeles del SO trae una
  // imagen real (screenshot, archivo copiado de Finder), la coloca como
  // logo nuevo -- comportamiento original, intacto; 2) si no, y el usuario
  // copió un elemento del lienzo con Ctrl/Cmd+C (ver copiedElementRef +
  // onKeyDown arriba), pega una copia de ESE elemento -- duplicar así de
  // fácil era un pedido explícito ("que el usuario tenga facilidad... una
  // gran experiencia"). Mismo guard que el Shift+flecha: se ignora
  // mientras se esté escribiendo texto libre de verdad (el <input> de
  // edición de un texto del diseño, una futura textarea/contentEditable),
  // para no secuestrar un paste normal ahí; en cualquier otro punto de la
  // página (incluyendo con el foco en un campo numérico como "Rotación",
  // o sin foco en nada) actúa sobre el lienzo.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTypingFreeText =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text"));
      if (isTypingFreeText) return;

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              placeUploadedFile(file);
            }
            return;
          }
        }
      }

      // Sin imagen real en el portapapeles del SO -- si el usuario copió un
      // elemento del propio lienzo con Ctrl/Cmd+C (ver onKeyDown arriba),
      // este es el Ctrl/Cmd+V que lo pega: una copia nueva en la vista
      // activa ahora mismo (puede ser otra distinta a la que tenía cuando
      // se copió), con su propio id y ligeramente desplazada para que no
      // quede exactamente encima del original.
      const copied = copiedElementRef.current;
      if (copied) {
        e.preventDefault();
        const z = zCounter + 1;
        setZCounter(z);
        addElement({
          ...copied,
          id: uid(),
          view: activeView,
          xPct: Math.min(copied.xPct + 4, 100 - copied.widthPct),
          yPct: Math.min(copied.yPct + 4, 100 - copied.heightPct),
          zIndex: z,
        });
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, zCounter]);

  function addElement(el: DesignElement) {
    const current = elementsRef.current;
    const next = { ...current, [el.view]: [...current[el.view], el] };
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
    const current = elementsRef.current;
    const next = { ...current, [activeView]: current[activeView].map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    commit(next);
  }

  function duplicateElement(id: string) {
    const el = elementsRef.current[activeView].find((e) => e.id === id);
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
    const minZ = Math.min(0, ...elementsRef.current[activeView].map((e) => e.zIndex));
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

  // Shared by every way a file can reach the canvas — the hidden file
  // input's own onChange, dropping a file onto the canvas, and pasting an
  // image from the clipboard (Ctrl/Cmd+V). addAsset uploads to the user's
  // permanent library (Supabase) before it can be placed — null if that
  // failed (no session, network error, etc.), in which case nothing is
  // placed, without breaking anything else.
  async function placeUploadedFile(file: File) {
    const asset = await addAsset(file);
    if (asset) placeAsset(asset);
  }

  async function handleLogoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    await placeUploadedFile(file);
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

  function toggleTechnique(id: string) {
    setSelectedTechniqueIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Único punto que cambia la cantidad real -- lo usan tanto los botones
  // -/+ como el cuadro de texto, así los dos siempre quedan sincronizados
  // sin necesidad de un efecto aparte tratando de adivinar cuál "manda".
  function setQty(next: number) {
    const clamped = Math.max(1, Math.floor(next));
    setQuantity(clamped);
    setQtyDraft(String(clamped));
  }

  function handleQtyDraftChange(raw: string) {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setQtyDraft(digitsOnly);
    const parsed = parseInt(digitsOnly, 10);
    if (Number.isFinite(parsed) && parsed > 0) setQuantity(parsed);
  }

  function handleQtyDraftBlur() {
    // Cuadro vacío o en 0 al salir -- vuelve a mostrar la cantidad real
    // (mínimo 1) en vez de quedarse vacío.
    if (!qtyDraft || parseInt(qtyDraft, 10) <= 0) setQtyDraft(String(quantity));
  }

  // Tamaño (ej. "10x10") a usar para calcular el precio "by_size" de UN
  // logo en particular (ya no una sola medida compartida por técnica --
  // cada logo tiene la suya). Se redondea siempre hacia el tamaño
  // configurado inmediato superior de esa técnica, nunca hacia abajo --
  // nunca se inventa un tamaño que no exista en la tabla de precios (si
  // el logo excede el tamaño configurado más grande, o el campo sigue
  // vacío, regresa null y el llamador lo trata como "requiere cotización"
  // para ese logo).
  function resolveLogoSize(technique: PrintTechnique, elementId: string): string | null {
    const dims = techniqueLogoSizeCm[technique.id]?.[elementId];
    const largo = parseFloat(dims?.largo ?? "");
    const alto = parseFloat(dims?.alto ?? "");
    if (!Number.isFinite(largo) || !Number.isFinite(alto) || largo <= 0 || alto <= 0) return null;
    const sizeOptions = Array.from(new Set(technique.price_table.map((t) => t.size).filter((s): s is string => !!s)));
    return roundUpToConfiguredSize(largo, alto, sizeOptions);
  }

  const garmentUnit = getProductUnitPrice(product.costo, quantity, priceTiers);
  const numElements = applicableViews.reduce((sum, v) => sum + elements[v].length, 0);
  const allLogoElements = applicableViews.flatMap((v) => elements[v].filter((e) => e.type === "logo"));
  const numLogoElements = allLogoElements.length;
  // "Posiciones" (tarjeta de detalle de cada técnica): los ejes reales
  // donde el cliente ya colocó algún LOGO en el canvas, agrupados con
  // cuántos logos hay en cada uno -- ya no un número que se escriba a
  // mano, ni una sola medida compartida. Mismos VIEW_LABELS que ya se
  // usan en las pestañas Frente/Reverso/Izquierda/Derecha de arriba. Es
  // el mismo para las 4 vistas sin importar cuál esté activa ahora mismo,
  // porque la técnica aplica al diseño completo, no a una vista.
  const logosByView = applicableViews.map((v) => ({
    view: v,
    viewLabel: VIEW_LABELS[v],
    logos: elements[v].filter((e) => e.type === "logo"),
  })).filter((g) => g.logos.length > 0);
  const activePositionLabels = logosByView.map((g) => g.viewLabel);

  // Cada técnica calcula su propio precio según su pricing_type (ver
  // types/index.ts) y se suma al total — nunca se inventa un precio: si
  // falta el parámetro (tintas/tamaño) o no hay un renglón que coincida
  // exacto, unitPrice queda en null y needsQuote en true.
  interface TechniqueResult {
    technique: PrintTechnique;
    unitPrice: number | null;
    needsQuote: boolean;
  }
  const techniqueResults: TechniqueResult[] = selectedTechniqueIds
    .map((id) => techniques.find((t) => t.id === id))
    .filter((t): t is PrintTechnique => !!t)
    .map((technique): TechniqueResult => {
      if (technique.pricing_type === "by_qty") {
        if (numElements === 0) return { technique, unitPrice: 0, needsQuote: false };
        const price = findQtyPrice(technique, quantity);
        return price === null ? { technique, unitPrice: null, needsQuote: true } : { technique, unitPrice: price * numElements, needsQuote: false };
      }
      if (technique.pricing_type === "by_tintas") {
        if (numElements === 0) return { technique, unitPrice: 0, needsQuote: false };
        const tintas = parseInt(techniqueTintas[technique.id] ?? "", 10);
        if (!Number.isFinite(tintas) || tintas <= 0) return { technique, unitPrice: null, needsQuote: true };
        const price = findTintasPrice(technique, tintas, quantity);
        return price === null ? { technique, unitPrice: null, needsQuote: true } : { technique, unitPrice: price * numElements, needsQuote: false };
      }
      if (technique.pricing_type === "by_size") {
        // Suma el precio de cada logo por separado -- cada uno puede tener
        // su propia medida (ver resolveLogoSize), a diferencia de
        // by_qty/by_tintas donde un solo precio se multiplica por el total
        // de elementos.
        if (allLogoElements.length === 0) return { technique, unitPrice: 0, needsQuote: false };
        let sum = 0;
        let needsQuote = false;
        for (const el of allLogoElements) {
          const size = resolveLogoSize(technique, el.id);
          const price = size ? findSizePrice(technique, size, quantity) : null;
          if (price === null) needsQuote = true;
          else sum += price;
        }
        return { technique, unitPrice: needsQuote ? null : sum, needsQuote };
      }
      // pricing_type null -> sin datos suficientes configurados todavía.
      return { technique, unitPrice: null, needsQuote: true };
    });
  const anyTechniqueNeedsQuote = techniqueResults.some((r) => r.needsQuote);
  const techniqueTotal = techniqueResults.reduce((sum, r) => sum + (r.unitPrice ?? 0), 0);
  const unitPrice = garmentUnit + techniqueTotal;
  const subtotal = unitPrice * quantity;
  const total = subtotal;

  // El carrito/checkout/PreviewModal todavía muestran UNA sola técnica
  // (no se rediseñaron en este cambio) -- se usa la primera seleccionada
  // como referencia principal; el detalle completo de todas las técnicas
  // activas (tintas, tamaños por logo, si cada una requiere cotización)
  // se guarda de todas formas en customization_snapshot.selected_techniques,
  // así que no se pierde información aunque la UI del carrito no la
  // muestre todavía.
  const primaryTechnique = techniqueResults[0]?.technique ?? null;

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

      // El color agregado al carrito es el color ACTIVO en este momento
      // (`activeVariant`, derivado arriba) -- el que ya se eligió en la
      // página del producto, o el que se esté mostrando en la barra
      // Multicolor si el usuario cambió entre colores -- nunca "la primera
      // variante activa" a secas, para que el carrito siempre coincida con
      // la prenda que realmente se vio y personalizó.
      const variant = activeVariant ?? product.variants.find((v) => v.active) ?? product.variants[0];
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
        technique_id: primaryTechnique?.id ?? null,
        technique: primaryTechnique ?? undefined,
        num_elements: numElements,
        customization_snapshot:
          numElements > 0
            ? {
                canvas_data_url: canvasDataUrl,
                logos,
                texts,
                applied_to: "all",
                selected_techniques: techniqueResults.map((r) => {
                  const tintasRaw = parseInt(techniqueTintas[r.technique.id] ?? "", 10);
                  const logoSizes: Record<string, string> = {};
                  const sizeCmByElement: Record<string, { largo: number; alto: number }> = {};
                  for (const el of allLogoElements) {
                    const dims = techniqueLogoSizeCm[r.technique.id]?.[el.id];
                    const largo = parseFloat(dims?.largo ?? "");
                    const alto = parseFloat(dims?.alto ?? "");
                    if (largo > 0 && alto > 0) sizeCmByElement[el.id] = { largo, alto };
                    const resolved = resolveLogoSize(r.technique, el.id);
                    if (resolved) logoSizes[el.id] = resolved;
                  }
                  return {
                    technique_id: r.technique.id,
                    technique_name: r.technique.name,
                    tintas: Number.isFinite(tintasRaw) && tintasRaw > 0 ? tintasRaw : undefined,
                    positions: activePositionLabels.length > 0 ? activePositionLabels : undefined,
                    logo_sizes: Object.keys(logoSizes).length > 0 ? logoSizes : undefined,
                    size_cm: Object.keys(sizeCmByElement).length > 0 ? sizeCmByElement : undefined,
                    unit_price: r.unitPrice,
                    needs_quote: r.needsQuote,
                  };
                }),
              }
            : null,
        unit_price: unitPrice,
        total_price: total,
      };

      // Ya no se abre ningún popover local -- el badge/pulso del carrito en
      // PublicHeader (barra superior) es la única confirmación visual, y
      // ya reacciona solo porque comparte el mismo CartContext.
      addItem(newItem);
      setSelectedId(null);
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
              {applicableViews.map((v) => {
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

            {/* El botón de carrito interno se eliminó -- el único carrito
                de esta pantalla ahora es el de PublicHeader (barra
                superior). El ojo conserva su función real (abre
                PreviewModal), así que se queda igual. */}
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
            </div>
          </div>

          {/* Barra de colores — SOLO aparece cuando el usuario activó
              "Multicolor" en la página del producto Y eligió más de un
              color (`showColorBar`, ver arriba). NO es un selector de
              colores de la prenda en general -- únicamente permite
              alternar entre los colores que ya se eligieron antes de
              entrar aquí; nunca muestra los 6 colores completos. Cambiar
              de color en esta barra SOLO cambia `activeVariantId` (y por lo
              tanto `garmentColor`): nunca toca `elements`, así que el
              diseño colocado por el usuario se mantiene intacto (misma
              posición/escala/rotación %) al alternar de prenda. */}
          {showColorBar && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-ui-gray">Color de la prenda:</span>
              {barVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVariantId(v.id)}
                  title={v.color_name}
                  aria-label={`Color ${v.color_name}`}
                  aria-pressed={activeVariant?.id === v.id}
                  style={{ backgroundColor: v.color_hex }}
                  className={`h-8 w-8 rounded-full border-2 transition-all duration-150 ease-out ${
                    activeVariant?.id === v.id
                      ? "border-primary scale-110 ring-2 ring-primary/30 shadow-[0_0_0_4px_rgba(87,224,217,0.12)]"
                      : "border-white ring-1 ring-ui-border hover:scale-105"
                  }`}
                />
              ))}
            </div>
          )}

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
              onMouseDown={(e) => {
                // react-moveable's own resize/rotate handles live inside this
                // same canvas div (DesignElementView renders <Moveable> as a
                // sibling of the target, not portaled elsewhere) — their DOM
                // node is `.moveable-control-box`. Without this guard, EVERY
                // mousedown on a handle also bubbles up here and deselects,
                // unmounting <Moveable> mid-gesture before a single onResize/
                // onRotate frame can fire — this is why dragging a corner
                // handle looked like it "didn't respond" at all: the drag
                // never actually started, the element was just deselected
                // instantly. Same root-cause family as the eye-button
                // click-suppression bug documented for this file — any
                // click that starts on Moveable's own UI must never reach
                // this deselect-on-elsewhere handler.
                if ((e.target as HTMLElement).closest(".moveable-control-box")) return;
                setSelectedId(null);
              }}
              onDragEnter={(e) => {
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
                dragCounterRef.current += 1;
                setIsDragOverCanvas(true);
              }}
              onDragOver={(e) => {
                // Required for onDrop to ever fire at all — a bare <div>
                // rejects drops by default unless dragover is prevented.
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
              }}
              onDragLeave={() => {
                dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
                if (dragCounterRef.current === 0) setIsDragOverCanvas(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCounterRef.current = 0;
                setIsDragOverCanvas(false);
                handleLogoFiles(e.dataTransfer.files);
              }}
            >
              {activeViewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeViewSrc}
                  alt={`${product.name} — ${VIEW_LABELS[activeView]} — ${activeVariant?.color_name ?? ""}`}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-50">
                  <p className="text-sm text-ui-gray">Fotografías no disponibles aún</p>
                </div>
              )}

              {isDragOverCanvas && (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-md">
                    Suelta la imagen para agregarla
                  </span>
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

            {/* Tus diseños — misma tarjeta de siempre (icono/título/
                subtítulo/flecha, sigue abriendo la galería completa), pero
                ahora con una vista previa real de los diseños ya
                guardados debajo, cuando existen. Vacío -> exactamente la
                tarjeta de antes, sin miniaturas ficticias. */}
            <DesignsPreviewCard
              assets={artAssets}
              onOpenAll={() => setArtLibraryOpen(true)}
              onSelect={(asset) => placeAsset(asset)}
              onRemove={removeAsset}
            />

            {/* Agregar imagen / Agregar texto — botones compactos, solo
                ícono + texto principal (sin subtítulo ni flecha). */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center justify-center gap-2 rounded-2xl border border-ui-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_rgba(87,224,217,0.15)] active:translate-y-0 active:bg-primary/5"
              >
                <ImageToolIcon className="h-4 w-4 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                Agregar imagen
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="group flex items-center justify-center gap-2 rounded-2xl border border-ui-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_20px_rgba(87,224,217,0.15)] active:translate-y-0 active:bg-primary/5"
              >
                <TextToolIcon className="h-4 w-4 shrink-0 text-ui-gray transition-colors duration-200 ease-out group-hover:text-primary" />
                Agregar texto
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
                {applicableViews.map((v) => (
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
            {techniques.length === 0 ? (
              <p className="text-sm text-ui-gray">No hay técnicas de impresión disponibles para este producto.</p>
            ) : (
              <>
                <div className="-mx-8">
                  <PrintTechniqueCards techniques={techniques} selectedIds={selectedTechniqueIds} onToggle={toggleTechnique} />
                </div>
                {/* Cada técnica seleccionada se desglosa en su propia
                    tarjeta: "Posiciones" se agrupa por eje
                    (Frente/Reverso/Izquierda/Derecha, ver logosByView),
                    cada eje muestra cuántos logos tiene y un panel de
                    Largo/Alto (cm) POR LOGO -- pedido explícito ("si el
                    usuario agregó 2 logos en la parte de enfrente, ahí va
                    2 y se desglosan 2 paneles"). Serigrafía/Tampografía
                    (by_tintas) no tienen medida por tamaño -- ahí
                    "Posiciones" solo muestra el conteo, junto al campo de
                    Tintas de siempre. El botón de basura quita esa
                    técnica de la selección (mismo toggleTechnique que su
                    tarjeta en el selector de arriba). */}
                {techniqueResults.length > 0 && (
                  <div className="mt-5 flex flex-col gap-3">
                    {techniqueResults.map(({ technique, unitPrice, needsQuote }) => (
                      <TechniqueDetailCard
                        key={technique.id}
                        technique={technique}
                        unitPrice={unitPrice}
                        needsQuote={needsQuote}
                        logosByView={logosByView}
                        logoSizeCm={techniqueLogoSizeCm[technique.id] ?? {}}
                        onLogoSizeCmChange={(elementId, patch) =>
                          setTechniqueLogoSizeCm((prev) => ({
                            ...prev,
                            [technique.id]: {
                              ...(prev[technique.id] ?? {}),
                              [elementId]: { ...(prev[technique.id]?.[elementId] ?? { largo: "", alto: "" }), ...patch },
                            },
                          }))
                        }
                        selectedElementId={selectedId}
                        onSelectLogo={(view, elementId) => {
                          setActiveView(view);
                          setSelectedId(elementId);
                        }}
                        tintas={techniqueTintas[technique.id] ?? ""}
                        onTintasChange={(v) => setTechniqueTintas((prev) => ({ ...prev, [technique.id]: v }))}
                        onRemove={() => toggleTechnique(technique.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Resumen del pedido -- píldora glassmorphism (rediseño puramente
              visual, pedido explícito: "NO cambies la lógica, cálculos,
              precios, funcionalidades ni comportamiento existente"). Todo
              el estado/cálculo (setQty, handleQtyDraftChange/Blur,
              quantity, qtyDraft, total, unitPrice, numLogoElements,
              anyTechniqueNeedsQuote) es exactamente el mismo de antes --
              solo cambió el marcado/clases visuales. Los tramos de precio
              por cantidad de cada técnica siguen dependiendo de esta misma
              `quantity`, sin tocar esa lógica. */}
          {/* Todo en una sola fila (flex-nowrap, no flex-wrap) -- cada
              sección lleva shrink-0 para que ninguna se comprima de forma
              rara; overflow-x-auto es solo una red de seguridad para un
              caso extremo (ej. un total de 6+ cifras + la nota de
              "técnica por cotizar" al mismo tiempo), nunca visible en el
              uso normal. Alturas/paddings/tamaños de fuente reducidos a
              propósito frente a la versión anterior para que quepa
              cómodo en el ancho real del panel (~35% del viewport). */}
          <div className="scrollbar-none flex flex-nowrap items-center gap-[13.8px] overflow-x-auto rounded-full border border-white bg-white/[0.05] px-[42.4px] py-[18px] shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-[42.4px]">
            {/* Cantidad -- compacta, botones circulares chicos, turquesa. */}
            <div className="flex shrink-0 items-center gap-[3.2px]">
              <button
                type="button"
                onClick={() => setQty(quantity - 1)}
                aria-label="Quitar una pieza"
                className="flex h-[19.1px] w-[19.1px] shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-black/[0.06] transition-all duration-150 ease-out hover:bg-primary/10 active:scale-90"
              >
                <svg viewBox="0 0 16 16" className="h-[9.5px] w-[9.5px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M3 8h10" />
                </svg>
              </button>
              {/* Cuadro de texto SIEMPRE visible y editable -- sin estado
                  "modo edición" que haya que activar con un clic aparte
                  (eso era lo reportado como "muy complicado"). Escribir
                  aquí actualiza el precio al instante, igual que los
                  botones -/+. */}
              <input
                type="text"
                inputMode="numeric"
                value={qtyDraft}
                onChange={(e) => handleQtyDraftChange(e.target.value)}
                onBlur={handleQtyDraftBlur}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Cantidad de piezas"
                className="w-[45.6px] rounded-full bg-white/80 py-0.5 text-center text-xs font-semibold text-foreground outline-none ring-1 ring-black/[0.06] transition-shadow focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setQty(quantity + 1)}
                aria-label="Agregar una pieza"
                className="flex h-[19.1px] w-[19.1px] shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-black/[0.06] transition-all duration-150 ease-out hover:bg-primary/10 active:scale-90"
              >
                <svg viewBox="0 0 16 16" className="h-[9.5px] w-[9.5px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </button>
            </div>

            <div className="h-[31.8px] w-px shrink-0 bg-black/[0.06]" />

            {/* Total -- el elemento visual principal, con jerarquía clara:
                etiqueta "TOTAL" chica, el monto grande, y "c/u · IVA
                incluido" discreto debajo -- todo en el mismo bloque
                compacto, sin forzar la altura del contenedor. */}
            <div className="flex shrink-0 flex-col justify-center gap-0">
              <span className="w-fit rounded-full bg-primary/10 px-[2.1px] py-[1.1px] text-[8.5px] font-bold uppercase leading-tight tracking-wide text-primary-dark">
                Total
              </span>
              <p className="flex items-baseline gap-[4.2px] whitespace-nowrap">
                <span className="text-[19.1px] font-extrabold leading-none tracking-tight text-foreground">{formatMXN(total)}</span>
                <span className="text-[10.6px] font-semibold text-ui-gray">MXN</span>
              </p>
              <p className="whitespace-nowrap text-[7.4px] leading-tight text-ui-gray">
                {formatMXN(unitPrice)} c/u <span className="mx-0.5 opacity-50">·</span>
                {anyTechniqueNeedsQuote ? "No incluye técnicas por cotizar" : "IVA incluido"}
              </p>
            </div>

            <div className="h-[31.8px] w-px shrink-0 bg-black/[0.06]" />

            {/* Logo -- ícono de imagen (no carrito/bolsa) en una cajita
                glass con borde turquesa muy sutil. */}
            <div className="flex shrink-0 items-center gap-[6.4px]">
              <div className="flex h-[25.4px] w-[25.4px] shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/5">
                <ImageToolIcon className="h-[12.7px] w-[12.7px] text-primary" />
              </div>
              <span className="whitespace-nowrap text-[12.7px] font-semibold text-foreground">
                {numLogoElements} {numLogoElements === 1 ? "Logo" : "Logos"}
              </span>
            </div>
            {/* La nota de "técnica por cotizar" ya no se repite aquí como
                un cuarto bloque -- era texto redundante (la línea
                secundaria del Total ya dice "No incluye técnicas por
                cotizar", y la propia tarjeta de la técnica ya muestra
                "Por cotizar") que además era la causa real de que la fila
                se desbordara en este caso específico. anyTechniqueNeedsQuote
                sigue exactamente igual, solo se quitó el texto duplicado. */}
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
        technique={primaryTechnique}
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
        loading={artLibraryLoading}
        onSelect={(asset) => {
          placeAsset(asset);
          setArtLibraryOpen(false);
        }}
        onRemove={removeAsset}
        onAddNew={async (file) => {
          const asset = await addAsset(file);
          if (asset) placeAsset(asset);
          setArtLibraryOpen(false);
        }}
      />
    </div>
  );
}