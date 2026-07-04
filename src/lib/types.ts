export type Role = 'buyer' | 'seller' | 'courier' | 'admin';

export type OrderStatus =
  | 'pending' | 'paid' | 'accepted' | 'preparing'
  | 'picked_up' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';

export type DeliveryStatus =
  | 'to_seller' | 'at_seller' | 'to_buyer' | 'at_buyer' | 'completed' | 'cancelled';

export type CourierStatus = 'pending_verification' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone: string;
  avatar_url: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  qris_image_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  sort_order: number;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  group_name: string;
  option_name: string;
  price_modifier: number;
  stock: number;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number;
  images: string[];
  variants: ProductVariant[];
  stock: number;
  sold_count: number;
  rating: number;
  review_count: number;
  is_flash_sale: boolean;
  is_active: boolean;
  city: string;
  created_at: string;
  store?: Store;
  category?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  variant: Record<string, string>;
  variant_selected: Record<string, string>;
  unit_price: number;
  created_at: string;
  product?: Product;
  store?: Store;
}

export interface Order {
  id: string;
  buyer_id: string;
  store_id: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  voucher_id: string | null;
  buyer_latitude: number | null;
  buyer_longitude: number | null;
  buyer_address: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: string;
  delivery_type: 'courier' | 'self_pickup' | 'seller_delivery';
  courier_id: string | null;
  created_at: string;
  updated_at: string;
  store?: Store;
  items?: OrderItem[];
  delivery?: Delivery;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  variant: Record<string, string>;
  image_url: string;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  store_id: string;
  product_id: string | null;
  courier_id: string | null;
  last_message: string;
  last_message_at: string;
  buyer_unread: number;
  seller_unread: number;
  created_at: string;
  store?: Store;
  buyer?: Profile;
  product?: Product;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string;
  is_read: boolean;
  created_at: string;
}

export interface Courier {
  id: string;
  user_id: string;
  vehicle_type: 'motorcycle' | 'car' | 'van';
  vehicle_plate: string;
  status: CourierStatus;
  is_online: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
}

export interface CourierDocument {
  id: string;
  courier_id: string;
  type: 'ktp' | 'kk' | 'selfie_ktp' | 'vehicle';
  url: string;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  courier_id: string | null;
  status: DeliveryStatus;
  phase: string;
  pickup_eta: number;
  delivery_eta: number;
  distance_km: number;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  order?: Order;
  courier?: Profile;
}

export interface DeliveryTracking {
  id: string;
  delivery_id: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  recorded_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  user?: Profile;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'free_shipping' | 'combo' | 'specific_product';
  value: number;
  min_spend: number;
  max_discount: number;
  store_id: string | null;
  is_active: boolean;
  valid_until: string | null;
  max_usage: number;
  used_count: number;
  start_date: string | null;
  end_date: string | null;
  applicable_products: string[];
  applicable_product_ids: string[];
  combo_products: string[];
  combo_discount: number;
  created_at: string;
}

export interface StoreFollower {
  id: string;
  user_id: string;
  store_id: string;
  created_at: string;
}

export interface StoreReview {
  id: string;
  user_id: string;
  store_id: string;
  product_id: string | null;
  order_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
  user?: Profile;
}

export interface PaymentAccount {
  id: string;
  user_id: string;
  type: 'bank' | 'ewallet';
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
  created_at: string;
}

export interface ShippingSettings {
  id: string;
  store_id: string;
  price_per_km: number;
  minimum_fee: number;
  free_shipping_minimum: number;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  role: 'seller' | 'courier';
  amount: number;
  method: string;
  account_number: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  created_at: string;
  processed_at: string | null;
}

export interface SellerBalance {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface CourierBalance {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  sort_order: number;
  is_active: boolean;
}
