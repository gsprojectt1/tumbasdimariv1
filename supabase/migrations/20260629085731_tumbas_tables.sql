/*
# Tumbas Marketplace Schema — Part 1: Tables

Creates all 18 tables for the Tumbas marketplace. Policies added in part 2
because orders/order_items reference deliveries which must exist first.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','seller','courier','admin')),
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  latitude double precision,
  longitude double precision,
  address text DEFAULT '',
  city text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STORES
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  banner_url text DEFAULT '',
  city text DEFAULT '',
  latitude double precision,
  longitude double precision,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT '',
  image_url text DEFAULT '',
  sort_order int DEFAULT 0
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  price bigint NOT NULL DEFAULT 0,
  original_price bigint DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb DEFAULT '[]'::jsonb,
  stock int NOT NULL DEFAULT 0,
  sold_count int DEFAULT 0,
  rating numeric(3,2) DEFAULT 0,
  review_count int DEFAULT 0,
  is_flash_sale boolean DEFAULT false,
  is_active boolean DEFAULT true,
  city text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  variant jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- VOUCHERS
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value numeric(10,2) NOT NULL DEFAULT 0,
  min_spend bigint DEFAULT 0,
  max_discount bigint DEFAULT 0,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','accepted','preparing','picked_up','on_the_way','arrived','completed','cancelled')),
  total bigint NOT NULL DEFAULT 0,
  subtotal bigint NOT NULL DEFAULT 0,
  shipping_cost bigint NOT NULL DEFAULT 0,
  discount bigint NOT NULL DEFAULT 0,
  voucher_id uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  buyer_latitude double precision,
  buyer_longitude double precision,
  buyer_address text DEFAULT '',
  buyer_name text DEFAULT '',
  buyer_phone text DEFAULT '',
  payment_method text DEFAULT 'mock',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  price bigint NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  variant jsonb DEFAULT '{}'::jsonb,
  image_url text DEFAULT ''
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  buyer_unread int DEFAULT 0,
  seller_unread int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text DEFAULT '',
  image_url text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- COURIERS
CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text DEFAULT 'motorcycle' CHECK (vehicle_type IN ('motorcycle','car','van')),
  vehicle_plate text DEFAULT '',
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','approved','rejected')),
  is_online boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 5.0,
  total_deliveries int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- COURIER DOCUMENTS
CREATE TABLE IF NOT EXISTS courier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ktp','kk','selfie_ktp','vehicle')),
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- DELIVERIES
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'to_seller' CHECK (status IN ('to_seller','at_seller','to_buyer','at_buyer','completed','cancelled')),
  phase text DEFAULT 'to_seller',
  pickup_eta int DEFAULT 0,
  delivery_eta int DEFAULT 0,
  distance_km numeric(6,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

-- DELIVERY TRACKING
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision DEFAULT 0,
  speed double precision DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- WISHLIST
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text DEFAULT '',
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- BANNERS
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  image_url text NOT NULL,
  link text DEFAULT '',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
