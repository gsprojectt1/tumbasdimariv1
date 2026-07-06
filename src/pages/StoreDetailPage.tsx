import { useState, useEffect } from 'react';
import { useParams, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { formatRupiah, cn, timeAgo } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Star, Store, Users, MessageCircle, MapPin, ArrowLeft, Star as StarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Store as StoreType, StoreReview } from '../lib/types';

export function StoreDetailPage() {
  const { storeId } = useParams();
  const { navigate, back } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      setStore(s as StoreType | null);

      const { data: prods } = await supabase
        .from('products')
        .select('*, store:stores(*)')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setProducts((prods || []) as Product[]);

      const { count } = await supabase
        .from('store_followers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);
      setFollowerCount(count || 0);

      if (user) {
        const { data: follow } = await supabase
          .from('store_followers')
          .select('id')
          .eq('user_id', user.id)
          .eq('store_id', storeId)
          .maybeSingle();
        setIsFollowing(!!follow);
      }

      const { data: revs } = await supabase
        .from('store_reviews')
        .select('*, user:profiles(name, avatar_url)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      setReviews((revs || []) as StoreReview[]);
      if (revs && revs.length > 0) {
        const sum = revs.reduce((s: number, r: any) => s + r.rating, 0);
        setAvgRating(sum / revs.length);
      }

      setLoading(false);
    })();
  }, [storeId, user?.id]);

  const toggleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    if (isFollowing) {
      const { error } = await supabase
        .from('store_followers')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);
      if (error) toast('Gagal unfollow', 'error');
      else { setIsFollowing(false); setFollowerCount((c) => c - 1); toast('Berhenti mengikuti toko'); }
    } else {
      const { error } = await supabase
        .from('store_followers')
        .insert({ user_id: user.id, store_id: storeId });
      if (error) toast('Gagal follow', 'error');
      else { setIsFollowing(true); setFollowerCount((c) => c + 1); toast('Mengikuti toko'); }
    }
  };

  const startChat = async () => {
    if (!user) { navigate('/login'); return; }
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const { data: conv, error } = await supabase.from('conversations')
      .insert({ buyer_id: user.id, store_id: storeId })
      .select().single();
    if (error) { toast('Gagal memulai chat', 'error'); return; }
    navigate(`/chat/${conv.id}`);
  };

  if (loading) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;
  if (!store) return <EmptyState icon={<Store size={24} />} title="Toko tidak ditemukan" />;

  return (
    <div className="pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative h-40 md:h-56 bg-muted overflow-hidden">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent-soft" />
        )}
        <button onClick={back} className="absolute top-3 left-3 w-9 h-9 rounded-pill bg-white/80 backdrop-blur flex items-center justify-center shadow-md">
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Store info */}
      <div className="px-4 md:px-6 -mt-10 relative">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-card border-4 border-white bg-muted overflow-hidden shrink-0 shadow-md">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Store size={28} className="text-foreground/40" /></div>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-lg font-bold tracking-tight">{store.name}</h1>
            <div className="flex items-center gap-3 text-xs text-foreground/50 mt-0.5">
              {avgRating > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star size={12} className="fill-warning text-warning" />
                  {avgRating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Users size={12} /> {followerCount} pengikut
              </span>
              {store.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={12} /> {store.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {store.description && (
          <p className="text-sm text-foreground/60 mt-3">{store.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={isFollowing ? 'outline' : 'primary'}
            size="sm"
            onClick={toggleFollow}
            className="flex-1"
          >
            {isFollowing ? 'Mengikuti' : 'Ikuti'}
          </Button>
          <Button variant="outline" size="sm" onClick={startChat} className="flex-1">
            <MessageCircle size={16} /> Chat
          </Button>
        </div>
      </div>

      {/* Products */}
      <div className="px-4 md:px-6 mt-6">
        <h2 className="text-sm font-bold mb-3">Produk ({products.length})</h2>
        {products.length === 0 ? (
          <EmptyState icon={<Store size={24} />} title="Belum ada produk" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/product/${p.id}`)}
                className="cursor-pointer rounded-card border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={p.images?.[0] || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatRupiah(p.price)}</p>
                  {p.rating > 0 && (
                    <p className="text-[10px] text-foreground/50 mt-0.5 flex items-center gap-0.5">
                      <Star size={10} className="fill-warning text-warning" /> {p.rating} ({p.review_count})
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="px-4 md:px-6 mt-6">
          <h2 className="text-sm font-bold mb-3">Ulasan Toko ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-pill bg-muted overflow-hidden">
                    {r.user?.avatar_url ? (
                      <img src={r.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-foreground/50">
                        {r.user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold">{r.user?.name || 'Anonim'}</span>
                  <span className="text-[10px] text-foreground/40">{timeAgo(r.created_at)}</span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={12} className={i < r.rating ? 'fill-warning text-warning' : 'text-border'} />
                  ))}
                </div>
                {r.comment && <p className="text-xs text-foreground/60">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
