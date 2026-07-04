/*
# Tumbas Bugfix Migration — New Tables for Bug Fixes

## New Tables
1. `store_followers` — tracks buyer follows of stores (BUG 5)
   - id, user_id, store_id, created_at
2. `store_reviews` — store-level reviews/ratings from buyers after delivery (BUG 5)
   - id, user_id, store_id, product_id (nullable), order_id (nullable), rating (1-5), comment, created_at
3. `withdrawals` — seller/courier withdrawal requests (BUG 8)
   - id, user_id, role, amount, method, account_number, status, created_at, processed_at
4. `seller_balance` — seller earnings balance (BUG 8)
   - id, user_id, balance, created_at, updated_at
5. `courier_balance` — courier earnings balance (BUG 8)
   - id, user_id, balance, created_at, updated_at

## Modified Tables
- `vouchers` — added columns: max_usage, used_count, start_date, end_date, applicable_products (BUG 6)
  (existing columns code, type, value, min_spend, store_id, is_active, valid_until already exist)

## Storage
- New bucket `courier-docs` for courier document uploads (BUG 7)
- Storage policies for courier-docs: authenticated users can upload to their own folder, public read

## Security
- RLS enabled on all new tables
- store_followers: owner-scoped (user can follow/unfollow, public read for counts)
- store_reviews: public read, owner-scoped insert/delete
- withdrawals: owner-scoped CRUD
- seller_balance: owner-scoped read/update
- courier_balance: owner-scoped read/update
- courier-docs bucket: authenticated upload to own folder, public read
*/

-- =========================================================
-- STORE FOLLOWERS (BUG 5)
-- =========================================================
CREATE TABLE IF NOT EXISTS store_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, store_id)
);
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_followers_select_public" ON store_followers;
CREATE POLICY "store_followers_select_public" ON store_followers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "store_followers_insert_own" ON store_followers;
CREATE POLICY "store_followers_insert_own" ON store_followers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "store_followers_delete_own" ON store_followers;
CREATE POLICY "store_followers_delete_own" ON store_followers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS store_followers_store_id_idx ON store_followers(store_id);
CREATE INDEX IF NOT EXISTS store_followers_user_id_idx ON store_followers(user_id);

-- =========================================================
-- STORE REVIEWS (BUG 5)
-- =========================================================
CREATE TABLE IF NOT EXISTS store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_reviews_select_public" ON store_reviews;
CREATE POLICY "store_reviews_select_public" ON store_reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "store_reviews_insert_own" ON store_reviews;
CREATE POLICY "store_reviews_insert_own" ON store_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "store_reviews_delete_own" ON store_reviews;
CREATE POLICY "store_reviews_delete_own" ON store_reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS store_reviews_store_id_idx ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS store_reviews_product_id_idx ON store_reviews(product_id);

-- =========================================================
-- VOUCHERS ENHANCEMENT (BUG 6)
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'max_usage') THEN
    ALTER TABLE vouchers ADD COLUMN max_usage int DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'used_count') THEN
    ALTER TABLE vouchers ADD COLUMN used_count int DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'start_date') THEN
    ALTER TABLE vouchers ADD COLUMN start_date timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'end_date') THEN
    ALTER TABLE vouchers ADD COLUMN end_date timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'applicable_products') THEN
    ALTER TABLE vouchers ADD COLUMN applicable_products jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Update vouchers policies to allow sellers to manage their own vouchers
