-- Seed demo products for Toko Sumber Rejeki
-- Store ID: 82406ecf-2592-45ce-acc0-9700625bf2f2

INSERT INTO products (store_id, category_id, name, slug, description, price, original_price, images, variants, stock, sold_count, rating, review_count, is_flash_sale, is_active, city)
VALUES
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '4ec01b90-ef9e-4d18-97b6-bfee83de0b43',
    'Headphone Wireless Bluetooth Premium',
    'headphone-wireless-bluetooth-premium',
    'Headphone wireless dengan noise cancelling, baterai tahan 30 jam, suara jernih bass mantap. Cocok untuk musik, gaming, dan meeting online.',
    299000, 499000,
    '["https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/3394651/pexels-photo-3394651.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Hitam","Putih","Biru"]}]'::jsonb,
    50, 120, 4.8, 89, true, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '4ec01b90-ef9e-4d18-97b6-bfee83de0b43',
    'Smartwatch Fitness Tracker IP68',
    'smartwatch-fitness-tracker-ip68',
    'Smartwatch dengan monitor detak jantung, oksigen darah, sleep tracker, 20+ mode olahraga. Tahan air IP68, baterai 7 hari.',
    199000, 350000,
    '["https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Hitam","Merah","Pink"]},{"name":"Size","options":["40mm","44mm"]}]'::jsonb,
    75, 200, 4.7, 156, true, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '4ec01b90-ef9e-4d18-97b6-bfee83de0b43',
    'Powerbank 20000mAh Fast Charging',
    'powerbank-20000mah-fast-charging',
    'Powerbank kapasitas besar 20000mAh, fast charging 22.5W, 2 port USB + USB-C. Bisa charge hp 4-5 kali.',
    159000, 250000,
    '["https://images.pexels.com/photos/4068314/pexels-photo-4068314.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[]'::jsonb,
    100, 350, 4.6, 210, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    'efc78f89-c184-4310-baa5-5de0b0c40441',
    'Kemeja Pria Lengan Panjang Formal',
    'kemeja-pria-lengan-panjang-formal',
    'Kemeja pria lengan panjang bahan katun premium, nyaman dipakai, cocok untuk kerja kantoran dan acara formal.',
    89000, 150000,
    '["https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Putih","Biru Muda","Hitam"]},{"name":"Ukuran","options":["S","M","L","XL"]}]'::jsonb,
    80, 95, 4.5, 67, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '0c5500ed-a132-4619-bbd8-f7082ec6982f',
    'Dress Wanita Casual Summer',
    'dress-wanita-casual-summer',
    'Dress wanita bahan rayon lembut, motif floral cantik, cocok untuk hangout dan acara santai. Nyaman dipakai seharian.',
    75000, 130000,
    '["https://images.pexels.com/photos/2065200/pexels-photo-2065200.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/972996/pexels-photo-972996.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Floral Biru","Floral Pink","Polos Hitam"]},{"name":"Ukuran","options":["S","M","L","XL"]}]'::jsonb,
    60, 180, 4.7, 134, true, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    'b98558d7-12c8-49ed-9f47-7b90bc2a0799',
    'Skincare Set Glowing Vitamin C',
    'skincare-set-glowing-vitamin-c',
    'Paket skincare lengkap: face wash, toner, serum vitamin C, dan moisturizer. Membantu mencerahkan dan menyehatkan kulit wajah.',
    125000, 200000,
    '["https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Tipe Kulit","options":["Normal","Berminyak","Kering"]}]'::jsonb,
    45, 300, 4.9, 245, true, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    'af68c9ac-13c8-4647-9ca8-9721f0fe58b5',
    'Set Panci Anti Lengket 5 Pcs',
    'set-panci-anti-lengket-5-pcs',
    'Set panci anti lengket 5 pcs, bahan granite coating aman untuk kesehatan, cocok untuk masak sehari-hari. Hemat gas, cepat panas.',
    189000, 320000,
    '["https://images.pexels.com/photos/4226806/pexels-photo-4226806.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4226796/pexels-photo-4226796.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[]'::jsonb,
    30, 78, 4.6, 52, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '6bd2fa8c-44fa-472a-9340-8e3a501ac232',
    'Kopi Arabica Gayo 250gr Ground',
    'kopi-arabica-gayo-250gr-ground',
    'Kopi Arabica Gayo premium dari dataran tinggi Aceh, roasted to order. Body tebal, acidity sedang, aftertaste manis. Ground halus.',
    65000, 90000,
    '["https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Roast Level","options":["Light","Medium","Dark"]},{"name":"Grind","options":["Halus","Sedang","Kasar"]}]'::jsonb,
    120, 450, 4.9, 320, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    'f466862c-8430-462d-9a1d-b0ad081ecff1',
    'Sepatu Lari Running Shoes Ringan',
    'sepatu-lari-running-shoes-ringan',
    'Sepatu lari ringan dengan teknologi cushioning, upper mesh breathable, sol anti-slip. Cocok untuk running, gym, dan olahraga indoor.',
    179000, 299000,
    '["https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Hitam","Biru","Merah"]},{"name":"Ukuran","options":["39","40","41","42","43","44"]}]'::jsonb,
    55, 160, 4.7, 112, true, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '2800db3b-e43d-4f09-bf6b-d2516b10f76e',
    'Lego Building Blocks 500 Pcs',
    'lego-building-blocks-500-pcs',
    'Set balok susun 500 pcs warna-warni, aman untuk anak, merangsang kreativitas dan motorik. Cocok untuk hadiah anak.',
    99000, 180000,
    '["https://images.pexels.com/photos/207891/pexels-photo-207891.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[]'::jsonb,
    40, 88, 4.5, 45, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '181b0079-3fe3-4428-8d3f-529a45f16251',
    'Helm Motor Full Face DOT Standard',
    'helm-motor-full-face-dot-standard',
    'Helm full face standar DOT, visor anti fog, lining lembut dapat dilepas dan dicuci. Perlindungan maksimal untuk berkendara.',
    145000, 220000,
    '["https://images.pexels.com/photos/2113214/pexels-photo-2113214.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna","options":["Hitam","Putih","Merah"]},{"name":"Ukuran","options":["M","L","XL"]}]'::jsonb,
    35, 65, 4.6, 38, false, true, 'Jakarta'
  ),
  (
    '82406ecf-2592-45ce-acc0-9700625bf2f2',
    '0305f4c0-908f-44fa-9358-ff6741a4b6ef',
    'Notebook A5 Hardcover 200 Lembar',
    'notebook-a5-hardcover-200-lembar',
    'Notebook A5 hardcover 200 lembar, kertas 100gsm ivory, cocok untuk jurnal, catatan, dan sketch. Cover minimalis elegan.',
    35000, 55000,
    '["https://images.pexels.com/photos/655358/pexels-photo-655358.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
    '[{"name":"Warna Cover","options":["Coklat","Hitam","Navy"]}]'::jsonb,
    200, 500, 4.8, 280, false, true, 'Jakarta'
  )
ON CONFLICT (slug) DO NOTHING;
