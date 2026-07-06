import { useEffect } from 'react';
import { useNotifications } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { supabase } from '../lib/supabase';
import { timeAgo, cn } from '../lib/utils';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Bell, ShoppingBag, MessageCircle, Truck, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap: Record<string, any> = {
  order: ShoppingBag,
  chat: MessageCircle,
  delivery: Truck,
  general: Bell,
};

export function NotificationsPage() {
  const { user } = useAuth();
  const { data: notifs, refetch } = useNotifications();
  const { navigate } = useRouter();

  // Realtime: subscribe to new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => refetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refetch]);

  useEffect(() => {
    if (user && notifs && notifs.some((n) => !n.is_read)) {
      const timer = setTimeout(() => {
        supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false).then(() => refetch());
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, notifs, refetch]);

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><EmptyState icon={<Bell size={24} />} title="Masuk dulu" action={<Button onClick={() => navigate('/login')}>Masuk</Button>} /></div>;
  }

  return (
    <div className="pb-24 md:pb-12 max-w-2xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-4">Notifikasi</h1>
      {(!notifs || notifs.length === 0) ? (
        <EmptyState icon={<Bell size={24} />} title="Belum ada notifikasi" />
      ) : (
        <div className="space-y-2">
          {notifs.map((n, i) => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { if (n.data?.order_id) navigate(`/orders/${n.data.order_id}`); if (n.data?.conversation_id) navigate(`/chat/${n.data.conversation_id}`); }}
                className={cn('flex items-start gap-3 p-4 rounded-card border cursor-pointer transition-colors', n.is_read ? 'border-border bg-white' : 'border-primary/20 bg-accent-soft')}
              >
                <div className="w-9 h-9 rounded-btn bg-muted flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{n.title}</p>
                  {n.body && <p className="text-xs text-foreground/60 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-foreground/40 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-pill bg-primary shrink-0 mt-1" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
