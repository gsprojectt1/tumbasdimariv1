/*
# Tumbas Storage Policies

Public bucket 'uploads' for product images, store logos/banners, courier docs,
chat images, and avatars. Authenticated users can upload; public read.
*/

DROP POLICY IF EXISTS "uploads_read_public" ON storage.objects;
CREATE POLICY "uploads_read_public" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_insert_auth" ON storage.objects;
CREATE POLICY "uploads_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_update_own" ON storage.objects;
CREATE POLICY "uploads_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid()) WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_delete_own" ON storage.objects;
CREATE POLICY "uploads_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid());
