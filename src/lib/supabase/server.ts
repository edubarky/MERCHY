import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in Server Components — middleware handles session refresh
          }
        },
      },
      // Sin esto, Next.js cachea cada request de supabase-js (usa fetch()
      // por debajo) en su propio Data Cache -- un producto editado en el
      // admin (fotos, precio, lo que sea) podía seguir viéndose viejo en
      // la tienda pública indefinidamente, sin relación con el caché del
      // navegador (ver charla 2026-09-22: "cambié el blanco... no se
      // actualizó"). cookies() ya vuelve dinámico el RENDER de la página,
      // pero eso no vuelve "no-store" cada fetch individual dentro de
      // ella -- son dos cachés distintas de Next. Este cliente lo usan
      // tanto la tienda pública (catalogo/page.tsx, producto/[id]/...)
      // como partes del admin, así que se corrige una sola vez aquí en
      // vez de repetir `{ cache: "no-store" }` en cada página.
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
