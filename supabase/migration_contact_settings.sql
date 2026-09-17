-- MERCHY — Datos de contacto editables (correo de notificación de pedidos +
-- WhatsApp mostrado en todo el sitio). Ver charla 2026-09-16. Correr
-- completo en Supabase SQL Editor.

create table if not exists store_settings (
  id text primary key default 'default',
  notification_email text,
  whatsapp_number text,
  -- Datos de transferencia SPEI que se le muestran al cliente que elige
  -- "Transferencia" en el checkout -- el pedido queda pendiente y se
  -- confirma manualmente en el admin al ver el depósito (ver charla
  -- 2026-09-16, transferencia directa a la cuenta del negocio, sin pasar
  -- por ninguna pasarela).
  transfer_bank_name text,
  transfer_clabe text,
  transfer_beneficiary text,
  updated_at timestamptz not null default now()
);
alter table store_settings enable row level security;

-- Lectura pública -- el botón flotante de WhatsApp lo necesita en
-- cualquier página, sin sesión.
drop policy if exists "public_read" on store_settings;
create policy "public_read" on store_settings for select using (true);
-- Solo el admin (logueado) puede editarlo, mismo patrón ya usado para
-- print_techniques (ver migración 006_print_techniques_write_policy.sql).
drop policy if exists "agents_write_store_settings" on store_settings;
create policy "agents_write_store_settings" on store_settings
  using (auth.role() = 'authenticated');

insert into store_settings (id, notification_email, whatsapp_number) values
  ('default', null, '+525530378774')
on conflict (id) do nothing;

-- Nota: shipping_zones/production_time_tiers (migration_shipping_zones.sql)
-- y categories/price_tiers (schema.sql) solo tenían política de LECTURA
-- pública -- sin una política de escritura para 'authenticated', los
-- guardados desde Configuración quedan bloqueados en silencio por RLS
-- (update sin error, pero 0 filas afectadas). Se agrega aquí la misma
-- política de escritura para dejarlo consistente con el resto del admin.
drop policy if exists "agents_write_shipping_zones" on shipping_zones;
create policy "agents_write_shipping_zones" on shipping_zones
  using (auth.role() = 'authenticated');

drop policy if exists "agents_write_production_time_tiers" on production_time_tiers;
create policy "agents_write_production_time_tiers" on production_time_tiers
  using (auth.role() = 'authenticated');

drop policy if exists "agents_write_categories" on categories;
create policy "agents_write_categories" on categories
  using (auth.role() = 'authenticated');

drop policy if exists "agents_write_price_tiers" on price_tiers;
create policy "agents_write_price_tiers" on price_tiers
  using (auth.role() = 'authenticated');
