/*
# Tumbas Bugfix + Feature Migration

## Bug Fixes
1. BUG 1: Fix courier_documents RLS + courier-docs storage bucket (private, user-folder scoped)
2. BUG 2: Fix orders/order_items RLS for buyer insert; add payment_method + delivery_type columns
3. BUG 3: Fix conversations/messages RLS for buyer+seller access

## New Features
4. FITUR 4: product_variants table (id, product_id, name, options jsonb, price_modifier, stock)
5. FITUR 5: Voucher new types: free_shipping, combo_products jsonb, combo_discount, applicable_product_ids jsonb
6. FITUR 6: orders.delivery_type column (courier/self_pickup/seller_delivery), orders.courier_id column
7. FITUR 7: No schema changes needed (search query changes only)

## Security
- courier_documents: authenticated insert/select scoped to own courier record
- couriers: authenticated insert/select/update scoped to own user_id
- courier-docs bucket: PRIVATE, user-folder scoped (auth.uid()::text as folder prefix)
- orders: buyer can insert (buyer_id = auth.uid())
- order_items: buyer can insert (order belongs to buyer)
- conversations: buyer OR seller can select/insert
- messages: buyer OR seller can select/insert
*/

-- =========================================================
-- BUG 1: COURIER DOCUMENTS RLS FIX
-- =========================================================
ALTER TABLE courier_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_documents_insert" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_select" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_update" ON courier_documents;
DROP POLICY IF EXISTS "courier_documents_delete" ON courier_documents;
DROP POLICY IF EXISTS "courier_docs_select_own" ON courier_documents;
DROP POLICY IF EXISTS "courier_docs_insert_own" ON courier_documents;
DROP POLICY IF EXISTS "courier_docs_delete_own" ON courier_documents;

CREATE POLICY "courier_documents_insert" ON courier_documents
  FOR INSERT TO authenticated
  WITH CHECK (courier_id IN (SELECT id FROM couriers WHERE user_id = auth.uid()));

CREATE POLICY "courier_documents_select" ON courier_documents
  FOR SELECT TO authenticated
  USING (courier_id IN (SELECT id FROM couriers WHERE user_id = auth.uid()));

CREATE POLICY "courier_documents_delete" ON courier_documents
  FOR DELETE TO authenticated
  USING (courier_id IN (SELECT id FROM couriers WHERE user_id = auth.uid()));

-- =========================================================
-- BUG 1: COURIERS TABLE RLS FIX
-- =========================================================
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couriers_insert" ON couriers;
DROP POLICY IF EXISTS "couriers_select" ON couriers;
DROP POLICY IF EXISTS "couriers_update" ON couriers;
DROP POLICY IF EXISTS "couriers_select_own" ON couriers;
DROP POLICY IF EXISTS "couriers_insert_own" ON couriers;
DROP POLICY IF EXISTS "couriers_update_own" ON couriers;

CREATE POLICY "couriers_insert" ON couriers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "couriers_select" ON couriers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_online = true);

CREATE POLICY "couriers_update" ON couriers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- BUG 1: COURIER-DOCS STORAGE BUCKET (PRIVATE, user-folder scoped)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-docs', 'courier-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove old public policies
DROP POLICY IF EXISTS "courier_docs_read_public" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_update_own" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "courier_docs_select" ON storage.objects;

-- Private bucket: user can only access files in their own folder (uid/)
CREATE POLICY "courier_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'courier-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "courier_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'courier-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "courier_docs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'courier-docs' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'courier-docs');

CREATE POLICY "courier_docs_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'courier-docs' AND owner = auth.uid());

-- =========================================================
-- BUG 2: ORDERS + ORDER_ITEMS RLS FIX
-- =========================================================
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;

CREATE POLICY "orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = buyer_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid())
  );

CREATE POLICY "orders_update_own" ON orders
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = buyer_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid())
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE buyer_id = auth.uid()));

CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (
      orders.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid())
      OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid())
    ))
  );

-- =========================================================
-- BUG 2: ADD payment_method + delivery_type + courier_id TO orders
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_type') THEN
    ALTER TABLE orders ADD COLUMN delivery_type text DEFAULT 'courier' CHECK (delivery_type IN ('courier','self_pickup','seller_delivery'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'courier_id') THEN
    ALTER TABLE orders ADD COLUMN courier_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure payment_method column exists (it was added in original migration but ensure)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'qris';
  END IF;
END $$;

-- =========================================================
-- BUG 3: CONVERSATIONS + MESSAGES RLS FIX
-- =========================================================
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "conv_select_own" ON conversations;
DROP POLICY IF EXISTS "conv_insert_own" ON conversations;
DROP POLICY IF EXISTS "conv_update_own" ON conversations;

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
    OR courier_id = auth.uid()
  );

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
    OR courier_id = auth.uid()
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "msg_select_own" ON messages;
DROP POLICY IF EXISTS "msg_insert_own" ON messages;
DROP POLICY IF EXISTS "msg_update_own" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
        OR courier_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
        OR courier_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
        OR courier_id = auth.uid()
    )
  );

-- =========================================================
-- FITUR 4: PRODUCT_VARIANTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_modifier jsonb DEFAULT '{}'::jsonb,
  stock jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_select_public" ON product_variants;
CREATE POLICY "product_variants_select_public" ON product_variants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_variants_insert_own" ON product_variants;
CREATE POLICY "product_variants_insert_own" ON product_variants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM stores JOIN products ON products.store_id = stores.id WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()));

DROP POLICY IF EXISTS "product_variants_update_own" ON product_variants;
CREATE POLICY "product_variants_update_own" ON product_variants
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM stores JOIN products ON products.store_id = stores.id WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores JOIN products ON products.store_id = stores.id WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()));

DROP POLICY IF EXISTS "product_variants_delete_own" ON product_variants;
CREATE POLICY "product_variants_delete_own" ON product_variants
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM stores JOIN products ON products.store_id = stores.id WHERE products.id = product_variants.product_id AND stores.seller_id = auth.uid()));

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);

-- Add variant_selected to cart_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'variant_selected') THEN
    ALTER TABLE cart_items ADD COLUMN variant_selected jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- =========================================================
-- FITUR 5: VOUCHER NEW TYPES
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

-- Update the type constraint to include free_shipping and combo
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'type') THEN
    ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_type_check;
    ALTER TABLE vouchers ADD CONSTRAINT vouchers_type_check CHECK (type IN ('percent','fixed','free_shipping','combo'));
  END IF;
END $$;

-- Update vouchers select to allow sellers to see their own vouchers (including inactive)
DROP POLICY IF EXISTS "vouchers_select_public" ON vouchers;
CREATE POLICY "vouchers_select_public" ON vouchers
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

-- =========================================================
-- FITUR 6: deliveries insert policy (for seller to create delivery records)
-- =========================================================
DROP POLICY IF EXISTS "deliveries_insert" ON deliveries;
DROP POLICY IF EXISTS "deliveries_insert_own" ON deliveries;

CREATE POLICY "deliveries_insert" ON deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = deliveries.order_id AND stores.seller_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "deliveries_update" ON deliveries;
DROP POLICY IF EXISTS "deliveries_update_own" ON deliveries;

CREATE POLICY "deliveries_update" ON deliveries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = deliveries.order_id AND stores.seller_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.buyer_id = auth.uid())
    OR deliveries.courier_id = auth.uid()
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "deliveries_select" ON deliveries;
DROP POLICY IF EXISTS "deliveries_select_own" ON deliveries;

CREATE POLICY "deliveries_select" ON deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND (
      orders.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid())
      OR deliveries.courier_id = auth.uid()
    ))
  );

-- Enable realtime on messages and conversations
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE product_variants REPLICA IDENTITY FULL;