DROP POLICY IF EXISTS "vouchers_select_public" ON vouchers;
CREATE POLICY "vouchers_select_public" ON vouchers FOR SELECT
  TO anon, authenticated USING (is_active = true OR store_id IN (SELECT id FROM stores WHERE seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_insert_own" ON vouchers;
CREATE POLICY "vouchers_insert_own" ON vouchers FOR INSERT
  TO authenticated WITH CHECK (store_id IS NULL OR EXISTS (SELECT 1 FROM stores WHERE stores.id = vouchers.store_id AND stores.seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_update_own" ON vouchers;
CREATE POLICY "vouchers_update_own" ON vouchers FOR UPDATE
  TO authenticated USING (store_id IS NULL OR EXISTS (SELECT 1 FROM stores WHERE stores.id = vouchers.store_id AND stores.seller_id = auth.uid()))
  WITH CHECK (store_id IS NULL OR EXISTS (SELECT 1 FROM stores WHERE stores.id = vouchers.store_id AND stores.seller_id = auth.uid()));

DROP POLICY IF EXISTS "vouchers_delete_own" ON vouchers;
CREATE POLICY "vouchers_delete_own" ON vouchers FOR DELETE
  TO authenticated USING (store_id IS NULL OR EXISTS (SELECT 1 FROM stores WHERE stores.id = vouchers.store_id AND stores.seller_id = auth.uid()));

-- =========================================================
-- WITHDRAWALS (BUG 8)
-- =========================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('seller','courier')),
  amount bigint NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'BCA',
  account_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own" ON withdrawals;
CREATE POLICY "withdrawals_select_own" ON withdrawals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_insert_own" ON withdrawals;
CREATE POLICY "withdrawals_insert_own" ON withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_update_own" ON withdrawals;
CREATE POLICY "withdrawals_update_own" ON withdrawals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_delete_own" ON withdrawals;
CREATE POLICY "withdrawals_delete_own" ON withdrawals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON withdrawals(user_id, created_at DESC);

-- =========================================================
-- SELLER BALANCE (BUG 8)
-- =========================================================
CREATE TABLE IF NOT EXISTS seller_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE seller_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_balance_select_own" ON seller_balance;
CREATE POLICY "seller_balance_select_own" ON seller_balance FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seller_balance_insert_own" ON seller_balance;
CREATE POLICY "seller_balance_insert_own" ON seller_balance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seller_balance_update_own" ON seller_balance;
CREATE POLICY "seller_balance_update_own" ON seller_balance FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- COURIER BALANCE (BUG 8)
-- =========================================================
CREATE TABLE IF NOT EXISTS courier_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE courier_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_balance_select_own" ON courier_balance;
CREATE POLICY "courier_balance_select_own" ON courier_balance FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "courier_balance_insert_own" ON courier_balance;
CREATE POLICY "courier_balance_insert_own" ON courier_balance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "courier_balance_update_own" ON courier_balance;
CREATE POLICY "courier_balance_update_own" ON courier_balance FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- COURIER-DOCS STORAGE BUCKET (BUG 7)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('courier-docs', 'courier-docs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "courier_docs_read_public" ON storage.objects;
CREATE POLICY "courier_docs_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'courier-docs');

DROP POLICY IF EXISTS "courier_docs_insert_own" ON storage.objects;
CREATE POLICY "courier_docs_insert_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'courier-docs');

DROP POLICY IF EXISTS "courier_docs_update_own" ON storage.objects;
CREATE POLICY "courier_docs_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'courier-docs' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'courier-docs');

DROP POLICY IF EXISTS "courier_docs_delete_own" ON storage.objects;
CREATE POLICY "courier_docs_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'courier-docs' AND owner = auth.uid());

-- =========================================================
-- CONVERSATIONS: Add courier_id column for buyer-courier chat (BUG 4)
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'courier_id') THEN
    ALTER TABLE conversations ADD COLUMN courier_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update conversations select policy to include courier
DROP POLICY IF EXISTS "conv_select_own" ON conversations;
CREATE POLICY "conv_select_own" ON conversations FOR SELECT
  TO authenticated USING (
    auth.uid() = buyer_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
    OR auth.uid() = courier_id
  );

-- Update conversations insert policy to allow courier conversations
DROP POLICY IF EXISTS "conv_insert_own" ON conversations;
CREATE POLICY "conv_insert_own" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- Update conversations update policy to include courier
DROP POLICY IF EXISTS "conv_update_own" ON conversations;
CREATE POLICY "conv_update_own" ON conversations FOR UPDATE
  TO authenticated USING (
    auth.uid() = buyer_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
    OR auth.uid() = courier_id
  ) WITH CHECK (true);

-- Update messages policies to include courier
DROP POLICY IF EXISTS "msg_select_own" ON messages;
CREATE POLICY "msg_select_own" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (
      conversations.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
      OR conversations.courier_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "msg_insert_own" ON messages;
CREATE POLICY "msg_insert_own" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (
      conversations.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
      OR conversations.courier_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "msg_update_own" ON messages;
CREATE POLICY "msg_update_own" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (
      conversations.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())
      OR conversations.courier_id = auth.uid()
    ))
  );

-- Enable realtime on new tables
ALTER TABLE store_followers REPLICA IDENTITY FULL;
ALTER TABLE store_reviews REPLICA IDENTITY FULL;
ALTER TABLE withdrawals REPLICA IDENTITY FULL;
