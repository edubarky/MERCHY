import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMXN } from "@/lib/pricing";
import type { Order, OrderItem, StoreSettings } from "@/types";

// Envía el correo de "nuevo pedido" al admin y la confirmación al cliente
// (ver charla 2026-09-16) justo después de guardar el pedido en checkout.
// Nunca debe tronar el checkout: cualquier falla de correo se traga aquí
// (ver el try/catch del que llama a esta ruta) -- el pedido ya quedó
// guardado en la base, el correo es un aviso, no el registro real.
//
// OJO -- remitente: mientras no se verifique un dominio propio en Resend,
// "onboarding@resend.dev" SOLO entrega al correo con el que se creó la
// cuenta de Resend (ver charla 2026-09-16); el correo al ADMIN funcionará
// si notification_email es ese mismo correo, pero el de confirmación al
// CLIENTE no va a llegar a clientes reales hasta verificar un dominio
// (ej. mail.merchy.mx) y cambiar este remitente.
const FROM = "Merchy <onboarding@resend.dev>";

function orderItemsHtml(items: OrderItem[]): string {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.product_name} (${i.total_quantity} pzas)</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${formatMXN(i.total_price)}</td></tr>`
    )
    .join("");
}

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, error: "RESEND_API_KEY no configurada" });

  const supabase = createAdminClient();
  const [{ data: order }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("store_settings").select("*").eq("id", "default").maybeSingle(),
  ]);
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const typedOrder = order as Order;
  const typedItems = (items ?? []) as OrderItem[];
  const notificationEmail = (settings as StoreSettings | null)?.notification_email;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = await Promise.allSettled([
    notificationEmail
      ? resend.emails.send({
          from: FROM,
          to: notificationEmail,
          subject: `Nuevo pedido ${typedOrder.order_number} — ${formatMXN(typedOrder.total)} MXN`,
          html: `
            <h2>Nuevo pedido: ${typedOrder.order_number}</h2>
            <p><strong>${typedOrder.contact_name}</strong> · ${typedOrder.contact_phone} · ${typedOrder.contact_email}</p>
            <table style="border-collapse:collapse;width:100%;max-width:480px">${orderItemsHtml(typedItems)}</table>
            <p style="margin-top:12px"><strong>Total: ${formatMXN(typedOrder.total)} MXN</strong></p>
            <p>Método de pago: ${typedOrder.payment_method ?? "-"}</p>
          `,
        })
      : Promise.resolve(null),
    resend.emails.send({
      from: FROM,
      to: typedOrder.contact_email,
      subject: `¡Recibimos tu pedido ${typedOrder.order_number}!`,
      html: `
        <h2>¡Gracias por tu compra, ${typedOrder.contact_name}!</h2>
        <p>Tu número de pedido es <strong>${typedOrder.order_number}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">${orderItemsHtml(typedItems)}</table>
        <p style="margin-top:12px"><strong>Total: ${formatMXN(typedOrder.total)} MXN</strong></p>
        <p>Te contactaremos para confirmar el pago y arrancar la producción.</p>
      `,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`resend send #${i} failed`, r.reason);
  });

  return NextResponse.json({ ok: true });
}
