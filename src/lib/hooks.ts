import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Product, Category, Banner, CartItem, WishlistItem, Conversation, Notification, Order, Store, Review, Courier, Delivery } from './types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as Category[];
    },
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as Banner[];
    },
  });
}

export function useProducts(opts: {
  categoryId?: string;
  flashSale?: boolean;
  sort?: string;
  search?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  const { categoryId, flashSale, sort = 'newest', search, limit = 12, cursor } = opts;
  return useQuery({
    queryKey: ['products', { categoryId, flashSale, sort, search, limit, cursor }],
    queryFn: async () => {
      let q = supabase.from('products').select('*, store:stores(*)').eq('is_active', true);
      if (categoryId) q = q.eq('category_id', categoryId);
      if (flashSale) q = q.eq('is_flash_sale', true);
      if (search) q = q.ilike('name', `%${search}%`);
      if (sort === 'newest') q = q.order('created_at', { ascending: false });
      if (sort === 'terlaris') q = q.order('sold_count', { ascending: false });
      if (sort === 'termurah') q = q.order('price', { ascending: true });
      if (sort === 'termahal') q = q.order('price', { ascending: false });
      if (cursor) {
        if (sort === 'newest') q = q.lt('created_at', cursor);
        else if (sort === 'terlaris') q = q.lt('sold_count', cursor);
        else if (sort === 'termurah') q = q.gt('price', cursor);
        else if (sort === 'termahal') q = q.lt('price', cursor);
      }
      q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Product[];
    },
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(*), category:categories(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });
}

export function useReviews(productId?: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, user:profiles(name, avatar_url)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Review[];
    },
  });
}

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cart', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*), store:stores(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CartItem[];
    },
  });
}

export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*, product:products(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WishlistItem[];
    },
  });
}

export function useConversations() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['conversations', user?.id, profile?.role],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from('conversations').select('*, store:stores(*), buyer:profiles(*), product:products(*)');
      if (profile?.role === 'seller') {
        const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user!.id).maybeSingle();
        if (store) q = q.eq('store_id', store.id);
        else return [];
      } else if (profile?.role === 'courier') {
        q = q.eq('courier_id', user!.id);
      } else {
        q = q.eq('buyer_id', user!.id);
      }
      const { data, error } = await q.order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
  });
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    // Realtime: refetch when new notifications arrive
    refetchInterval: 5000,
  });
}

export function useOrders(status?: string) {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['orders', user?.id, status, profile?.role],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from('orders').select('*, store:stores(*), items:order_items(*), delivery:deliveries(*)');
      if (profile?.role === 'seller') {
        const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user!.id).maybeSingle();
        if (store) q = q.eq('store_id', store.id);
        else return [];
      } else {
        q = q.eq('buyer_id', user!.id);
      }
      if (status) q = q.eq('status', status);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Order[];
    },
  });
}

export function useStore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['store', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('seller_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Store | null;
    },
  });
}

export function useCourier() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['courier', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Courier | null;
    },
  });
}

export function useAvailableDeliveries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['available-deliveries'],
    enabled: !!user,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, store:stores(*), items:order_items(*))')
        .is('courier_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Delivery[];
    },
  });
}

export function useActiveDelivery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-delivery', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, store:stores(*), buyer:profiles(*), items:order_items(*))')
        .eq('courier_id', user!.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Delivery | null;
    },
  });
}

export function useUnreadCounts() {
  const { user, profile } = useAuth();
  const { data: notifs } = useNotifications();
  const { data: cart } = useCart();

  const unreadNotifs = notifs?.filter((n) => !n.is_read).length || 0;
  const cartCount = cart?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const { data: convs } = useQuery({
    queryKey: ['unread-chats', user?.id, profile?.role],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from('conversations').select('buyer_unread, seller_unread, store:stores(seller_id)');
      if (profile?.role === 'seller') {
        const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user!.id).maybeSingle();
        if (store) q = q.eq('store_id', store.id);
        else return [];
      } else {
        q = q.eq('buyer_id', user!.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const unreadChats = (convs || []).reduce((sum: number, c: any) => {
    if (profile?.role === 'seller') return sum + (c.seller_unread || 0);
    return sum + (c.buyer_unread || 0);
  }, 0);

  return { unreadNotifs, unreadChats, cartCount };
}
