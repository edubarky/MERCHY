"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import PublicHeader from "@/components/PublicHeader";
import { createClient } from "@/lib/supabase/client";
import { useCart, productDraftCartItemId } from "@/lib/cart/CartContext";
import { formatMXN, recomputeCartItemUnitPrice, splitIva } from "@/lib/pricing";
import { getShippingZone, computeEtaRange, formatEtaRange } from "@/lib/shipping";
import CotizacionDoc from "./CotizacionDoc";
import type { CartItem, PriceTier, ProductionTimeTier, ShippingZone } from "@/types";

// Recuerda el último CP que este navegador usó para ver la fecha estimada
// -- no hay cuentas de cliente reales en la tienda todavía (ver charla
// 2026-09-16), así que esto es lo más parecido a "ya tiene una dirección
// asignada" sin construir un sistema de perfiles nuevo: la próxima visita
// desde el mismo navegador ya no tiene que volver a escribirlo.
const LAST_CP_KEY = "merchy_last_cp";

function CartEmptyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5M4 15.5v.5A2 2 0 0 0 6 18h8a2 2 0 0 0 2-2v-.5" />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Precio del producto solo (sin técnicas) y total de sus técnicas -- mismo
// cálculo que ya usa CotizacionDoc.tsx para el desglose del PDF, ahora
// también aquí para el desglose en vivo de "Resumen" (ver charla
// 2026-09-16: antes "Subtotal" mostraba lo mismo que "Total" -- nunca se
// le quitaba el IVA de verdad).
function itemPriceParts(item: CartItem) {
  const techniqueTotal = (item.customization_snapshot?.selected_techniques ?? []).reduce((s, t) => s + (t.unit_price ?? 0), 0);
  const garmentUnit = Math.max(0, item.unit_price - techniqueTotal);
  return { garmentUnit, techniqueTotal };
}

// A dónde manda "Editar" -- solo el renglón "en curso" (todavía sin
// confirmar, ver productDraftCartItemId) o uno YA confirmado que sí
// guardó su editor_state (ver PersonalizerClient's buildCartItem) puede
// reabrir el Personalizador con el diseño exacto. Cualquier otro caso
// (renglón viejo de antes de que existiera editor_state, o sin diseño)
// no tiene a dónde reabrirse -- null, el llamador cae a "Ver producto".
function editarHref(item: CartItem): string | null {
  if (item.id === productDraftCartItemId(item.product.id)) {
    return `/producto/${item.product.id}/personalizar`;
  }
  if (!item.customization_snapshot?.editor_state) return null;
  const params = new URLSearchParams();
  const variantId = item.variants[0]?.variant_id;
  if (variantId) params.set("variant", variantId);
  params.set("qty", String(item.total_quantity));
  params.set("editar", item.id);
  return `/producto/${item.product.id}/personalizar?${params.toString()}`;
}

