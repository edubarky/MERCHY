-- MERCHY — Disponibilidad de técnicas de impresión por producto.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Esto separa dos conceptos a propósito:
--   1) DISPONIBILIDAD de una técnica para un producto (esta migración).
--   2) CONFIGURACIÓN DE PRECIOS de esa técnica (print_techniques.price_table
--      — se completa después, técnica por técnica, con datos reales; NO se
--      inventa ni se copia de otra técnica aquí).
--
-- Una técnica puede asignarse a un producto aunque su price_table siga
-- vacío ('[]', el mismo default que ya usa la columna) — es un estado
-- válido, no un error a corregir.

-- ----------------------------------------------------------------
-- 1) Alta de las 2 técnicas que el admin pidió y todavía no existían.
--    Sin price_table todavía (queda en el default '[]') — a propósito,
--    hasta tener las tablas de precio reales de cada una.
-- ----------------------------------------------------------------
INSERT INTO print_techniques (name, description, price_table, active, sort_order)
VALUES
  ('Grabado en Láser', NULL, '[]', true, 6),
  ('Tampografía',       NULL, '[]', true, 7);

-- ----------------------------------------------------------------
-- 2) Relación producto ↔ técnica (solo disponibilidad — sin precio).
-- ----------------------------------------------------------------
CREATE TABLE product_print_techniques (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  technique_id  UUID NOT NULL REFERENCES print_techniques(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, technique_id)
);

ALTER TABLE product_print_techniques ENABLE ROW LEVEL SECURITY;

-- Mismo patrón ya usado para products/product_variants/print_techniques
-- (lectura pública) + el mismo patrón de escritura ya usado para
-- suppliers/clients/projects en 002_admin_schema.sql (cualquier sesión
-- autenticada = admin logueado, no hay rol "admin" separado en este
-- proyecto).
CREATE POLICY "public_read" ON product_print_techniques FOR SELECT USING (true);
CREATE POLICY "agents_write_product_print_techniques" ON product_print_techniques
  USING (auth.role() = 'authenticated');