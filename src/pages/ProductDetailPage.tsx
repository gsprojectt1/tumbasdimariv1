import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from '../lib/router';
import { useProduct, useReviews, useProducts } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { formatRupiah, discountPercent, haversineKm, calcOngkir, calcEta, cn } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/EmptyState';
import { Star, MapPin, Minus, Plus, Heart, ShoppingCart, MessageCircle, Store, Truck, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ProductDetailPage() {
  const { id } = useParams();
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();
  const { data: product, isLoading } = useProduct(id);
  const { data: reviews } = useReviews(id);
  const { data: related } = useProducts({ categoryId: product?.category_id, limit: 6 });

  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [wished, setWished] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [productVariantRows, setProductVariantRows] = useState<any[]>([]);

  useEffect(() => {
    if (product?.images) setImgIdx(0);
  }, [product]);

  useEffect(() => {
    if (id) {
      supabase.from('product_variants').select('*').eq('product_id', id).then(({ data }) => {
        setProductVariantRows(data || []);
        if (data && data.length > 0) {
          const initial: Record<string, string> = {};
          data.forEach((v: any) => { if (v.option_name && !initial[v.group_name]) initial[v.group_name] = v.option_name; });
          setVariants(initial);
        }
      });
    }
  }, [id]);

  // Group variants by group_name
  const variantGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    productVariantRows.forEach((v: any) => {
      if (!groups[v.group_name]) groups[v.group_name] = [];
      groups[v.group_name].push(v);
    });
    return groups;
  }, [productVariantRows]);

  // Calculate variant price modifier
  const variantPriceModifier = useMemo(() => {
    let mod = 0;
    Object.entries(variants).forEach(([group, option]) => {
      const v = productVariantRows.find((r: any) => r.group_name === group && r.option_name === option);
      if (v) mod += v.price_modifier || 0;
    });
    return mod;
  }, [variants, productVariantRows]);

  const effectivePrice = (product?.price || 0) + variantPriceModifier;

  useEffect(() => {
    if (user && product) {
      supabase.from('wishlist').select('id').eq('user_id', user.id).eq('product_id', product.id).maybeSingle()
        .then(({ data }) => setWished(!!data));
    }
  }, [user, product]);

  if (isLoading) return <Spinner className="py-20" />;
  if (!product) return <div className="py-20 text-center text-foreground/50">Produk tidak ditemukan</div>;

  const discount = discountPercent(product.price, product.original_price);
  const images = product.images?.length ? product.images : ['https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800'];

  const ongkir = profile?.latitude && product.store?.latitude
    ? calcOngkir(haversineKm(profile.latitude, profile.longitude, product.store.latitude, product.store.longitude))
    : null;
  const eta = profile?.latitude && product.store?.latitude
    ? calcEta(haversineKm(profile.latitude, profile.longitude, product.store.latitude, product.store.longitude))
    : null;

  const toggleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    if (wished) {
      await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id);
      setWished(false);
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
      setWished(true);
    }
  };

  const addToCart = async () => {
    if (!user) { navigate('/login'); return; }
    // Check if item already in cart with same variant
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + qty })
        .eq('id', existing.id);
      if (error) toast('Gagal tambah keranjang', 'error');
      else toast('Ditambah ke keranjang');
    } else {
      const { error } = await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: product.id,
        store_id: product.store_id,
        quantity: qty,
        variant: variants,
        variant_selected: variants,
        unit_price: effectivePrice,
      });
      if (error) toast('Gagal tambah keranjang', 'error');
      else toast('Ditambah ke keranjang');
    }
  };

  const buyNow = async () => {
    if (!user) { navigate('/login'); return; }
    const buyNowItem = {
      product_id: product.id,
      store_id: product.store_id,
      quantity: qty,
      variant: variants,
      variant_selected: variants,
      unit_price: effectivePrice,
      product: {
        id: product.id,
        name: product.name,
        price: effectivePrice,
        images: product.images,
        store: product.store,
      },
    };
    localStorage.setItem('buy_now_item', JSON.stringify(buyNowItem));
    navigate('/checkout?mode=buynow');
  };

  const startChat = async () => {
    if (!user) { navigate('/login'); return; }
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('store_id', product.store_id)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const { data: conv, error } = await supabase.from('conversations')
      .insert({ buyer_id: user.id, store_id: product.store_id, product_id: product.id })
      .select().single();
    if (error) { toast('Gagal memulai chat', 'error'); return; }
    navigate(`/chat/${conv.id}`);
  };

  return (
    <div className="pb-24 md:pb-12 max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-card overflow-hidden border border-border bg-muted cursor-zoom-in" onClick={() => setZoom(true)}>
            <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
            {discount > 0 && (
              <span className="absolute top-3 left-3 rounded-pill bg-primary px-3 py-1 text-xs font-bold text-white">-{discount}%</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={cn('w-16 h-16 rounded-btn border-2 overflow-hidden shrink-0 transition-colors', i === imgIdx ? 'border-primary' : 'border-border')}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            {product.is_flash_sale && <Badge variant="error" className="mb-2">Flash Sale</Badge>}
            <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">{product.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-warning text-warning" />
                <span className="font-semibold">{product.rating > 0 ? product.rating.toFixed(1) : 'Baru'}</span>
                <span className="text-foreground/40">({product.review_count} ulasan)</span>
              </div>
              <span className="text-foreground/30">|</span>
              <span className="text-foreground/60">{product.sold_count} terjual</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 py-3 border-y border-border">
            <span className="text-2xl font-bold tracking-tight">{formatRupiah(effectivePrice)}</span>
            {variantPriceModifier > 0 && <span className="text-xs text-foreground/40 line-through ml-2">{formatRupiah(product.price)}</span>}
            {discount > 0 && (
              <span className="text-sm text-foreground/40 line-through">{formatRupiah(product.original_price)}</span>
            )}
          </div>

          {/* Variants from product_variants table */}
          {Object.keys(variantGroups).length > 0 && (
            <div className="space-y-3">
              {Object.entries(variantGroups).map(([group, opts]) => (
                <div key={group}>
                  <p className="label mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {opts.map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() => setVariants((s) => ({ ...s, [group]: v.option_name }))}
                        className={cn('px-3 py-1.5 rounded-btn border text-sm font-medium transition-all', variants[group] === v.option_name ? 'border-primary bg-accent-soft text-primary' : 'border-border hover:border-foreground/30')}
                      >
                        {v.option_name}
                        {v.price_modifier > 0 && <span className="text-[10px] text-foreground/40 ml-1">+{formatRupiah(v.price_modifier)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Legacy variants from products.variants jsonb */}
          {product.variants && product.variants.length > 0 && Object.keys(variantGroups).length === 0 && (
            <div className="space-y-3">
              {product.variants.map((v) => (
                <div key={v.name}>
                  <p className="label mb-2">{v.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setVariants((s) => ({ ...s, [v.name]: opt }))}
                        className={cn('px-3 py-1.5 rounded-btn border text-sm font-medium transition-all', variants[v.name] === opt ? 'border-primary bg-accent-soft text-primary' : 'border-border hover:border-foreground/30')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <p className="label">Jumlah</p>
            <div className="flex items-center border border-border rounded-btn">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-l-btn"><Minus size={14} /></button>
              <span className="w-12 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-r-btn"><Plus size={14} /></button>
            </div>
            <span className="text-xs text-foreground/40">Stok: {product.stock}</span>
          </div>

          {/* Ongkir */}
          {ongkir !== null && (
            <div className="flex items-center gap-3 p-3 rounded-card bg-muted">
              <Truck size={18} className="text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Ongkir: {formatRupiah(ongkir)}</p>
                <p className="text-xs text-foreground/50">Estimasi tiba {eta} menit</p>
              </div>
            </div>
          )}

          {/* Seller */}
          {product.store && (
            <button onClick={() => navigate(`/store/${product.store!.id}`)} className="w-full flex items-center gap-3 p-3 rounded-card border border-border hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-btn bg-muted overflow-hidden flex items-center justify-center">
                {product.store.logo_url ? <img src={product.store.logo_url} alt="" className="w-full h-full object-cover" /> : <Store size={18} className="text-foreground/40" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold">{product.store.name}</p>
                <p className="text-xs text-foreground/50">{product.store.city || 'Indonesia'}</p>
              </div>
              <MessageCircle size={18} className="text-foreground/40" onClick={(e) => { e.stopPropagation(); startChat(); }} />
            </button>
          )}

          {/* Desktop actions */}
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="lg" onClick={toggleWishlist}>
              <Heart size={18} className={wished ? 'fill-primary text-primary' : ''} />
            </Button>
            <Button variant="outline" size="lg" onClick={startChat}><MessageCircle size={18} /> Chat Penjual</Button>
            <Button variant="outline" size="lg" onClick={addToCart} fullWidth><ShoppingCart size={18} /> Keranjang</Button>
            <Button size="lg" onClick={buyNow} fullWidth>Beli Sekarang</Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section className="mt-8">
          <h2 className="text-base font-bold tracking-tight mb-3">Deskripsi</h2>
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-8">
        <h2 className="text-base font-bold tracking-tight mb-3">Ulasan ({reviews?.length || 0})</h2>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-pill bg-muted flex items-center justify-center text-xs font-bold">
                    {r.user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.user?.name || 'Anonim'}</p>
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? 'fill-warning text-warning' : 'text-border'} />)}</div>
                  </div>
                </div>
                {r.body && <p className="text-sm text-foreground/70">{r.body}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/40 py-4">Belum ada ulasan</p>
        )}
      </section>

      {/* Related */}
      {related && related.length > 1 && (
        <section className="mt-8">
          <h2 className="text-base font-bold tracking-tight mb-3">Produk terkait</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {related.filter((p) => p.id !== product.id).slice(0, 5).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Mobile sticky bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-border px-4 py-3 flex items-center gap-2">
        <button onClick={toggleWishlist} className="w-11 h-11 flex items-center justify-center rounded-btn border border-border">
          <Heart size={20} className={wished ? 'fill-primary text-primary' : ''} />
        </button>
        <Button variant="outline" onClick={addToCart} className="flex-1"><ShoppingCart size={16} /> Keranjang</Button>
        <Button onClick={buyNow} className="flex-1">Beli</Button>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center p-4" onClick={() => setZoom(false)}>
            <img src={images[imgIdx]} alt={product.name} className="max-w-full max-h-full object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
