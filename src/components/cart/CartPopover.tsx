"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { formatMXN } from "@/lib/pricing";

function CartEmptyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CartPopover({ open }: { open: boolean }) {
  const { items, removeItem, totalItems, subtotal, total } = useCart();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`absolute right-0 top-full z-40 mt-3 w-[380px] max-w-[92vw] rounded-[22px] border border-ui-border bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.16)] transition-all duration-200 ease-out ${
        entered ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0"
      }`}
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-2 py-8 text-center">
          <CartEmptyIcon className="mb-4 h-12 w-12 text-ui-gray" />
          <p className="font-semibold text-foreground">Tu carrito está vacío</p>
          <p className="mt-1 mb-6 text-sm text-ui-gray">Agrega un producto para comenzar tu pedido.</p>
          <Link
            href="/catalogo"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          <div className="max-h-[320px] space-y-5 overflow-y-auto pr-1">
            {items.map((item) => {
              const thumb = item.customization_snapshot?.canvas_data_url || item.product.variants?.[0]?.images?.[0];
              const color = item.variants[0];
              return (
                <div key={item.id} className="flex gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={item.product.name} className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{item.product.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label="Eliminar producto"
                        className="shrink-0 text-ui-gray transition-colors duration-150 hover:text-accent-coral"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-ui-gray">
                      {color?.color_name ?? "—"} · {item.total_quantity} pzas
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {item.customization_snapshot && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                          Personalizado
                        </span>
                      )}
                      <span className="text-sm font-bold text-foreground">{formatMXN(item.total_price)} MXN</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-1.5 border-t border-ui-border pt-4 text-sm">
            <div className="flex items-center justify-between text-ui-gray">
              <span>Total de productos</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-ui-gray">
              <span>Subtotal</span>
              <span>{formatMXN(subtotal)} MXN</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-base font-bold text-foreground">
              <span>Total</span>
              <span>{formatMXN(total)} MXN</span>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <Link
              href="/carrito"
              className="flex h-11 flex-1 items-center justify-center rounded-full border-2 border-foreground text-sm font-semibold text-foreground transition-all duration-180 ease-out hover:-translate-y-0.5"
            >
              Ver carrito
            </Link>
            <Link
              href="/carrito"
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-all duration-180 ease-out hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              Finalizar compra
            </Link>
          </div>
        </>
      )}
    </div>
  );
}