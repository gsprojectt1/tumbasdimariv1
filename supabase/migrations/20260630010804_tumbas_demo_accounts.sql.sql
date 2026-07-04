-- Demo accounts: buyer, seller, courier
-- Passwords: demo1234 (all accounts)

-- Insert auth users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, instance_id, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'buyer@tumbas.demo', crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}'::jsonb, '{}'::jsonb),
  ('a2222222-2222-2222-2222-222222222222', 'seller@tumbas.demo', crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}'::jsonb, '{}'::jsonb),
  ('a3333333-3333-3333-3333-333333333333', 'courier@tumbas.demo', crypt('demo1234', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert identities (email column is generated, don't insert it)
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
VALUES
  ('buyer@tumbas.demo', 'a1111111-1111-1111-1111-111111111111', jsonb_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'email', 'buyer@tumbas.demo'), 'email', now(), now()),
  ('seller@tumbas.demo', 'a2222222-2222-2222-2222-222222222222', jsonb_build_object('sub', 'a2222222-2222-2222-2222-222222222222', 'email', 'seller@tumbas.demo'), 'email', now(), now()),
  ('courier@tumbas.demo', 'a3333333-3333-3333-3333-333333333333', jsonb_build_object('sub', 'a3333333-3333-3333-3333-333333333333', 'email', 'courier@tumbas.demo'), 'email', now(), now())
ON CONFLICT DO NOTHING;

-- Insert profiles
INSERT INTO profiles (id, role, name, phone, avatar_url, latitude, longitude, address, city)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'buyer', 'Budi Pembeli', '081234567890', '', -6.2088, 106.8456, 'Jl. Sudirman No. 1, Jakarta Pusat', 'Jakarta'),
  ('a2222222-2222-2222-2222-222222222222', 'seller', 'Siti Penjual', '081234567891', '', -6.2250, 106.8500, 'Jl. Mangga Dua No. 5, Jakarta Pusat', 'Jakarta'),
  ('a3333333-3333-3333-3333-333333333333', 'courier', 'Jono Kurir', '081234567892', '', -6.2150, 106.8400, 'Jl. Kemang Raya No. 10, Jakarta Selatan', 'Jakarta')
ON CONFLICT (id) DO NOTHING;

-- Insert store for seller (use gen_random_uuid default by not specifying id)
INSERT INTO stores (seller_id, name, slug, description, logo_url, banner_url, city, latitude, longitude, is_active)
VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Toko Sumber Rejeki', 'toko-sumber-rejeki', 'Menyediakan kebutuhan sehari-hari dengan kualitas terbaik dan harga terjangkau', '', '', 'Jakarta', -6.2250, 106.8500, true)
ON CONFLICT (slug) DO NOTHING;
