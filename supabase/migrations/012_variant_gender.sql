-- Género como selector sobre Color, no como producto aparte (ver charla
-- 2026-10-09: "Playera Infinity Mujer"/"Playera Infinity Hombre" dejan de
-- ser 2 productos). gender NULL = aplica sin importar género (todos los
-- productos existentes, sin cambio de comportamiento). sizes_available
-- NULL en la variante = hereda el de products.sizes_available (también
-- sin cambio para quien no lo use).
alter table product_variants add column if not exists gender text;
alter table product_variants add column if not exists sizes_available text[];

-- Fusiona "Playera Infinity Mujer" (63bed170-92b0-430c-8929-31900b701388)
-- dentro de "Playera Infinity Hombre" (8dd40d39-c7c9-444c-81c0-989b6a1dc981),
-- que pasa a llamarse solo "Playera Infinity". Mujer no tenía XXL -- se
-- guarda su propio sizes_available en sus variantes.
update product_variants set gender = 'hombre'
  where product_id = '8dd40d39-c7c9-444c-81c0-989b6a1dc981';
update product_variants set
  product_id = '8dd40d39-c7c9-444c-81c0-989b6a1dc981',
  gender = 'mujer',
  sizes_available = array['XS','S','M','L','XL']
  where product_id = '63bed170-92b0-430c-8929-31900b701388';
update products set name = 'Playera Infinity' where id = '8dd40d39-c7c9-444c-81c0-989b6a1dc981';
update products set active = false where id = '63bed170-92b0-430c-8929-31900b701388';

-- Fusiona "Polo Infinity Mujer" (58d5ff7d-9cc6-41e5-bf44-8dcccf06f6b6)
-- dentro de "Polo Infinity Hombre" (d6ec44c5-e811-49df-8158-77ea37e5977b),
-- que pasa a llamarse solo "Polo Infinity". Mismas tallas en ambos
-- (S-XXL) -- las variantes de Mujer heredan sizes_available del producto,
-- sin necesidad de override.
update product_variants set gender = 'hombre'
  where product_id = 'd6ec44c5-e811-49df-8158-77ea37e5977b';
update product_variants set
  product_id = 'd6ec44c5-e811-49df-8158-77ea37e5977b',
  gender = 'mujer'
  where product_id = '58d5ff7d-9cc6-41e5-bf44-8dcccf06f6b6';
update products set name = 'Polo Infinity' where id = 'd6ec44c5-e811-49df-8158-77ea37e5977b';
update products set active = false where id = '58d5ff7d-9cc6-41e5-bf44-8dcccf06f6b6';
