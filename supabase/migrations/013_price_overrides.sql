-- Precio editable por rango de cantidad, por producto (ver charla
-- 2026-10-10: "el costo puede variar por rango... simplifiquemos a solo
-- eso"). Clave = price_tiers.id, valor = precio final IVA incluido para
-- ese rango en ESTE producto -- gana sobre el cálculo automático
-- (costo ÷ margen del rango) cuando existe. Default '{}' = cero cambio de
-- comportamiento para todos los productos existentes.
alter table products add column if not exists price_overrides jsonb not null default '{}'::jsonb;
