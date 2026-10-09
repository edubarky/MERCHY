-- Portada del producto: qué color aparece primero en la tarjeta del
-- catálogo (y por default, su primera foto). Antes era implícito --
-- siempre el color más antiguo (order by created_at), sin control manual.
-- Default 0 en todas las filas existentes no cambia nada hasta que alguien
-- use "Usar como portada" (ver admin/productos/[id]) -- el ORDER BY cae a
-- created_at como segundo criterio, igual que el comportamiento de hoy.
alter table product_variants add column if not exists sort_order integer not null default 0;
