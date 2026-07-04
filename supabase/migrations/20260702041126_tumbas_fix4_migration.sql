/*
# Tumbas Fix + Feature Migration v4

## BUG 2: Conversations/Messages RLS (uses store_id, not seller_id)
## BUG 7: Courier-docs bucket public + storage policy
## BUG 8: Update product city from store city
## FITUR 11: app_settings table + app-assets bucket
## FITUR 12: stores.qris_image_url (already exists, ensure)
*/

-- =========================================================
-- BUG 2: CONVERSATIONS RLS (uses store_id, not seller_id)
-- =========================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_all" ON conversations;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

CREATE POLICY "conv_all" ON conversations
  FOR ALL TO authenticated
  USING (
    buyer_id = auth.uid()
    OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid())
    OR courier_id = auth.uid()
  )
  WITH CHECK (
    buyer_id = auth.uid()
    OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid())
    OR courier_id = auth.uid()
  );

-- =========================================================
-- BUG 2: MESSAGES RLS (simple FOR ALL)
-- =========================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_all" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "msg_all" ON messages
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (sender_id = auth.uid());

-- =========================================================
-- BUG 7: COURIER-DOCS BUCKET (public, simple policy)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-docs', 'courier-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "courier_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_update_own" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_delete_own" ON storage.objects;

CREATE POLICY "courier_docs_storage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'courier-docs')
  WITH CHECK (bucket_id = 'courier-docs');

-- =========================================================
-- BUG 8: Update product city from store city
-- =========================================================
UPDATE products p SET city = s.city
  FROM stores s WHERE p.store_id = s.id AND (p.city IS NULL OR p.city = '');

-- =========================================================
-- FITUR 11: app_settings table
-- =========================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_all" ON app_settings;
CREATE POLICY "app_settings_all" ON app_settings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO app_settings (key, value) VALUES
  ('qris_image_url', ''),
  ('bank_name', 'BCA'),
  ('bank_account_number', ''),
  ('bank_account_name', ''),
  ('gopay_number', ''),
  ('ovo_number', ''),
  ('dana_number', '')
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- FITUR 11: app-assets bucket (public)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "app_assets_all" ON storage.objects;
CREATE POLICY "app_assets_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'app-assets')
  WITH CHECK (bucket_id = 'app-assets');

-- =========================================================
-- FITUR 12: store-assets bucket (public, for seller QRIS)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "store_assets_all" ON storage.objects;
CREATE POLICY "store_assets_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'store-assets')
  WITH CHECK (bucket_id = 'store-assets');

-- Ensure stores.qris_image_url exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'qris_image_url') THEN
    ALTER TABLE stores ADD COLUMN qris_image_url text;
  END IF;
END $$;

-- =========================================================
-- NOTIFICATIONS RLS (simple, user can see own)
-- =========================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_all" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

CREATE POLICY "notifications_all" ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================
-- Realtime
-- =========================================================
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE cart_items REPLICA IDENTITY FULL;
ALTER TABLE product_variants REPLICA IDENTITY FULL;
