import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { useRouter } from '../lib/router';
import { supabase } from '../lib/supabase';
import { useBanners, useCategories, useProducts } from '../lib/hooks';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import * as Icons from 'lucide-react';

export function HomePage() {
  const { navigate } = useRouter();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: flashSale } = useProducts({ flashSale: true, limit: 6 });
  const { data: newest } = useProducts({ sort: 'newest', limit: 6 });
  const { data: popular } = useProducts({ sort: 'terlaris', limit: 6 });

  const [bannerIdx, setBannerIdx] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="pb-24 md:pb-12">
      {/* Mobile search */}
      <div className="md:hidden sticky top-0 z-30 glass-nav border-b border-border px-4 py-3">
        <form onSubmit={submitSearch}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full h-10 rounded-btn border border-border bg-white pl-10 pr-4 text-sm font-medium placeholder:text-foreground/30 focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 space-y-8">
        {/* Hero carousel */}
        <section className="relative h-44 md:h-64 rounded-card overflow-hidden bg-muted">
          <AnimatePresence mode="wait">
            {banners && banners.length > 0 && (
              <motion.div
                key={bannerIdx}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <img src={banners[bannerIdx].image_url} alt={banners[bannerIdx].title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5 md:p-8 text-white">
                  <h2 className="text-lg md:text-2xl font-bold tracking-tight">{banners[bannerIdx].title}</h2>
                  <p className="text-xs md:text-sm opacity-90 mt-1">{banners[bannerIdx].subtitle}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {banners && banners.length > 1 && (
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)} className={`h-1.5 rounded-pill transition-all ${i === bannerIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold tracking-tight">Kategori</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {categories?.map((c, i) => {
              const Icon = (Icons as any)[c.icon] || Icons.Package;
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/search?cat=${c.id}`)}
                  className="flex flex-col items-center gap-2 shrink-0 w-16"
                >
                  <div className="w-14 h-14 rounded-card border border-border bg-white flex items-center justify-center hover:border-primary hover:bg-accent-soft transition-colors">
                    <Icon size={22} className="text-foreground/70" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground/60 text-center leading-tight line-clamp-2">{c.name}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Flash Sale */}
        {flashSale && flashSale.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary fill-primary" />
                <h2 className="text-base font-bold tracking-tight">Flash Sale</h2>
              </div>
              <button onClick={() => navigate('/search?flash=1')} className="text-xs font-semibold text-primary flex items-center gap-0.5">
                Lihat semua <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {flashSale.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}

        {/* Baru masuk */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h2 className="text-base font-bold tracking-tight">Baru masuk</h2>
            </div>
            <button onClick={() => navigate('/search?sort=newest')} className="text-xs font-semibold text-primary flex items-center gap-0.5">
              Lihat semua <ChevronRight size={14} />
            </button>
          </div>
          {!newest ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : newest.length === 0 ? (
            <EmptyState icon={<Sparkles size={24} />} title="Belum ada produk" description="Produk baru akan muncul di sini." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {newest.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        {/* Lagi populer */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="text-base font-bold tracking-tight">Lagi populer</h2>
            </div>
            <button onClick={() => navigate('/search?sort=terlaris')} className="text-xs font-semibold text-primary flex items-center gap-0.5">
              Lihat semua <ChevronRight size={14} />
            </button>
          </div>
          {!popular ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : popular.length === 0 ? (
            <EmptyState icon={<TrendingUp size={24} />} title="Belum ada data" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {popular.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        <InfiniteFeed />
      </div>
    </div>
  );
}

function InfiniteFeed() {
  const [products, setProducts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    let q = supabase.from('products').select('*, store:stores(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(12);
    if (cursor) q = q.lt('created_at', cursor);
    const { data } = await q;
    if (data && data.length > 0) {
      setProducts((p) => [...p, ...data]);
      setCursor(data[data.length - 1].created_at);
      if (data.length < 12) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && hasMore) load();
    }, { rootMargin: '200px' });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore]);

  if (products.length === 0 && !loading) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold tracking-tight">Jelajahi produk</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        {loading && Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={`l${i}`} />)}
      </div>
      <div ref={loader} className="h-10" />
      {!hasMore && products.length > 0 && (
        <p className="text-center text-xs text-foreground/40 py-6">Semua produk telah dimuat</p>
      )}
    </section>
  );
}
