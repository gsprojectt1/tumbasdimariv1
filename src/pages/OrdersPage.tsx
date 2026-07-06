import { useOrders } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { supabase } from '../lib/supabase';
import { formatRupiah, timeAgo, cn } from '../lib/utils';
import { EmptyState } from '../components/ui/EmptyState';
import { useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Package, Clock, Truck, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { OrderStatus } from '../lib/types';

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'text-foreground/60' },
  paid: { label: 'Dibayar', color: 'text-primary' },
  accepted: { label: 'Diterima', color: 'text-primary' },
  preparing: { label: 'Disiapkan', color: 'text-warning' },
  picked_up: { label: 'Diambil', color: 'text-warning' },
  on_the_way: { label: 'Dalam perjalanan', color: 'text-warning' },
  arrived: { label: 'Tiba', color: 'text-success' },
  completed: { label: 'Selesai', color: 'text-success' },
  cancelled: { label: 'Dibatalkan', color: 'text-error' },
};

export function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useOrders();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` },
        () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refetch]);

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><EmptyState icon={<Package size={24} />} title="Masuk dulu" action={<Button onClick={() => navigate('/login')}>Masuk</Button>} /></div>;
  }

  return (
    <div className="pb-24 md:pb-12 max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-4">Pesanan</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-card border border-border skeleton" />)}</div>
      ) : (!orders || orders.length === 0) ? (
        <EmptyState icon={<Package size={24} />} title="Belum ada pesanan" description="Pesananmu akan muncul di sini." action={<Button onClick={() => navigate('/')}>Mulai belanja</Button>} />
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => {
            const cfg = statusConfig[order.status];
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="p-4 rounded-card border border-border cursor-pointer hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground/50">{order.store?.name || 'Toko'}</span>
                  <span className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</span>
                </div>
                <div className="flex gap-3">
                  {order.items?.[0] && (
                    <img src={order.items[0].image_url || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=200'} alt="" className="w-14 h-14 rounded-btn border border-border object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{order.items?.[0]?.name || 'Produk'}{order.items && order.items.length > 1 && ` +${order.items.length - 1}`}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{timeAgo(order.created_at)}</p>
                    <p className="text-sm font-bold mt-1">{formatRupiah(order.total)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
