import type { CartItem } from "@/types";
import { formatMXN, splitIva } from "@/lib/pricing";

// Documento de cotización del carrito completo -- lo que se captura para
// el PDF (ver "Descargar cotización" en carrito/page.tsx). Solo lectura,
// sin nada interactivo: se renderiza offscreen (mismo criterio que ONPOINT
// para sus PDFs) y toPng lo rasteriza tal cual se ve aquí. Fondo blanco
// explícito porque esto nunca se pinta dentro del layout normal de la
// página (donde heredaría el fondo del body).
//
// Todo lo alineado a la derecha (precios, fecha, resumen) va en <table>
// en vez de flex justify-between/ml-auto/text-right -- confirmado en vivo
// (ver charla 2026-09-16) que html-to-image calcula mal esas cajas y las
// deja fuera del PNG capturado. Las tablas usan un algoritmo de layout
// distinto (celdas con ancho fijo por columna) que sí se captura bien.
export default function CotizacionDoc({ items, subtotalConIva }: { items: CartItem[]; subtotalConIva: number }) {
  const { subtotal, iva } = splitIva(subtotalConIva);

  return (
    <div className="w-[820px] bg-white p-10 text-foreground" style={{ fontFamily: "inherit" }}>
      <table style={{ width: "100%", borderBottom: "2px solid #1a1a1a", paddingBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "bottom", paddingBottom: 16 }}>
              <span className="font-display text-2xl font-bold text-primary-dark">merchy</span>
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

      <div className="mt-6 flex flex-col gap-4">
        {items.map((item) => {
          const thumb = item.customization_snapshot?.canvas_data_url || item.product.variants?.[0]?.images?.[0];
          const color = item.variants[0];
          const sizesLabel = Object.entries(color?.sizes_breakdown ?? {})
            .filter(([, qty]) => qty > 0)
            .map(([size, qty]) => `${size} (${qty})`)
            .join(" ");
          const techniqueTotal = (item.customization_snapshot?.selected_techniques ?? []).reduce((s, t) => s + (t.unit_price ?? 0), 0);
          const garmentUnit = Math.max(0, item.unit_price - techniqueTotal);
          return (
            <table key={item.id} style={{ width: "100%", borderBottom: "1px solid #E5E5E5", paddingBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ width: 96, verticalAlign: "top" }}>
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={item.product.name} className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                  </td>
                  <td style={{ paddingLeft: 16, verticalAlign: "top" }}>
                    <p className="font-display text-sm font-bold uppercase text-foreground">{item.product.name}</p>
                    <p className="mt-0.5 text-xs text-ui-gray">
                      {color?.color_name ?? "—"}
                      {sizesLabel ? ` · ${sizesLabel}` : ""} · {item.technique?.name ?? "Sin personalizar"}
                    </p>
                    <table style={{ width: "100%", marginTop: 8 }}>
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
                      </tbody>
                    </table>
                  </td>
                  <td style={{ width: 110, verticalAlign: "top", textAlign: "right", paddingLeft: 16 }}>
                    <p className="text-xs text-ui-gray">{item.total_quantity} pzas</p>
                    <p className="font-display text-sm font-bold text-foreground">{formatMXN(item.total_price)}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          );
        })}
      </div>

      <table style={{ width: "100%", marginTop: 16 }}>
        <tbody>
          <tr>
            <td style={{ width: 508 }} />
            <td style={{ width: 212 }}>
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
