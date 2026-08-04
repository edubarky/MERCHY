"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product, ProductVariant, PriceTier, PrintTechnique } from "@/types";
import { getProductUnitPrice, getTechniquePrice, formatMXN } from "@/lib/pricing";
import {
  VIEW_ORDER,
  VIEW_LABELS,
  emptyViewElements,
  type ViewName,
  type DesignElement,
  type ViewElements,
  type LogoFileType,
} from "./types";
import { VIEW_ASSETS } from "./viewAssets";
import DesignElementView from "./DesignElementView";
import SelectionToolbar from "./SelectionToolbar";
import PrintTechniqueCards from "./PrintTechniqueCards";
import PreviewModal from "./PreviewModal";

interface Props {
  product: Product & { variants: ProductVariant[] };
  priceTiers: PriceTier[];
  techniques: PrintTechnique[];
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function OpenEyeIcon() {
  // Mismo lenguaje visual que el ícono "ojo cerrado" provisto (círculo sólido
  // #7FDED9 + trazo #076868) — no existe un asset separado para el estado
  // "visible" en la carpeta de diseño, así que se construye a juego con él.
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
      <circle cx="32" cy="32" r="28" fill="#7FDED9" />
      <path
        d="M32 22c7 0 13.2 4.3 16 10-2.8 5.7-9 10-16 10s-13.2-4.3-16-10c2.8-5.7 9-10 16-10Z"
        fill="none"
        stroke="#076868"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4.6" fill="#076868" />
    </svg>
  );
}

