"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { formatMXN } from "@/lib/pricing";

// A donde Mercado Pago Checkout Pro redirige de vuelta al cliente después
// de pagar (ver charla 2026-09-16 y api/mercadopago/create-preference).
// El status en la URL es solo para la UI -- la fuente de verdad real del
// pago es el webhook (api/mercadopago/webhook), que ya corrió server-to-
// server para este momento en que el cliente ve esta pantalla.
function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m7.5 12.5 3 3 6-6.5" />
    </svg>
  );
}

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function XCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

const STATUS_UI = {
  approved: {
    icon: CheckCircleIcon,
    color: "bg-primary/10 text-primary-dark",
    title: "¡Pago confirmado!",
    text: "Ya tenemos tu pago. Empezamos a preparar tu pedido.",
  },
  pending: {
    icon: ClockIcon,
    color: "bg-amber-100 text-amber-600",
    title: "Pago en proceso",
    text: "Tu pago sigue en revisión (algunos métodos tardan un poco). Te avisamos en cuanto se confirme.",
  },
  rejected: {
    icon: XCircleIcon,
    color: "bg-red-100 text-red-500",
    title: "El pago no se pudo procesar",
    text: "No logramos cobrar ese medio de pago. Puedes intentar de nuevo o contactarnos directamente.",
  },
} as const;

function ConfirmacionContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const total = Number(params.get("total") ?? "0");
  const collectionStatus = params.get("collection_status") ?? params.get("status") ?? "pending";
  const ui = STATUS_UI[collectionStatus as keyof typeof STATUS_UI] ?? STATUS_UI.pending;
  const Icon = ui.icon;

  if (!orderNumber) {
    return (
      <main className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <p className="text-sm text-ui-gray">No encontramos ese pedido.</p>
          <Link href="/catalogo" className="mt-6 text-sm font-semibold text-primary-dark">
            Ir al catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${ui.color}`}>
          <Icon className="h-9 w-9" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">{ui.title}</h1>
        <p className="mt-2 text-sm text-ui-gray">
          Tu número de pedido es <span className="font-semibold text-foreground">{orderNumber}</span>. {ui.text}
        </p>
        {total > 0 && <p className="mt-4 text-lg font-bold text-foreground">{formatMXN(total)} MXN</p>}
        <Link
          href="/catalogo"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionContent />
    </Suspense>
  );
}
