/*
# Tumbas Seed Data

Populates categories, banners, and demo vouchers so the marketplace has content
on first load. Products/stores are created by sellers at runtime; this seed only
adds platform-level catalog data that has no owner.
*/

-- CATEGORIES
INSERT INTO categories (name, slug, icon, sort_order) VALUES
('Elektronik', 'elektronik', 'Smartphone', 1),
('Fashion Pria', 'fashion-pria', 'Shirt', 2),
('Fashion Wanita', 'fashion-wanita', 'ShoppingBag', 3),
('Kesehatan & Kecantikan', 'kesehatan-kecantikan', 'Heart', 4),
('Rumah Tangga', 'rumah-tangga', 'Home', 5),
('Makanan & Minuman', 'makanan-minuman', 'UtensilsCrossed', 6),
('Olahraga & Outdoor', 'olahraga-outdoor', 'Dumbbell', 7),
('Mainan & Hobi', 'mainan-hobi', 'Gamepad2', 8),
('Otomotif', 'otomotif', 'Car', 9),
('Buku & Stationeri', 'buku-stationeri', 'BookOpen', 10)
ON CONFLICT (slug) DO NOTHING;

-- BANNERS (Pexels stock images)
INSERT INTO banners (title, subtitle, image_url, link, sort_order) VALUES
('Flash Sale Spesial', 'Diskon hingga 70% setiap hari', 'https://images.pexels.com/photos/5650026/pexels-photo-5650026.jpeg?auto=compress&cs=tinysrgb&w=1600', '/search?q=flash', 1),
('Belanja Fashion', 'Tren terbaru untukmu', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=1600', '/search?q=fashion', 2),
('Elektronik Murah', 'Gadget original bergaransi', 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=1600', '/search?q=elektronik', 3)
ON CONFLICT DO NOTHING;

-- VOUCHERS
INSERT INTO vouchers (code, description, type, value, min_spend, max_discount, is_active) VALUES
('TUMBAS10', 'Diskon 10% min belanja Rp50.000', 'percent', 10, 50000, 20000, true),
('HEMAT20', 'Diskon 20% min belanja Rp100.000', 'percent', 20, 100000, 50000, true),
('ONGKIR0', 'Potongan ongkir Rp15.000', 'fixed', 15000, 0, 15000, true)
ON CONFLICT (code) DO NOTHING;
