-- Merchy -- "Compartir con mi cliente" en /carrito: guarda una copia del
-- carrito (productos, colores, tallas, logos ya subidos a Storage) con un
-- id propio para armar un link corto que reconstruye ese mismo carrito en
-- el navegador de quien lo abra (ver charla 2026-10-05). Sin dueño
-- (user_id) a propósito -- la tienda no tiene cuentas de cliente reales
-- todavía (mismo criterio que orders_insert: confía en cualquier
-- inserción), y el id al azar (uuid) ya hace de contraseña del link.
create table if not exists shared_carts (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  created_at timestamptz not null default now()
);

alter table shared_carts enable row level security;

create policy "shared_carts_insert" on shared_carts
  for insert with check (true);
create policy "shared_carts_read" on shared_carts
  for select using (true);
