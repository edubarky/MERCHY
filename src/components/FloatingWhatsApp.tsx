"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Botón flotante de ayuda por WhatsApp, visible en todo el sitio público
// (ver charla 2026-09-16). Se oculta en el Personalizador -- el chrome de
// esa pantalla (toolbar + Opciones de diseño) ya tiene la regla de nunca
// flotar sobre el lienzo (ver merchy_personalizador_chrome_sidebar), y un
// botón flotante encima competiría con esa misma zona visual.
export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("store_settings")
      .select("whatsapp_number")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setNumber((data?.whatsapp_number as string | null) ?? null));
  }, []);

  const hidden = pathname?.includes("/personalizar") || pathname?.startsWith("/admin");
  if (hidden || !number) return null;

  const digits = number.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent("Hola, tengo una duda sobre un pedido en Merchy")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.4 5.08L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.78 14.12c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.1.11-1.77-.11-.4-.13-.92-.3-1.58-.6-2.78-1.2-4.59-4-4.73-4.19-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.02.96-2.3.25-.28.55-.35.73-.35.19 0 .37.002.53.01.17.007.4-.065.62.47.24.57.8 1.98.87 2.12.07.14.12.31.02.5-.1.19-.15.3-.29.46-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.45.12.61-.04.16-.17.7-.81.89-1.09.19-.28.38-.23.63-.14.26.1 1.64.77 1.92.91.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}
