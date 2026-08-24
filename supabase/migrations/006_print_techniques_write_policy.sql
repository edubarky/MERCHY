-- MERCHY — Permiso de escritura para editar técnicas de impresión desde
-- el admin (nombre, descripción, tabla de precios) y crear nuevas.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- SOLO NECESARIO SI, al probar "Guardar" en /admin/tecnicas en local,
-- aparece un error de permisos (RLS). schema.sql únicamente documenta
-- la política de LECTURA pública de print_techniques
-- ("public_read" ... USING (active = true)); no hay evidencia de que ya
-- exista una política de escritura para sesiones autenticadas, así que
-- se prepara aquí por si falta -- mismo patrón ya usado en
-- 002_admin_schema.sql para suppliers/clients/projects, y en
-- 004_product_print_techniques.sql para la tabla de relación.
--
-- Si la política ya existe, este script fallará con un error de
-- "policy already exists" -- en ese caso no hace falta correrlo, ya
-- estaba resuelto.

CREATE POLICY "agents_write_print_techniques" ON print_techniques
  USING (auth.role() = 'authenticated');