-- MERCHY — Asignación masiva de técnicas de impresión por producto,
-- según el criterio dado explícitamente por el usuario (no es una regla
-- automática por categoría en código — eso se pidió expresamente NO
-- hacerlo; esto es una carga de datos puntual, hecha una sola vez, con
-- el mismo resultado final que si se hubiera marcado cada casilla a mano
-- en Productos → Editar producto → Técnicas).
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Criterio aplicado (dado por el usuario):
--   Textiles                → Serigrafía + Textil DTF + Bordado
--     (+ DTG solo Playeras y Sudaderas, no el resto de "Deportivo")
--   Todo lo no textil       → Serigrafía + DTF UV
--   Todo lo metálico        → Serigrafía + Grabado en Láser + DTF UV
--     (hoy: ningún producto existente clasifica aquí — Termos y Bebidas
--     no tiene productos dados de alta todavía)
--   Todo lo pequeño         → Tampografía
--     (hoy: ningún producto existente clasifica aquí)
--
-- Clasificación por producto, usando el campo real `composition`
-- (no adivinado) + 3 casos ambiguos de "Deportivo" resueltos
-- explícitamente por el usuario (Set de ejercicio Bor, Tapete Century,
-- Tapete de Yoga Minsk → los 3 "no textil").
--
-- Es seguro volver a correr este script: ON CONFLICT DO NOTHING evita
-- duplicados si algún producto (ej. Sudadera Ocean) ya tenía alguna de
-- estas técnicas asignada manualmente.

WITH mapping (product_name, technique_name) AS (
  VALUES
    -- ---- Playeras + Sudaderas: textil + DTG (20 productos) ----
    ('Player Premium', 'Serigrafía'), ('Player Premium', 'Textil DTF'), ('Player Premium', 'Bordado'), ('Player Premium', 'DTG'),
    ('Playera Clásica', 'Serigrafía'), ('Playera Clásica', 'Textil DTF'), ('Playera Clásica', 'Bordado'), ('Playera Clásica', 'DTG'),
    ('Playera Gold', 'Serigrafía'), ('Playera Gold', 'Textil DTF'), ('Playera Gold', 'Bordado'), ('Playera Gold', 'DTG'),
    ('Playera Infinity Hombre', 'Serigrafía'), ('Playera Infinity Hombre', 'Textil DTF'), ('Playera Infinity Hombre', 'Bordado'), ('Playera Infinity Hombre', 'DTG'),
    ('Playera Infinity Mujer', 'Serigrafía'), ('Playera Infinity Mujer', 'Textil DTF'), ('Playera Infinity Mujer', 'Bordado'), ('Playera Infinity Mujer', 'DTG'),
    ('Playera Málaga', 'Serigrafía'), ('Playera Málaga', 'Textil DTF'), ('Playera Málaga', 'Bordado'), ('Playera Málaga', 'DTG'),
    ('Playera Mérida', 'Serigrafía'), ('Playera Mérida', 'Textil DTF'), ('Playera Mérida', 'Bordado'), ('Playera Mérida', 'DTG'),
    ('Playera Over', 'Serigrafía'), ('Playera Over', 'Textil DTF'), ('Playera Over', 'Bordado'), ('Playera Over', 'DTG'),
    ('Playera Sport Hombre', 'Serigrafía'), ('Playera Sport Hombre', 'Textil DTF'), ('Playera Sport Hombre', 'Bordado'), ('Playera Sport Hombre', 'DTG'),
    ('Playera Sport Mujer', 'Serigrafía'), ('Playera Sport Mujer', 'Textil DTF'), ('Playera Sport Mujer', 'Bordado'), ('Playera Sport Mujer', 'DTG'),
    ('Playera Tampa', 'Serigrafía'), ('Playera Tampa', 'Textil DTF'), ('Playera Tampa', 'Bordado'), ('Playera Tampa', 'DTG'),
    ('Playera Tank Mujer', 'Serigrafía'), ('Playera Tank Mujer', 'Textil DTF'), ('Playera Tank Mujer', 'Bordado'), ('Playera Tank Mujer', 'DTG'),
    ('Playera Vintage', 'Serigrafía'), ('Playera Vintage', 'Textil DTF'), ('Playera Vintage', 'Bordado'), ('Playera Vintage', 'DTG'),
    ('Polo Infinity Hombre', 'Serigrafía'), ('Polo Infinity Hombre', 'Textil DTF'), ('Polo Infinity Hombre', 'Bordado'), ('Polo Infinity Hombre', 'DTG'),
    ('Polo Infinity Mujer', 'Serigrafía'), ('Polo Infinity Mujer', 'Textil DTF'), ('Polo Infinity Mujer', 'Bordado'), ('Polo Infinity Mujer', 'DTG'),
    ('Sudadera Bas', 'Serigrafía'), ('Sudadera Bas', 'Textil DTF'), ('Sudadera Bas', 'Bordado'), ('Sudadera Bas', 'DTG'),
    ('Sudadera Cap', 'Serigrafía'), ('Sudadera Cap', 'Textil DTF'), ('Sudadera Cap', 'Bordado'), ('Sudadera Cap', 'DTG'),
    ('Sudadera Coast', 'Serigrafía'), ('Sudadera Coast', 'Textil DTF'), ('Sudadera Coast', 'Bordado'), ('Sudadera Coast', 'DTG'),
    ('Sudadera Ocean', 'Serigrafía'), ('Sudadera Ocean', 'Textil DTF'), ('Sudadera Ocean', 'Bordado'), ('Sudadera Ocean', 'DTG'),
    ('Sudadera Sand', 'Serigrafía'), ('Sudadera Sand', 'Textil DTF'), ('Sudadera Sand', 'Bordado'), ('Sudadera Sand', 'DTG'),

    -- ---- Deportivo (prenda textil, SIN DTG) (3 productos) ----
    ('Crop Top Fili', 'Serigrafía'), ('Crop Top Fili', 'Textil DTF'), ('Crop Top Fili', 'Bordado'),
    ('Top Deportivo Espalda', 'Serigrafía'), ('Top Deportivo Espalda', 'Textil DTF'), ('Top Deportivo Espalda', 'Bordado'),
    ('Top Olímpico Cruzado', 'Serigrafía'), ('Top Olímpico Cruzado', 'Textil DTF'), ('Top Olímpico Cruzado', 'Bordado'),

    -- ---- No textil (3 productos, confirmados explícitamente por el usuario) ----
    ('Set de ejercicio Bor', 'Serigrafía'), ('Set de ejercicio Bor', 'DTF UV'),
    ('Tapete Century', 'Serigrafía'), ('Tapete Century', 'DTF UV'),
    ('Tapete de Yoga Minsk', 'Serigrafía'), ('Tapete de Yoga Minsk', 'DTF UV')

    -- "Metálico" y "Pequeño": sin productos existentes que clasifiquen
    -- hoy (Termos y Bebidas / Gorras / Mochilas no tienen productos
    -- dados de alta todavía) — nada que insertar por ahora.
)
INSERT INTO product_print_techniques (product_id, technique_id)
SELECT p.id, t.id
FROM mapping m
JOIN products p ON p.name = m.product_name
JOIN print_techniques t ON t.name = m.technique_name
ON CONFLICT (product_id, technique_id) DO NOTHING;