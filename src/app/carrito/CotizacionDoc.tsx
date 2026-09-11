import type { CartItem } from "@/types";
import { formatMXN, splitIva } from "@/lib/pricing";

// Documento de cotización del carrito completo -- lo que se captura para
// el PDF (ver "Descargar cotización" en carrito/page.tsx). Solo lectura,
// sin nada interactivo: se renderiza offscreen (mismo criterio que ONPOINT
// para sus PDFs) y toPng lo rasteriza tal cual se ve aquí. Fondo blanco
// explícito porque esto nunca se pinta dentro del layout normal de la
// página (donde heredaría el fondo del body).
export default function CotizacionDoc({ items, subtotalConIva }: { items: CartItem[]; subtotalConIva: number }) {
  const { subtotal, iva } = splitIva(subtotalConIva);

  return (
    <div className="w-[820px] bg-white p-10 text-foreground" style={{ fontFamily: "inherit" }}>
      <div className="flex items-center justify-between border-b-2 border-foreground pb-4">
        <span className="font-display text-2xl font-bold text-primary-dark">merchy</span>
        <div className="text-right text-xs text-ui-gray">
          <p className="font-display text-sm font-bold text-foreground">Cotización</p>
          <p>{new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
          <p>Válida sujeta a existencias — no es un comprobante fiscal.</p>
        </div>
      </div>

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
            <div key={item.id} className="flex gap-4 border-b border-ui-border pb-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={item.product.name} className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold uppercase text-foreground">{item.product.name}</p>
                <p className="mt-0.5 text-xs text-ui-gray">
                  {color?.color_name ?? "—"}
                  {sizesLabel ? ` · ${sizesLabel}` : ""} · {item.technique?.name ?? "Sin personalizar"}
                </p>
                <div className="mt-2 space-y-0.5 text-xs">
                  <p className="flex justify-between text-ui-gray"><span>Producto</span><span>{formatMXN(garmentUnit)}</span></p>
                  {(item.customization_snapshot?.selected_techniques ?? []).map((t) => (
                    <p key={t.technique_id} className="flex justify-between text-ui-gray">
                      <span>
                        {t.technique_name}
                        {t.positions?.length ? ` · ${t.positions.join(", ")}` : ""}
                        {t.tintas ? ` · ${t.tintas} ${t.tintas === 1 ? "tinta" : "tintas"}` : ""}
                      </span>
                      <span>{t.needs_quote || t.unit_price == null ? "Por cotizar" : formatMXN(t.unit_price)}</span>
                    </p>
                  ))}
                  <p className="flex justify-between border-t border-dashed border-ui-border pt-0.5 font-semibold text-foreground">
                    <span>Precio por pieza</span>
                    <span>{formatMXN(item.unit_price)}</span>
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-ui-gray">{item.total_quantity} pzas</p>
                <p className="font-display text-sm font-bold text-foreground">{formatMXN(item.total_price)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ml-auto mt-2 w-64 space-y-1 text-sm">
        <p className="flex justify-between text-ui-gray"><span>Subtotal <span className="text-xs">(sin IVA)</span></span><span>{formatMXN(subtotal)}</span></p>
        <p className="flex justify-between text-ui-gray"><span>IVA 16%</span><span>{formatMXN(iva)}</span></p>
        <p className="flex justify-between border-t-2 border-foreground pt-1.5 font-display text-lg font-bold text-foreground">
          <span>Total</span><span>{formatMXN(subtotalConIva)}</span>
        </p>
      </div>

      <p className="mt-6 border-t border-ui-border pt-3 text-center text-[10px] text-ui-gray">
        merchy.mx · Precios en MXN, IVA incluido. El envío se calcula al finalizar la compra.
      </p>
    </div>
  );
}
