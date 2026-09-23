import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key -- se salta TODAS las políticas de RLS.
// SOLO para usarse dentro de rutas de servidor (src/app/api/**) que
// necesitan leer/escribir sin una sesión de usuario real (webhooks,
// envío de correos) -- ver charla 2026-09-16. Nunca importar esto desde
// un componente de cliente ni exponer la key con NEXT_PUBLIC_.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