export default function CarritoPage() {
  const { items, removeItem, upsertItem, totalItems, total } = useCart();
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [desgloseOpen, setDesgloseOpen] = useState(false);
  const [qtyErrors, setQtyErrors] = useState<Record<string, string>>({});
  const [downloadingCotizacion, setDownloadingCotizacion] = useState(false);
  const cotizacionRef = useRef<HTMLDivElement>(null);

  // Fecha estimada de entrega -- pedido explícito (ver charla 2026-09-16):
  // el carrito es donde el cliente resume su compra, así que también debe
  // ver cuándo le llega, con la misma lógica de zona+producción que ya usa
  // el checkout (ver lib/shipping.ts). Envío estándar nada más aquí (un
  // resumen, no el selector completo) -- el checkout sigue siendo donde se
  // elige estándar/express de verdad.
  const [cpInput, setCpInput] = useState("");
  const [cpCveEnt, setCpCveEnt] = useState<string | null>(null);
  const [cpStatus, setCpStatus] = useState<"idle" | "loading" | "notfound">("idle");
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [productionTiers, setProductionTiers] = useState<ProductionTimeTier[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("price_tiers")
      .select("*")
      .order("qty_min")
      .then(({ data }) => setPriceTiers((data ?? []) as PriceTier[]));
    supabase
      .from("shipping_zones")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setShippingZones((data ?? []) as ShippingZone[]));
    supabase
      .from("production_time_tiers")
      .select("*")
      .order("qty_min")
      .then(({ data }) => setProductionTiers((data ?? []) as ProductionTimeTier[]));
    try {
      const savedCp = localStorage.getItem(LAST_CP_KEY);
      if (savedCp) setCpInput(savedCp);
    } catch {}
  }, []);

  useEffect(() => {
    const cp = cpInput.trim();
    if (cp.length !== 5) {
      setCpCveEnt(null);
      setCpStatus("idle");
      return;
    }
    setCpStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const { buscaCP } = await import("@webrek/mx-cp");
        const r = await buscaCP(cp);
        if (!r) {
          setCpCveEnt(null);
          setCpStatus("notfound");
          return;
        }
        setCpCveEnt(r.cveEnt);
        setCpStatus("idle");
        try {
          localStorage.setItem(LAST_CP_KEY, cp);
        } catch {}
      } catch {
        setCpCveEnt(null);
        setCpStatus("notfound");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [cpInput]);

  const shippingZone = cpCveEnt ? getShippingZone(cpCveEnt, shippingZones) : null;
  const etaRange = shippingZone ? computeEtaRange(items, shippingZone, "standard", productionTiers) : null;

  // Cambia la cantidad de UNA talla de UN color -- reemplaza el stepper
  // "a ciegas" de antes (pedido explícito, ver charla 2026-09-16: "a qué
  // talla voy a agregar las sudaderas?"). El precio SIEMPRE se calcula
  // con el total combinado de TODOS los colores/tallas de este renglón
  // (25 piezas, no 10 y 15 por separado) -- mismos tramos que ya usó el
  // Personalizador (ver recomputeCartItemUnitPrice), nunca solo escala
  // el precio guardado. Si la nueva cantidad cae fuera de lo que la
  // técnica tiene tarifado, se rechaza el cambio y se pide editar el
  // diseño. Quitar la última pieza de todos los colores/tallas elimina
  // el renglón (no tiene sentido dejarlo en el carrito con 0 piezas).
  function applySizeQty(item: CartItem, variantId: string, size: string, nextQty: number) {
    const clamped = Math.max(0, nextQty);
    const nextVariants = item.variants.map((v) => {
      if (v.variant_id !== variantId) return v;
      const sizes_breakdown = { ...v.sizes_breakdown, [size]: clamped };
      return { ...v, sizes_breakdown, qty: Object.values(sizes_breakdown).reduce((s, q) => s + q, 0) };
    });
    const nextTotal = nextVariants.reduce((sum, v) => sum + v.qty, 0);
    if (nextTotal <= 0) {
      removeItem(item.id);
      return;
    }
    if (priceTiers.length === 0) return;
    const { unitPrice, needsQuote } = recomputeCartItemUnitPrice(item, nextTotal, priceTiers);
    if (needsQuote) {
      setQtyErrors((prev) => ({ ...prev, [item.id]: "Esa cantidad requiere cotización para esta técnica — edita el diseño." }));
      return;
    }
    setQtyErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    upsertItem({ ...item, variants: nextVariants, total_quantity: nextTotal, unit_price: unitPrice, total_price: unitPrice * nextTotal });
  }

  // Aplana el documento completo del carrito (ver CotizacionDoc) a PNG y
  // lo envuelve en un PDF de una sola página del tamaño exacto de la
  // imagen -- mismo método que toPng ya usa en la Vista Previa del
  // Personalizador, solo que aquí se guarda como PDF (jsPDF) en vez de
  // PNG, porque esto es para mandarle/imprimirle al cliente.
  async function handleDescargarCotizacion() {
    if (!cotizacionRef.current || downloadingCotizacion || items.length === 0) return;
    setDownloadingCotizacion(true);
    try {
      const dataUrl = await toPng(cotizacionRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("No se pudo generar la cotización."));
        i.src = dataUrl;
      });
      const pdf = new jsPDF({ unit: "px", format: [img.width, img.height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save("cotizacion-merchy.pdf");
    } catch {
      // Silencioso -- mismo criterio que el resto de descargas del sitio
      // (Vista Previa del Personalizador): si falla, el cliente solo
      // vuelve a intentar, no hay nada más que hacer aquí.
    } finally {
      setDownloadingCotizacion(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">Tu carrito</h1>

        {items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <CartEmptyIcon className="mb-5 h-16 w-16 text-ui-gray" />
            <p className="text-lg font-semibold text-foreground">Tu carrito está vacío</p>
            <p className="mt-1 mb-7 text-sm text-ui-gray">Agrega un producto para comenzar tu pedido.</p>
            <Link
              href="/catalogo"
              className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="flex-1 space-y-4">
              {items.map((item) => {
                const thumb = item.customization_snapshot?.canvas_data_url || item.product.variants?.[0]?.images?.[0];
                const href = editarHref(item);
                const sizes = item.product.sizes_available;
                return (
                  <div key={item.id} className="rounded-[20px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{item.product.name}</p>
                        {item.customization_snapshot && (
                          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="font-bold text-foreground">{formatMXN(item.total_price)} MXN</p>
                        <p className="text-xs text-ui-gray">{item.total_quantity} pzas en total</p>
                      </div>
                    </div>

                    {/* Un bloque por color -- pedido explícito (ver charla
                        2026-09-16): con Multicolor (2+ variantes) cada uno
                        se ve por separado con su propia foto y sus propias
                        tallas, pero el PRECIO siempre usa el total
                        combinado (25 piezas), nunca cada color por
                        separado (10 y 15) -- ver applySizeQty. El diseño
                        (logo) es el mismo para todos los colores de este
                        renglón (así se coloca hoy en el Personalizador),
                        así que solo el primer color muestra la miniatura
                        ya compuesta con el logo; los demás muestran su
                        propia foto de color sin logo -- referencia de
                        cuál prenda es, no una segunda composición real. */}
                    <div className="mt-3 space-y-3">
                      {item.variants.map((v, i) => {
                        const variantPhoto = item.product.variants?.find((pv) => pv.id === v.variant_id)?.images?.[0];
                        const vThumb = i === 0 ? thumb : variantPhoto;
                        return (
                          <div key={v.variant_id} className="flex items-start gap-3 border-t border-ui-border pt-3 first:border-t-0 first:pt-0">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                              {vThumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={vThumb} alt={v.color_name} className="h-full w-full object-contain" />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground">
                                {v.color_name} <span className="font-normal text-ui-gray">· {v.qty} pzas</span>
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {sizes.map((size) => {
                                  const qty = v.sizes_breakdown[size] ?? 0;
                                  return (
                                    <div
                                      key={size}
                                      className="flex items-center gap-1 rounded-full border border-ui-border bg-gray-50 px-1.5 py-0.5"
                                    >
                                      <span className="text-[11px] font-semibold text-foreground">{size}</span>
                                      <button
                                        type="button"
                                        onClick={() => applySizeQty(item, v.variant_id, size, qty - 1)}
                                        aria-label={`Quitar una pieza de talla ${size}, color ${v.color_name}`}
                                        className="flex h-4 w-4 items-center justify-center text-primary-dark"
                                      >
                                        −
                                      </button>
                                      <span className="w-4 text-center text-[11px] font-semibold text-foreground">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => applySizeQty(item, v.variant_id, size, qty + 1)}
                                        aria-label={`Agregar una pieza de talla ${size}, color ${v.color_name}`}
                                        className="flex h-4 w-4 items-center justify-center text-primary-dark"
                                      >
                                        +
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {qtyErrors[item.id] && <p className="mt-2 text-xs text-accent-coral">{qtyErrors[item.id]}</p>}

                    <div className="mt-3 flex items-center gap-3 border-t border-ui-border pt-3 text-sm">
                      {href ? (
                        <Link href={href} className="font-semibold text-primary-dark hover:underline">
                          Editar
                        </Link>
                      ) : (
                        <Link href={`/producto/${item.product.id}`} className="font-semibold text-primary-dark hover:underline">
                          Ver producto
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-ui-gray transition-colors duration-150 hover:text-accent-coral"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Fecha estimada de entrega -- ver comentario donde se
                  declaran cpInput/etaRange arriba. Vive en esta columna
                  (no en el Resumen de la derecha) -- pedido explícito
                  (ver charla 2026-09-16): llenaba el espacio vacío que
                  quedaba debajo de la lista de productos. */}
              <div className="rounded-[20px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
                <p className="font-semibold text-foreground">¿Cuándo llegaría tu pedido?</p>
                <p className="mt-0.5 text-sm text-ui-gray">Ingresa tu código postal</p>
                <input
                  value={cpInput}
                  onChange={(e) => setCpInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="00000"
                  inputMode="numeric"
                  className="mt-3 w-full max-w-xs rounded-full border border-ui-border bg-gray-50 px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                {cpStatus === "notfound" && cpInput.length === 5 && (
                  <p className="mt-2 text-xs text-accent-coral">No encontramos ese código postal.</p>
                )}
                {cpInput.length === 5 && cpStatus === "idle" && !shippingZone && (
                  <p className="mt-2 text-xs text-ui-gray">Todavía no tenemos cobertura de envío calculada para esa zona.</p>
                )}
                {etaRange && (
                  <p className="mt-2 text-sm font-semibold text-primary-dark">{formatEtaRange(etaRange.min, etaRange.max)}</p>
                )}
              </div>
            </div>

            <div className="w-full rounded-[20px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:w-[340px] lg:sticky lg:top-8">
              {/* Desglose completo colapsable -- pedido explícito (ver
                  charla 2026-09-16): antes "Subtotal" mostraba el mismo
                  número que "Total" (nunca se le quitaba el IVA de
                  verdad). Ahora es el mismo desglose de Producto/técnica/
                  Precio por pieza por renglón + Subtotal(sin IVA)/IVA que
                  ya usa el PDF de cotización (ver CotizacionDoc), solo
                  que aquí se puede contraer/expandir. */}
              <button
                type="button"
                onClick={() => setDesgloseOpen((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <span className="text-base font-bold text-foreground">Resumen ({totalItems} pzas)</span>
                <ChevronIcon className={`h-4 w-4 text-ui-gray transition-transform duration-200 ${desgloseOpen ? "rotate-180" : ""}`} />
              </button>

              {desgloseOpen && (
                <div className="mt-4 space-y-3">
                  {items.map((item) => {
                    const { garmentUnit } = itemPriceParts(item);
                    return (
                      <div key={item.id} className="space-y-0.5 border-b border-ui-border pb-3 text-xs text-ui-gray">
                        <p className="mb-1 truncate text-sm font-semibold text-foreground">{item.product.name}</p>
                        <div className="flex justify-between">
                          <span>Producto</span>
                          <span>{formatMXN(garmentUnit)}</span>
                        </div>
                        {(item.customization_snapshot?.selected_techniques ?? []).map((t) => (
                          <div key={t.technique_id} className="flex justify-between">
                            <span className="truncate pr-2">{t.technique_name}</span>
                            <span className="shrink-0">{t.needs_quote || t.unit_price == null ? "Por cotizar" : formatMXN(t.unit_price)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-dashed border-ui-border pt-1 font-semibold text-foreground">
                          <span>Precio por pieza</span>
                          <span>{formatMXN(item.unit_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cantidad</span>
                          <span>× {item.total_quantity} piezas</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm text-ui-gray">
                    <span>
                      Subtotal <span className="text-xs">(sin IVA)</span>
                    </span>
                    <span>{formatMXN(splitIva(total).subtotal)} MXN</span>
                  </div>
                  <div className="flex justify-between text-sm text-ui-gray">
                    <span>IVA 16%</span>
                    <span>{formatMXN(splitIva(total).iva)} MXN</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{formatMXN(total)} MXN</span>
              </div>

              <button
                type="button"
                onClick={handleDescargarCotizacion}
                disabled={downloadingCotizacion}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ui-border text-sm font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5 hover:border-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <DownloadIcon className={`h-4 w-4 ${downloadingCotizacion ? "animate-pulse" : ""}`} />
                {downloadingCotizacion ? "Generando..." : "Descargar cotización"}
              </button>

              <Link
                href="/checkout"
                className="mt-3 flex h-14 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)]"
              >
                Continuar
              </Link>
              <Link
                href="/catalogo"
                className="mt-3 flex h-12 w-full items-center justify-center rounded-full border-2 border-foreground text-sm font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Documento de la cotización, renderizado siempre (nunca solo al
          descargar) pero invisible -- toPng necesita el nodo real ya
          pintado con sus imágenes cargadas; mismo criterio que usan los
          PDFs de ONPOINT (VisualFinalSection.tsx). Invisible con opacity
          (no "left: -9999px") -- pedido explícito (ver charla
          2026-09-16): posicionarlo fuera de pantalla hacía que
          html-to-image calculara mal las cajas alineadas a la derecha
          (precios, resumen), y esas simplemente no aparecían en el PDF
          descargado. En coordenadas reales (0,0) + opacity:0 + z-index
          negativo, el navegador lo sigue pintando normal (por eso toPng
          lo captura completo) pero nunca se ve ni se puede tocar. */}
      {items.length > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }} aria-hidden="true">
          <div ref={cotizacionRef}>
            <CotizacionDoc items={items} subtotalConIva={total} etaText={etaRange ? formatEtaRange(etaRange.min, etaRange.max) : null} />
          </div>
        </div>
      )}
    </main>
  );
}
