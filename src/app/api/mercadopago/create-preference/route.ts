import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/types";

// Crea la "preferencia" de pago de Mercado Pago Checkout Pro para UN pedido
// ya guardado en `orders` (ver charla 2026-09-16) -- el cliente es
// redirigido a la página de pago de Mercado Pago con esto. Un solo renglón
// por el total ya calculado (envío y descuento incluidos) en vez de
// desglosar producto por producto -- evita reconciliar redondeos entre
// nuestro cálculo y el de Mercado Pago.
export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Falta orderId" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const typedOrder = order as Order;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: typedOrder.order_number,
            title: `Pedido Merchy ${typedOrder.order_number}`,
            quantity: 1,
            unit_price: typedOrder.total,
            currency_id: "MXN",
          },
        ],
        payer: { name: typedOrder.contact_name, email: typedOrder.contact_email },
        external_reference: typedOrder.order_number,
        back_urls: {
          success: `${appUrl}/checkout/confirmacion?order=${typedOrder.order_number}&total=${typedOrder.total}`,
          failure: `${appUrl}/checkout/confirmacion?order=${typedOrder.order_number}&total=${typedOrder.total}`,
          pending: `${appUrl}/checkout/confirmacion?order=${typedOrder.order_number}&total=${typedOrder.total}`,
        },
        notification_url: `${appUrl}/api/mercadopago/webhook`,
      },
    });

    const initPoint = result.sandbox_init_point ?? result.init_point;
    if (!initPoint) return NextResponse.json({ error: "Mercado Pago no devolvió un link de pago" }, { status: 502 });
    return NextResponse.json({ init_point: initPoint });
  } catch (err) {
    console.error("mercadopago create-preference error", err);
    return NextResponse.json({ error: "No se pudo crear la preferencia de pago" }, { status: 502 });
  }
}
