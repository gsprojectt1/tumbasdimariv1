-- Create courier record for demo courier account (approved status)
INSERT INTO couriers (user_id, vehicle_type, vehicle_plate, status, is_online, rating, total_deliveries)
VALUES
  ('a3333333-3333-3333-3333-333333333333', 'motorcycle', 'B 1234 XX', 'approved', false, 5.0, 0);
