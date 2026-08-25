-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- "Tus diseños" — biblioteca permanente del usuario
-- ============================================================
-- La tabla `saved_logos` (user_id -> auth.users, RLS "cada quien ve/edita
-- solo lo suyo") ya existía en schema.sql pero nunca tuvo un lugar real
-- donde guardar los archivos -- esta migración solo agrega ESO: el bucket
-- de Storage y sus políticas de acceso. No se toca la tabla saved_logos ni
-- ninguna otra tabla existente.
--
-- Mismo patrón que el bucket "product-images" (público para lectura --
-- simplifica servir <img src> directo, sin URLs firmadas, igual que ya se
-- hace con las fotos de producto), pero con escritura/borrado restringidos
-- al dueño real del archivo vía RLS sobre storage.objects, usando el
-- primer segmento de la ruta como su user_id (convención de carpeta:
-- {user_id}/{archivo}, la misma que usa la documentación oficial de
-- Supabase para bibliotecas por-usuario). El flag "public" de un bucket
-- solo afecta el endpoint /object/public/... (que es el que usa
-- getPublicUrl() en el código) -- no anula estas políticas para accesos
-- autenticados vía el SDK (list/download), así que un usuario no puede
-- listar ni descargar los archivos de otro aunque el bucket sea público.

insert into storage.buckets (id, name, public)
values ('saved-logos', 'saved-logos', true)
on conflict (id) do nothing;

create policy "saved_logos_storage_read_own"
  on storage.objects for select
  using (bucket_id = 'saved-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "saved_logos_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'saved-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "saved_logos_storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'saved-logos' and auth.uid()::text = (storage.foldername(name))[1]);