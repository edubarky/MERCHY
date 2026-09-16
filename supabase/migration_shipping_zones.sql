-- MERCHY — Rediseño de "Método de envío" en checkout (ver charla 2026-09-16)
-- Costo/tiempo de envío por zona geográfica + tiempo de producción real +
-- piezas por caja por categoría. Correr completo en Supabase SQL Editor.

alter table categories add column if not exists pzas_per_box integer not null default 30;

create table if not exists shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cve_ent_list text[] not null,
  standard_cost_per_box numeric(10,2) not null,
  express_cost_per_box numeric(10,2) not null,
  standard_dias_min int not null,
  standard_dias_max int not null,
  express_dias_min int not null,
  express_dias_max int not null,
  sort_order int not null default 0
);
alter table shipping_zones enable row level security;
create policy "public_read" on shipping_zones for select using (true);

create table if not exists production_time_tiers (
  id uuid primary key default gen_random_uuid(),
  qty_min int not null,
  qty_max int,
  dias_min int not null,
  dias_max int not null,
  label text not null,
  sort_order int not null default 0
);
alter table production_time_tiers enable row level security;
create policy "public_read" on production_time_tiers for select using (true);

-- Tiempo de producción: regla de negocio real dada por el usuario.
insert into production_time_tiers (qty_min, qty_max, dias_min, dias_max, label, sort_order) values
  (1, 99, 4, 5, '<100 pzas', 1),
  (100, 500, 8, 10, '100-500 pzas', 2),
  (501, null, 12, 15, '+500 pzas', 3);

-- Zonas de envío: estimado inicial, editable después en Configuración.
-- cve_ent_list son claves de estado INEGI (2 dígitos). "Resto del país"
-- excluye explícitamente los estados de las otras 2 zonas -- getShippingZone
-- toma la primera zona cuya lista incluya el estado, así que una lista que
-- se solapara con otra zona quedaría enmascarada según el orden.
insert into shipping_zones (name, cve_ent_list, standard_cost_per_box, express_cost_per_box, standard_dias_min, standard_dias_max, express_dias_min, express_dias_max, sort_order) values
  ('CDMX y Edomex', array['09','15'], 90, 180, 2, 3, 1, 2, 1),
  ('Resto del país', array['01','05','06','08','10','11','12','13','14','16','17','18','19','20','21','22','24','25','27','28','29','30','32'], 130, 250, 3, 5, 2, 3, 2),
  ('Zona extendida', array['02','03','04','07','23','26','31'], 180, 350, 5, 7, 3, 4, 3)
on conflict do nothing;

-- Piezas por caja por categoría: estimado inicial, editable después.
update categories set pzas_per_box = 40 where slug = 'playeras';
update categories set pzas_per_box = 25 where slug = 'sudaderas';
update categories set pzas_per_box = 50 where slug = 'gorras';
update categories set pzas_per_box = 24 where slug = 'termos-y-bebidas';
update categories set pzas_per_box = 15 where slug = 'mochilas';
update categories set pzas_per_box = 20 where slug = 'deportivo';
