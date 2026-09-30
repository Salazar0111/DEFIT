-- Fotos de perfil: bucket público de lectura (las URLs llevan el id de la persona y un sello de tiempo),
-- y cada persona solo puede escribir dentro de su propia carpeta. Máximo 600 KB, solo JPEG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 614400, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 614400, allowed_mime_types = array['image/jpeg'];

create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_read_own_list" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
