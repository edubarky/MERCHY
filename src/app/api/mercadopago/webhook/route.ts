import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Mercado Pago llama aquí server-to-server cuando cambia el estado de un
// pago (ver charla 2026-09-16) -- es la ÚNICA fuente de verdad para marcar
// un pedido como pagado (el query string con el que MP redirige al
// cliente de vuelta es solo para la UI, nunca para confiar en el pago).
// Acepta los 2 formatos que MP ha usado (?data.id=&type=payment y el IPN
// viejo ?topic=&id=) -- siempre responde 200 para que MP no reintente de
// más, incluso si el pago no aplicaba (ej. notificaciones de "merchant_order").
function mapStatus(mpStatus: string): "paid" | "failed" | "pending" {
  if (mpStatus === "approved") return "paid";
  if (mpStatus === "rejected" || mpStatus === "cancelled") return "failed";
  return "pending";
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (type !== "payment" || !paymentId) return NextResponse.json({ ok: true });

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    });
    if (!res.ok) return NextResponse.json({ ok: true });
    const payment = await res.json();
    const orderNumber = payment.external_reference as string | null;
    if (!orderNumber) return NextResponse.json({ ok: true });

    const paymentStatus = mapStatus(payment.status as string);
    const supabase = createAdminClient();
    const update: Record<string, unknown> = { payment_status: paymentStatus, payment_reference: String(paymentId) };
    if (paymentStatus === "paid") update.status = "confirmed";
    await supabase.from("orders").update(update).eq("order_number", orderNumber);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mercadopago webhook error", err);
    return NextResponse.json({ ok: true });
  }
}