export default function PersonalizerClient({ product, priceTiers, techniques }: Props) {
  const [activeView, setActiveView] = useState<ViewName>("frente");
  const [filesTabView, setFilesTabView] = useState<ViewName>("frente");
  const [elements, setElements] = useState<ViewElements>(emptyViewElements());
  const [history, setHistory] = useState<ViewElements[]>([emptyViewElements()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [areaVisible, setAreaVisible] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);
  const [zCounter, setZCounter] = useState(1);
  const [printAreaPx, setPrintAreaPx] = useState<{ left: number; top: number; right: number; bottom: number } | null>(
    null
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef({ history, historyIndex });
  historyRef.current = { history, historyIndex };

  const asset = VIEW_ASSETS[activeView];
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
      // react-moveable con position:"css" espera right/bottom como distancia
      // al borde lejano del contenedor (semántica CSS), no como coordenada absoluta.
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

  const totalQuantity = 1;
  const garmentUnit = getProductUnitPrice(product.costo, totalQuantity, priceTiers);
  const numElements = VIEW_ORDER.reduce((sum, v) => sum + elements[v].length, 0);
  const selectedTechnique = techniques.find((t) => t.id === selectedTechniqueId) ?? null;
  const techniqueTotal = selectedTechnique ? getTechniquePrice(selectedTechnique, totalQuantity, numElements) : 0;
  const perLogoPrice = selectedTechnique ? getTechniquePrice(selectedTechnique, totalQuantity, 1) : 0;
  const unitPrice = garmentUnit + techniqueTotal;
  const totalPrice = unitPrice * totalQuantity;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:px-8">
      {/* ── Canvas (izquierda, ~65%) ── */}
      <div className="w-full lg:w-[65%]">
        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {VIEW_ORDER.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setActiveView(v);
                  setFilesTabView(v);
                  setSelectedId(null);
                }}
                className={`pb-1 text-lg transition-colors duration-200 ease-out ${
                  activeView === v
                    ? "border-b-2 border-foreground font-bold text-foreground"
                    : "text-ui-gray hover:text-foreground"
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Vista previa general"
            className="h-14 w-14 shrink-0 transition-transform duration-200 ease-out hover:scale-110"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Home/PERSONALIZADOR/Group 424.svg" alt="" className="h-full w-full" />
          </button>
        </div>

        {selectedElement && (
          <div className="mb-3">
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

        <div className="flex justify-center rounded-[28px] bg-[#FBFCFD] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-10">
          <div
            ref={canvasRef}
            className="relative [container-type:size]"
            style={{ height: "min(60vh, 560px)", aspectRatio: asset.aspect }}
            onMouseDown={() => setSelectedId(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.src}
              alt={`${product.name} — ${VIEW_LABELS[activeView]}`}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              draggable={false}
            />

            {areaVisible && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-2xl border-2 border-dashed border-white/70"
                style={{
                  left: `${asset.printArea.xPct}%`,
                  top: `${asset.printArea.yPct}%`,
                  width: `${asset.printArea.widthPct}%`,
                  height: `${asset.printArea.heightPct}%`,
                }}
              />
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
              onClick={() => setAreaVisible((v) => !v)}
              aria-label={areaVisible ? "Ocultar área editable" : "Mostrar área editable"}
              className="absolute -bottom-6 -right-6 h-14 w-14 transition-transform duration-200 ease-out hover:scale-110"
            >
              {areaVisible ? (
                <OpenEyeIcon />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/Home/PERSONALIZADOR/Vitage Frente.svg" alt="" className="h-full w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel (derecha, ~35%) ── */}
      <aside className="w-full lg:sticky lg:top-6 lg:w-[35%]">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
          <h1 className="font-display text-2xl font-bold uppercase text-foreground">{product.name}</h1>
          <p className="mt-1 text-sm text-ui-gray">{product.sku}</p>
          {product.description && <p className="mt-3 text-sm leading-relaxed text-ui-gray">{product.description}</p>}

          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-bold text-foreground">3. Agrega tu logo</span>
              <span className="text-sm font-semibold text-ui-gray">Archivos</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 flex-1 transition-transform duration-150 ease-out hover:scale-[1.03]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Home/PERSONALIZADOR/BOTÓN LOGO.svg" alt="+ Logo" className="h-full w-full" />
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="h-11 flex-1 transition-transform duration-150 ease-out hover:scale-[1.03]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Home/PERSONALIZADOR/BOTÓN TEXTO.svg" alt="+ Texto" className="h-full w-full" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.pdf,.ai"
              className="hidden"
              onChange={(e) => handleLogoFiles(e.target.files)}
            />

            <div className="mt-4 rounded-2xl border border-ui-border p-3">
              <div className="mb-2 flex gap-4 text-xs">
                {VIEW_ORDER.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFilesTabView(v)}
                    className={`transition-colors duration-150 ease-out ${
                      filesTabView === v ? "font-semibold text-foreground" : "text-ui-gray hover:text-foreground"
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {elements[filesTabView].length === 0 ? (
                  <p className="text-xs text-ui-gray">Sin elementos en esta vista.</p>
                ) : (
                  elements[filesTabView].map((el) => (
                    <div
                      key={el.id}
                      onClick={() => {
                        setActiveView(filesTabView);
                        setSelectedId(el.id);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors duration-150 ease-out hover:bg-teal-light"
                    >
                      <span className="truncate text-foreground">
                        {el.type === "logo" ? el.fileName : `“${el.text}”`}
                      </span>
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

          <div className="mt-7">
            <span className="text-lg font-bold text-foreground">4. Selecciona el Tipo de impresión</span>
            <div className="mt-3">
              <PrintTechniqueCards
                techniques={techniques}
                selectedId={selectedTechniqueId}
                onSelect={setSelectedTechniqueId}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 rounded-full border border-ui-border bg-[#FDFDFE] px-5 py-3">
            <span className="text-sm">
              <span className="font-bold text-[#444343]">Total: {formatMXN(totalPrice)} MXN</span>
            </span>
            <span className="text-xs text-[#686868]">{formatMXN(perLogoPrice)} c/u</span>
            <span className="whitespace-nowrap text-xs font-semibold text-foreground">
              {numElements} Logo{numElements === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 flex gap-3">
            <Link href={`/producto/${product.id}`} className="h-11 flex-1 transition-transform duration-150 ease-out hover:scale-[1.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Home/PERSONALIZADOR/BOTÓN ATRÁS.svg" alt="Atrás" className="h-full w-full" />
            </Link>
            <button type="button" className="h-11 flex-1 transition-transform duration-150 ease-out hover:scale-[1.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Home/PERSONALIZADOR/BOTÓN SIGUIENTE.svg" alt="Siguiente" className="h-full w-full" />
            </button>
          </div>
        </div>
      </aside>

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} elements={elements} productName={product.name} />
    </div>
  );
}