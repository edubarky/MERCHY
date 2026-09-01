"use client";

import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { useCart, productDraftCartItemId } from "@/lib/cart/CartContext";
import { formatMXN } from "@/lib/pricing";

function CartEmptyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CarritoPage() {
  const { items, removeItem, totalItems, subtotal, total } = useCart();

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
                const color = item.variants[0];
                // El renglón "en curso" (ver productDraftCartItemId) todavía
                // no tiene un diseño confirmado -- llevarlo al Personalizador
                // continúa justo donde lo dejó (el autoguardado/sincronizado
                // ya restaura ese mismo estado ahí). Un renglón YA
                // confirmado (id propio, ver handleAddToCart) no tiene hoy
                // forma de volver a cargarse en el Personalizador para
                // editarlo -- llevarlo a la ficha del producto en su lugar.
                const isDraft = item.id === productDraftCartItemId(item.product.id);
                const href = isDraft ? `/producto/${item.product.id}/personalizar` : `/producto/${item.product.id}`;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="flex items-center gap-4 rounded-[20px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-shadow duration-150 ease-out hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)]"
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={item.product.name} className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{item.product.name}</p>
                      <p className="mt-0.5 text-sm text-ui-gray">
                        {color?.color_name ?? "—"} · {item.total_quantity} pzas
                      </p>
                      {item.customization_snapshot && (
                        <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <p className="font-bold text-foreground">{formatMXN(item.total_price)} MXN</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="text-sm text-ui-gray transition-colors duration-150 hover:text-accent-coral"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="w-full rounded-[20px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:w-[340px] lg:sticky lg:top-8">
              <p className="mb-4 text-base font-bold text-foreground">Resumen</p>
              <div className="space-y-2 text-sm text-ui-gray">
                <div className="flex justify-between">
                  <span>Total de productos</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMXN(subtotal)} MXN</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{formatMXN(total)} MXN</span>
              </div>
              <button
                type="button"
                className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(87,224,217,0.4)]"
              >
                Finalizar compra
              </button>
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
    </main>
  );
}