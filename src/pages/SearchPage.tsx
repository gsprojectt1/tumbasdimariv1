import { useState, useEffect, useRef } from 'react';
import { useRouter } from '../lib/router';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, SlidersHorizontal, X, Clock, Store, Star, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatNumber } from '../lib/utils';

const sorts = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'terlaris', label: 'Terlaris' },
  { value: 'termurah', label: 'Termurah' },
  { value: 'termahal', label: 'Termahal' },
];

export function SearchPage() {
  const { query, navigate } = useRouter();
  const q = query.get('q') || '';
  const cat = query.get('cat') || '';
  const flash = query.get('flash') === '1';
  const initialSort = query.get('sort') || 'newest';

  const [search, setSearch] = useState(q);
  const [sort, setSort] = useState(initialSort);
  const [showFilter, setShowFilter] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedCat, setSelectedCat] = useState(cat);
  const [suggestions, setSuggestions] = useState<{ type: 'product' | 'store'; name: string; id?: string }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(JSON.parse(localStorage.getItem('recent_searches') || '[]'));
  }, []);

  const load = async (reset = false) => {
    setLoading(true);
    let queryB = supabase.from('products').select('*, store:stores(*)').eq('is_active', true);
    if (q) queryB = queryB.ilike('name', `%${q}%`);
    if (selectedCat) queryB = queryB.eq('category_id', selectedCat);
    if (flash) queryB = queryB.eq('is_flash_sale', true);
    if (priceMin) queryB = queryB.gte('price', Number(priceMin));
    if (priceMax) queryB = queryB.lte('price', Number(priceMax));
    if (sort === 'newest') queryB = queryB.order('created_at', { ascending: false });
    if (sort === 'terlaris') queryB = queryB.order('sold_count', { ascending: false });
    if (sort === 'termurah') queryB = queryB.order('price', { ascending: true });
    if (sort === 'termahal') queryB = queryB.order('price', { ascending: false });
    queryB = queryB.limit(12);
    if (!reset && cursor) {
      if (sort === 'newest') queryB = queryB.lt('created_at', cursor);
      else if (sort === 'terlaris') queryB = queryB.lt('sold_count', cursor);
      else if (sort === 'termurah') queryB = queryB.gt('price', Number(cursor));
      else if (sort === 'termahal') queryB = queryB.lt('price', Number(cursor));
    }
    const { data } = await queryB;
    if (data) {
      if (reset) setProducts(data);
      else setProducts((p) => [...p, ...data]);
      if (data.length > 0) {
        const last = data[data.length - 1];
        setCursor(sort === 'newest' ? last.created_at : sort === 'terlaris' ? String(last.sold_count) : String(last.price));
      }
      if (data.length < 12) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  // Load stores in parallel with products
  const loadStores = async () => {
    if (!q) { setStores([]); return; }
    const { data } = await supabase.from('stores').select('*, profiles(name)').ilike('name', `%${q}%`).eq('is_active', true).limit(5);
    setStores(data || []);
  };

  useEffect(() => {
    setProducts([]);
    setCursor(null);
    setHasMore(true);
    load(true);
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selectedCat, flash, sort, priceMin, priceMax]);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && hasMore) load();
    }, { rootMargin: '200px' });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const recent = [search, ...recentSearches.filter((s) => s !== search)].slice(0, 8);
      setRecentSearches(recent);
      localStorage.setItem('recent_searches', JSON.stringify(recent));
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setShowSuggest(false);
    }
  };

  const onType = async (val: string) => {
    setSearch(val);
    if (val.length > 2) {
      const [prodRes, storeRes] = await Promise.all([
        supabase.from('products').select('name').ilike('name', `%${val}%`).limit(3),
        supabase.from('stores').select('name, id').ilike('name', `%${val}%`).limit(3),
      ]);
      const prodSugs = (prodRes.data || []).map((p: any) => ({ type: 'product' as const, name: p.name }));
      const storeSugs = (storeRes.data || []).map((s: any) => ({ type: 'store' as const, name: s.name, id: s.id }));
      setSuggestions([...storeSugs, ...prodSugs]);
      setShowSuggest(true);
    } else {
      setShowSuggest(false);
    }
  };

  return (
    <div className="pb-24 md:pb-12 max-w-6xl mx-auto px-4 md:px-6 py-4">
      {/* Search bar */}
      <form onSubmit={onSearch} className="relative mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => onType(e.target.value)}
            onFocus={() => recentSearches.length && setShowSuggest(true)}
            placeholder="Cari produk atau toko..."
            className="w-full h-11 rounded-btn border border-border bg-white pl-10 pr-10 text-sm font-medium placeholder:text-foreground/30 focus:outline-none focus:border-primary"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setShowSuggest(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">
              <X size={16} />
            </button>
          )}
        </div>
        <AnimatePresence>
          {showSuggest && (suggestions.length > 0 || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 rounded-btn border border-border bg-white shadow-lift z-50 overflow-hidden"
            >
              {recentSearches.length > 0 && (
                <div className="p-2">
                  <p className="label px-2 py-1">Terakhir dicari</p>
                  {recentSearches.slice(0, 4).map((s) => (
                    <button key={s} type="button" onClick={() => { setSearch(s); navigate(`/search?q=${encodeURIComponent(s)}`); setShowSuggest(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-btn hover:bg-muted text-sm text-left">
                      <Clock size={14} className="text-foreground/40" /> {s}
                    </button>
                  ))}
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="label px-2 py-1">Saran</p>
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => {
                      if (s.type === 'store' && s.id) { navigate(`/store/${s.id}`); }
                      else { setSearch(s.name); navigate(`/search?q=${encodeURIComponent(s.name)}`); }
                      setShowSuggest(false);
                    }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-btn hover:bg-muted text-sm text-left">
                      {s.type === 'store' ? <Store size={14} className="text-primary" /> : <Package size={14} className="text-foreground/40" />}
                      <span className="flex-1">{s.name}</span>
                      <span className="text-[10px] text-foreground/30">{s.type === 'store' ? 'Toko' : 'Produk'}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Sort + filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => setShowFilter(true)} className="flex items-center gap-1.5 shrink-0 px-3 h-9 rounded-pill border border-border text-xs font-semibold hover:border-foreground/30">
          <SlidersHorizontal size={14} /> Filter
        </button>
        {sorts.map((s) => (
          <button key={s.value} onClick={() => setSort(s.value)}
            className={cn('shrink-0 px-3 h-9 rounded-pill text-xs font-semibold transition-colors', sort === s.value ? 'bg-primary text-white' : 'border border-border hover:border-foreground/30')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Store results */}
      {stores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Store size={14} /> Toko</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stores.map((s) => (
              <button key={s.id} onClick={() => navigate(`/store/${s.id}`)} className="flex items-center gap-3 p-3 rounded-card border border-border hover:border-foreground/20 transition-colors text-left">
                <div className="w-12 h-12 rounded-btn bg-muted overflow-hidden shrink-0">
                  {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store size={18} className="text-foreground/40" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.name}</p>
                  <p className="text-xs text-foreground/50">{s.city || 'Indonesia'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product results */}
      <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Package size={14} /> Produk</h2>
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={<Search size={24} />} title="Produk tidak ditemukan" description="Coba kata kunci atau filter lain." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            {loading && Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={`l${i}`} />)}
          </div>
          <div ref={loader} className="h-10" />
        </>
      )}

      {/* Filter modal */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/40 z-50" onClick={() => setShowFilter(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-card border-t border-border p-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Filter</h3>
                <button onClick={() => setShowFilter(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="label mb-2">Rentang harga</p>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full h-10 rounded-btn border border-border px-3 text-sm" />
                    <span className="text-foreground/40">-</span>
                    <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full h-10 rounded-btn border border-border px-3 text-sm" />
                  </div>
                </div>
                <button onClick={() => { setShowFilter(false); setProducts([]); setHasMore(true); load(true); }} className="w-full h-11 rounded-btn bg-primary text-white text-sm font-semibold">Terapkan</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
