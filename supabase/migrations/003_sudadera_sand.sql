-- MERCHY — Da de alta "Sudadera Sand" como producto real (antes solo
-- existía como fixture estático en la Home, ahora se quita de ahí y se
-- muestra igual que cualquier otro producto real del catálogo).
-- Ejecutar en: Supabase Dashboard → SQL Editor

with new_product as (
  insert into products (sku, name, category_id, sizes_available, costo, active)
  values (
    'MERCHY-SUDADERA-SAND',
    'Sudadera Sand',
    (select id from categories where slug = 'sudaderas'),
    '{}',
    145.20,
    true
  )
  returning id
)
insert into product_variants (product_id, color_name, color_hex, images, stock, active)
select new_product.id, x.color_name, x.color_hex, x.images, 0, true
from new_product
cross join (
  values
    ('Beige', '#CDBCB1', ARRAY['/Home/FAVORITOS%20DEL%20MOMENTO/sudadera-sand.jpg']),
    ('Azul marino', '#114C8F', ARRAY['/Home/FAVORITOS%20DEL%20MOMENTO/sudadera-sand-azul-marino.jpg']),
    ('Verde olivo', '#2F352B', ARRAY['/Home/FAVORITOS%20DEL%20MOMENTO/sudadera-sand-verde-olivo.png']),
    ('Blanco', '#FFFFFF', ARRAY[]::text[]),
    ('Gris', '#8A8D91', ARRAY[]::text[])
) as x(color_name, color_hex, images);
