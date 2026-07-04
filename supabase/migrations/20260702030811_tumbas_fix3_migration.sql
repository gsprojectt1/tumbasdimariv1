/*
# Tumbas Fix + Feature Migration v3

## Fixes
- FIX 2: Orders RLS - simple non-recursive policies
- FIX 3: Conversations/Messages RLS - simple FOR ALL policies (conversations uses store_id, not seller_id)
- FIX 4: Couriers/Courier documents RLS - simple FOR ALL, public bucket

## New Features
- FITUR 8: product_variants table restructured (group_name, option_name, price_modifier, stock)
- FITUR 9: stores.qris_image_url column
- FITUR 10: payment_accounts table
- FITUR 11: shipping_settings table
- FITUR 13: delivery_tracking table for courier GPS
*/

-- =========================================================
-- FIX 2: ORDERS RLS (no recursion)
-- =========================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;

CREATE POLICY "orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orders_select" ON orders
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid())
    OR courier_id = auth.uid()
  );

CREATE POLICY "orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid()
    OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid())
    OR courier_id = auth.uid()
  );

-- =========================================================
-- FIX 2: ORDER_ITEMS RLS (no recursion)
-- =========================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =========================================================
-- FIX 3: CONVERSATIONS RLS (uses store_id, not seller_id)
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
-- FIX 3: MESSAGES RLS (simple FOR ALL)
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
-- FIX 4: COURIERS RLS (simple FOR ALL)
-- =========================================================
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couriers_all" ON couriers;
DROP POLICY IF EXISTS "couriers_insert" ON couriers;
DROP POLICY IF EXISTS "couriers_select" ON couriers;
DROP POLICY IF EXISTS "couriers_update" ON couriers;

CREATE POLICY "couriers_all" ON couriers
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_online = true)
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- FIX 4: COURIER_DOCUMENTS RLS (simple FOR ALL)
-- =========================================================
ALTER TABLE courier_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_docs_all" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_insert" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_select" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_delete" ON courier_documents;

CREATE POLICY "courier_docs_all" ON courier_documents
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================
-- FIX 4: COURIER-DOCS BUCKET (public for simplicity)
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
-- FITUR 8: PRODUCT_VARIANTS restructured
-- =========================================================
DROP TABLE IF EXISTS product_variants CASCADE;

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  option_name text NOT NULL,
  price_modifier int DEFAULT 0,
  stock int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_variants_select_public" ON product_variants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "product_variants_insert_own" ON product_variants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM stores JOIN products ON products.store_id = stores.id
    WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()
  ));

CREATE POLICY "product_variants_update_own" ON product_variants
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stores JOIN products ON products.store_id = stores.id
    WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()
  ));

CREATE POLICY "product_variants_delete_own" ON product_variants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stores JOIN products ON products.store_id = stores.id
    WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);

-- cart_items: variant_selected + unit_price
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'variant_selected') THEN
    ALTER TABLE cart_items ADD COLUMN variant_selected jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'unit_price') THEN
    ALTER TABLE cart_items ADD COLUMN unit_price int DEFAULT 0;
  END IF;
END $$;

-- =========================================================
-- FITUR 9: stores.qris_image_url + qris-images bucket
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'qris_image_url') THEN
    ALTER TABLE stores ADD COLUMN qris_image_url text;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('qris-images', 'qris-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "qris_images_all" ON storage.objects;
CREATE POLICY "qris_images_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'qris-images')
  WITH CHECK (bucket_id = 'qris-images');

-- =========================================================
-- FITUR 10: payment_accounts table
-- =========================================================
CREATE TABLE IF NOT EXISTS payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'bank' CHECK (type IN ('bank','ewallet')),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_accounts_all" ON payment_accounts;
CREATE POLICY "payment_accounts_all" ON payment_accounts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS payment_accounts_user_id_idx ON payment_accounts(user_id);

-- =========================================================
-- FITUR 11: shipping_settings table
-- =========================================================
CREATE TABLE IF NOT EXISTS shipping_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  price_per_km int DEFAULT 1000,
  minimum_fee int DEFAULT 3000,
  free_shipping_minimum int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id)
);
ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_settings_all" ON shipping_settings;
CREATE POLICY "shipping_settings_all" ON shipping_settings
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

DROP POLICY IF EXISTS "shipping_settings_select_public" ON shipping_settings;
CREATE POLICY "shipping_settings_select_public" ON shipping_settings
  FOR SELECT TO anon, authenticated USING (true);

-- =========================================================
-- FITUR 13: delivery_tracking table
-- =========================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_tracking_all" ON delivery_tracking;
CREATE POLICY "delivery_tracking_all" ON delivery_tracking
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS delivery_tracking_delivery_id_idx ON delivery_tracking(delivery_id);

-- =========================================================
-- Ensure orders columns exist
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_type') THEN
    ALTER TABLE orders ADD COLUMN delivery_type text DEFAULT 'courier';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'courier_id') THEN
    ALTER TABLE orders ADD COLUMN courier_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'qris';
  END IF;
END $$;

-- =========================================================
-- Deliveries RLS (simple)
-- =========================================================
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_insert" ON deliveries;
DROP POLICY IF EXISTS "deliveries_select" ON deliveries;
DROP POLICY IF EXISTS "deliveries_update" ON deliveries;
DROP POLICY IF EXISTS "deliveries_select_own" ON deliveries;
DROP POLICY IF EXISTS "deliveries_update_own" ON deliveries;

CREATE POLICY "deliveries_insert" ON deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_select" ON deliveries
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_update" ON deliveries
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =========================================================
-- Vouchers: ensure new columns + RLS
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'applicable_product_ids') THEN
    ALTER TABLE vouchers ADD COLUMN applicable_product_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'combo_products') THEN
    ALTER TABLE vouchers ADD COLUMN combo_products jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'combo_discount') THEN
    ALTER TABLE vouchers ADD COLUMN combo_discount int DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'type') THEN
    ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_type_check;
    ALTER TABLE vouchers ADD CONSTRAINT vouchers_type_check CHECK (type IN ('percent','fixed','free_shipping','combo','specific_product'));
  END IF;
END $$;

DROP POLICY IF EXISTS "vouchers_select_public" ON vouchers;
CREATE POLICY "vouchers_select_public" ON vouchers
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_insert_own" ON vouchers;
CREATE POLICY "vouchers_insert_own" ON vouchers
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_update_own" ON vouchers;
CREATE POLICY "vouchers_update_own" ON vouchers
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_delete_own" ON vouchers;
CREATE POLICY "vouchers_delete_own" ON vouchers
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

-- Realtime
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE product_variants REPLICA IDENTITY FULL;
ALTER TABLE orders REPLICA IDENTITY FULL;
