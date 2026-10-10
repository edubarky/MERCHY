-- Rangos de costo del PROVEEDOR, independientes de los rangos de venta
-- (price_tiers) -- el proveedor puede dar mejor precio a partir de 51 pzas
-- mientras que MERCHY vende en rangos de 1-3/4-9/10-19... (ver charla
-- 2026-10-10: "puede ser distinto el rango del costo del proveedor que el
-- rango de precio mío"). Array de {qty_min, qty_max, costo}, qty_max null
-- = sin límite superior. Vacío (default) = cero cambio de comportamiento,
-- se sigue usando el costo plano de siempre.
alter table products add column if not exists costo_tiers jsonb not null default '[]'::jsonb;
