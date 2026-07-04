/*
# Tumbas Marketplace Schema — Part 2: RLS Policies + Indexes

Enables RLS on every table and adds ownership-scoped policies.
Catalog tables (categories, products, stores, banners, reviews, vouchers) are
public-readable (anon+authenticated). User-scoped tables use auth.uid() ownership.
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- STORES
DROP POLICY IF EXISTS "stores_select_public" ON stores;
CREATE POLICY "stores_select_public" ON stores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "stores_insert_own" ON stores;
CREATE POLICY "stores_insert_own" ON stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "stores_update_own" ON stores;
CREATE POLICY "stores_update_own" ON stores FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "stores_delete_own" ON stores;
CREATE POLICY "stores_delete_own" ON stores FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- CATEGORIES
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_insert_auth" ON categories;
CREATE POLICY "categories_insert_auth" ON categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categories_update_auth" ON categories;
CREATE POLICY "categories_update_auth" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PRODUCTS
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.seller_id = auth.uid()));
DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.seller_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.seller_id = auth.uid()));
DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.seller_id = auth.uid()));

-- CART ITEMS
DROP POLICY IF EXISTS "cart_select_own" ON cart_items;
CREATE POLICY "cart_select_own" ON cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_insert_own" ON cart_items;
CREATE POLICY "cart_insert_own" ON cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_update_own" ON cart_items;
CREATE POLICY "cart_update_own" ON cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_delete_own" ON cart_items;
CREATE POLICY "cart_delete_own" ON cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VOUCHERS
DROP POLICY IF EXISTS "vouchers_select_public" ON vouchers;
CREATE POLICY "vouchers_select_public" ON vouchers FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "vouchers_insert_own" ON vouchers;
CREATE POLICY "vouchers_insert_own" ON vouchers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vouchers_update_own" ON vouchers;
CREATE POLICY "vouchers_update_own" ON vouchers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ORDERS
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid()));
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_update_own" ON orders FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid())) WITH CHECK (true);

-- ORDER ITEMS
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.courier_id = auth.uid()))));
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.buyer_id = auth.uid()));

-- CONVERSATIONS
DROP POLICY IF EXISTS "conv_select_own" ON conversations;
CREATE POLICY "conv_select_own" ON conversations FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid()));
DROP POLICY IF EXISTS "conv_insert_own" ON conversations;
CREATE POLICY "conv_insert_own" ON conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "conv_update_own" ON conversations;
CREATE POLICY "conv_update_own" ON conversations FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid())) WITH CHECK (true);

-- MESSAGES
DROP POLICY IF EXISTS "msg_select_own" ON messages;
CREATE POLICY "msg_select_own" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid()))));
DROP POLICY IF EXISTS "msg_insert_own" ON messages;
CREATE POLICY "msg_insert_own" ON messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid()))));
DROP POLICY IF EXISTS "msg_update_own" ON messages;
CREATE POLICY "msg_update_own" ON messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = conversations.store_id AND stores.seller_id = auth.uid()))));

-- COURIERS
DROP POLICY IF EXISTS "couriers_select_own" ON couriers;
CREATE POLICY "couriers_select_own" ON couriers FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.courier_id = auth.uid()));
DROP POLICY IF EXISTS "couriers_insert_own" ON couriers;
CREATE POLICY "couriers_insert_own" ON couriers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "couriers_update_own" ON couriers;
CREATE POLICY "couriers_update_own" ON couriers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COURIER DOCUMENTS
DROP POLICY IF EXISTS "courier_docs_select_own" ON courier_documents;
CREATE POLICY "courier_docs_select_own" ON courier_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM couriers WHERE couriers.id = courier_documents.courier_id AND couriers.user_id = auth.uid()));
DROP POLICY IF EXISTS "courier_docs_insert_own" ON courier_documents;
CREATE POLICY "courier_docs_insert_own" ON courier_documents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM couriers WHERE couriers.id = courier_documents.courier_id AND couriers.user_id = auth.uid()));
DROP POLICY IF EXISTS "courier_docs_delete_own" ON courier_documents;
CREATE POLICY "courier_docs_delete_own" ON courier_documents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM couriers WHERE couriers.id = courier_documents.courier_id AND couriers.user_id = auth.uid()));

-- DELIVERIES
DROP POLICY IF EXISTS "deliveries_select_own" ON deliveries;
CREATE POLICY "deliveries_select_own" ON deliveries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND (orders.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR deliveries.courier_id = auth.uid())));
DROP POLICY IF EXISTS "deliveries_insert_own" ON deliveries;
CREATE POLICY "deliveries_insert_own" ON deliveries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "deliveries_update_own" ON deliveries;
CREATE POLICY "deliveries_update_own" ON deliveries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND (orders.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR deliveries.courier_id = auth.uid()))) WITH CHECK (true);

-- DELIVERY TRACKING
DROP POLICY IF EXISTS "tracking_select_own" ON delivery_tracking;
CREATE POLICY "tracking_select_own" ON delivery_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deliveries JOIN orders ON orders.id = deliveries.order_id WHERE deliveries.id = delivery_tracking.delivery_id AND (orders.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.seller_id = auth.uid()) OR deliveries.courier_id = auth.uid())));
DROP POLICY IF EXISTS "tracking_insert_own" ON delivery_tracking;
CREATE POLICY "tracking_insert_own" ON delivery_tracking FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM deliveries WHERE deliveries.id = delivery_tracking.delivery_id AND deliveries.courier_id = auth.uid()));

-- WISHLIST
DROP POLICY IF EXISTS "wishlist_select_own" ON wishlist;
CREATE POLICY "wishlist_select_own" ON wishlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlist;
CREATE POLICY "wishlist_insert_own" ON wishlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlist;
CREATE POLICY "wishlist_delete_own" ON wishlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEWS
DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BANNERS
DROP POLICY IF EXISTS "banners_select_public" ON banners;
CREATE POLICY "banners_select_public" ON banners FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "banners_insert_auth" ON banners;
CREATE POLICY "banners_insert_auth" ON banners FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "banners_update_auth" ON banners;
CREATE POLICY "banners_update_auth" ON banners FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS stores_seller_id_idx ON stores(seller_id);
CREATE INDEX IF NOT EXISTS products_store_id_idx ON products(store_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS products_is_flash_sale_idx ON products(is_flash_sale) WHERE is_flash_sale = true;
CREATE INDEX IF NOT EXISTS cart_user_id_idx ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON orders(store_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS conv_buyer_id_idx ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS conv_store_id_idx ON conversations(store_id);
CREATE INDEX IF NOT EXISTS msg_conversation_id_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS couriers_user_id_idx ON couriers(user_id);
CREATE INDEX IF NOT EXISTS courier_docs_courier_id_idx ON courier_documents(courier_id);
CREATE INDEX IF NOT EXISTS deliveries_courier_id_idx ON deliveries(courier_id);
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS tracking_delivery_id_idx ON delivery_tracking(delivery_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id);
CREATE INDEX IF NOT EXISTS notif_user_id_idx ON notifications(user_id, created_at DESC);
