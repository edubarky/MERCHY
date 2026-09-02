-- ============================================================
-- order_items le faltaba una política de INSERT -- solo tenía
-- "order_items_own" (SELECT). El checkout nuevo (guest checkout, mismo
-- criterio que orders_insert: acepta cualquier inserción, igual que la
-- tabla orders ya hace) creaba el renglón en `orders` sin problema pero
-- fallaba con 403 al insertar sus `order_items`, confirmado en pruebas
-- reales contra este proyecto.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (true);
