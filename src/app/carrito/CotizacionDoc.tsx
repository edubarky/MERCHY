import type { CartItem } from "@/types";
import { formatMXN, splitIva } from "@/lib/pricing";

// Documento de cotización del carrito completo -- lo que se captura para
// el PDF (ver "Descargar cotización" en carrito/page.tsx). Solo lectura,
// sin nada interactivo: se renderiza offscreen (mismo criterio que ONPOINT
// para sus PDFs) y toPng lo rasteriza tal cual se ve aquí. Fondo blanco
// explícito porque esto nunca se pinta dentro del layout normal de la
// página (donde heredaría el fondo del body).
//
// Cada producto: imagen centrada a la izquierda + info/color/desglose a
// la derecha (mismo formato acordado, ver charla 2026-09-16) -- y al
// final, un resumen general (Subtotal/IVA/Total de TODO el carrito)
// estilo ONPOINT cuando hay varios productos.
//
// Todo lo alineado a la derecha (precios, fecha, resumen) va en <table>
// en vez de flex justify-between/ml-auto/text-right -- confirmado en vivo
// que html-to-image calcula mal esas cajas y las deja fuera del PNG
// capturado. Las tablas usan un algoritmo de layout distinto (celdas con
// ancho fijo por columna) que sí se captura bien.
export default function CotizacionDoc({
  items,
  subtotalConIva,
  etaText,
}: {
  items: CartItem[];
  subtotalConIva: number;
  // Texto ya formateado ("Llega entre el 24 y el 28 de septiembre de
  // 2026") -- solo si el cliente ya puso un CP válido en el carrito (ver
  // charla 2026-09-16); ausente/null = no se inventa una fecha aquí.
  etaText?: string | null;
}) {
  const { subtotal, iva } = splitIva(subtotalConIva);

  return (
    <div className="w-[920px] bg-white p-10 text-foreground" style={{ fontFamily: "inherit" }}>
      <table style={{ width: "100%", paddingBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "bottom", paddingBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Merchy" style={{ height: 32, width: "auto" }} />
            </td>
            <td style={{ verticalAlign: "bottom", textAlign: "right", paddingBottom: 16 }}>
              <p className="font-display text-sm font-bold text-foreground">Cotización</p>
              <p className="text-xs text-ui-gray">
                {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-ui-gray">Válida sujeta a existencias — no es un comprobante fiscal.</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex flex-col">
        {items.map((item) => {
          const thumb = item.customization_snapshot?.canvas_data_url || item.product.variants?.[0]?.images?.[0];
          const techniqueTotal = (item.customization_snapshot?.selected_techniques ?? []).reduce((s, t) => s + (t.unit_price ?? 0), 0);
          const garmentUnit = Math.max(0, item.unit_price - techniqueTotal);
          const sizesLabel = item.product.sizes_available.length > 1
            ? `${item.product.sizes_available[0]} - ${item.product.sizes_available[item.product.sizes_available.length - 1]}`
            : item.product.sizes_available[0];

          return (
            <table key={item.id} style={{ width: "100%", marginTop: 24, paddingBottom: 24, borderBottom: "1px solid #E5E5E5" }}>
              <tbody>
                <tr>
                  {/* ── Imagen, centrada -- mismo criterio que Vista Previa ── */}
                  <td style={{ width: 380, verticalAlign: "top", textAlign: "center" }}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={item.product.name} style={{ maxWidth: 320, maxHeight: 320, margin: "0 auto" }} />
                    ) : null}
                  </td>

                  {/* ── Info del producto + desglose ── */}
                  <td style={{ paddingLeft: 24, verticalAlign: "top" }}>
                    <p className="font-display text-base font-bold uppercase text-foreground">{item.product.name}</p>
                    <p className="mt-0.5 text-xs text-ui-gray">{item.product.sku}</p>
                    {item.product.description && (
                      <p className="mt-2 text-xs text-ui-gray" style={{ lineHeight: 1.5 }}>
                        {item.product.description}
                      </p>
                    )}

                    <table style={{ width: "100%", marginTop: 8 }}>
                      <tbody>
                        <tr className="text-xs text-foreground">
                          <td style={{ padding: "1px 0" }}>
                            {item.product.composition && (
                              <>
                                <span className="font-semibold">Composición:</span> {item.product.composition}{" "}
                              </>
                            )}
                            {sizesLabel && (
                              <>
                                <span className="font-semibold">· Tallas:</span> {sizesLabel}
                              </>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Color(es) -- con Multicolor, una fila por color con
                        su propio reparto de tallas. */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {item.variants.map((v) => (
                        <span
                          key={v.variant_id}
                          className="flex items-center gap-1.5 rounded-full border border-ui-border px-2 py-0.5 text-[11px] text-ui-gray"
                        >
                          <span
                            style={{ backgroundColor: v.color_hex, width: 10, height: 10, borderRadius: "50%", display: "inline-block" }}
                          />
                          {v.color_name}
                          {Object.entries(v.sizes_breakdown)
                            .filter(([, qty]) => qty > 0)
                            .map(([size, qty]) => ` ${size}(${qty})`)
                            .join("")}
                        </span>
                      ))}
                    </div>

                    <table style={{ width: "100%", marginTop: 10 }}>
                      <tbody>
                        <tr className="text-xs text-ui-gray">
                          <td style={{ padding: "1px 0" }}>Producto</td>
                          <td style={{ padding: "1px 0", textAlign: "right" }}>{formatMXN(garmentUnit)}</td>
                        </tr>
                        {(item.customization_snapshot?.selected_techniques ?? []).map((t) => (
                          <tr key={t.technique_id} className="text-xs text-ui-gray">
                            <td style={{ padding: "1px 0" }}>
                              {t.technique_name}
                              {t.positions?.length ? ` · ${t.positions.join(", ")}` : ""}
                              {t.tintas ? ` · ${t.tintas} ${t.tintas === 1 ? "tinta" : "tintas"}` : ""}
                            </td>
                            <td style={{ padding: "1px 0", textAlign: "right" }}>
                              {t.needs_quote || t.unit_price == null ? "Por cotizar" : formatMXN(t.unit_price)}
                            </td>
                          </tr>
                        ))}
                        <tr className="text-xs font-semibold text-foreground" style={{ borderTop: "1px dashed #E5E5E5" }}>
                          <td style={{ padding: "3px 0 0" }}>Precio por pieza</td>
                          <td style={{ padding: "3px 0 0", textAlign: "right" }}>{formatMXN(item.unit_price)}</td>
                        </tr>
                        <tr className="text-xs text-ui-gray">
                          <td style={{ padding: "1px 0" }}>Cantidad</td>
                          <td style={{ padding: "1px 0", textAlign: "right" }}>× {item.total_quantity} piezas</td>
                        </tr>
                        <tr className="font-display text-sm font-bold text-foreground" style={{ borderTop: "1px solid #1a1a1a" }}>
                          <td style={{ padding: "4px 0 0" }}>Total</td>
                          <td style={{ padding: "4px 0 0", textAlign: "right" }}>{formatMXN(item.total_price)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          );
        })}
      </div>

      {/* Resumen general -- solo tiene sentido destacarlo aparte cuando
          hay más de un producto (con uno solo ya coincide exactamente con
          el "Total" de ese renglón, arriba). Estilo ONPOINT: Subtotal sin
          IVA + IVA 16% + Total como ancla real. */}
      <table style={{ width: "100%", marginTop: 16 }}>
        <tbody>
          <tr>
            <td style={{ width: 608, verticalAlign: "bottom" }}>
              {etaText && (
                <p className="text-xs font-semibold text-primary-dark">{etaText}</p>
              )}
            </td>
            <td style={{ width: 312 }}>
              <p className="mb-1 font-display text-xs font-semibold uppercase tracking-wider text-ui-gray">
                Resumen{items.length > 1 ? ` (${items.length} productos)` : ""}
              </p>
              <table style={{ width: "100%" }}>
                <tbody>
                  <tr className="text-sm text-ui-gray">
                    <td style={{ padding: "2px 0" }}>
                      Subtotal <span className="text-xs">(sin IVA)</span>
                    </td>
                    <td style={{ padding: "2px 0", textAlign: "right" }}>{formatMXN(subtotal)}</td>
                  </tr>
                  <tr className="text-sm text-ui-gray">
                    <td style={{ padding: "2px 0" }}>IVA 16%</td>
                    <td style={{ padding: "2px 0", textAlign: "right" }}>{formatMXN(iva)}</td>
                  </tr>
                  <tr className="font-display text-lg font-bold text-foreground" style={{ borderTop: "2px solid #1a1a1a" }}>
                    <td style={{ padding: "6px 0 0" }}>Total</td>
                    <td style={{ padding: "6px 0 0", textAlign: "right" }}>{formatMXN(subtotalConIva)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-6 border-t border-ui-border pt-3 text-center text-[10px] text-ui-gray">
        merchy.mx · Precios en MXN, IVA incluido. El envío se calcula al finalizar la compra.
      </p>
    </div>
  );
}
