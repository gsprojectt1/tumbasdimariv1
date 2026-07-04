import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useStore, useCategories, useOrders } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { uploadImage, formatRupiah, slugify, cn, haversineKm } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { TrendingUp, Package, ShoppingBag, DollarSign, Plus, Edit2, Trash2, Upload, X, Store, Power, Ticket, Wallet, Bike, Truck, MapPin, QrCode, CreditCard, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Product, Order } from '../lib/types';

export function SellerDashboard() {
  const { user, profile } = useAuth();
  const { data: store, isLoading: storeLoading } = useStore();
  const { data: orders } = useOrders();
  const { data: categories } = useCategories();
  const { navigate } = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'store' | 'payment'>('overview');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'seller') { navigate('/'); return; }
  }, [profile, navigate]);

  useEffect(() => {
    if (store) loadProducts();
  }, [store]);

  // Realtime: subscribe to order changes
  useEffect(() => {
    if (!store) return;
    const channel = supabase
      .channel('seller-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        () => { refetchOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store]);

  const refetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, items:order_items(*)').eq('store_id', store!.id).order('created_at', { ascending: false });
    if (data) setOrdersLocal(data as any);
  };
  const [ordersLocal, setOrdersLocal] = useState<any[]>([]);

  const loadProducts = async () => {
    if (!store) return;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
    setProducts((data || []) as Product[]);
  };

  if (profile?.role !== 'seller') return null;
  if (storeLoading) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;

  if (!store) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState icon={<Store size={24} />} title="Belum punya toko" description="Buat toko untuk mulai berjualan." action={<Button onClick={() => setShowStoreModal(true)}>Buat toko</Button>} />
        <StoreModal open={showStoreModal} onClose={() => setShowStoreModal(false)} userId={user!.id} profile={profile} onCreated={() => window.location.reload()} />
      </div>
    );
  }

  const revenue = (orders || []).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const completedOrders = (orders || []).filter((o) => o.status === 'completed').length;

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString('id-ID', { weekday: 'short' });
    const dayOrders = (orders || []).filter((o) => new Date(o.created_at).toDateString() === d.toDateString());
    return { day: dayStr, revenue: dayOrders.reduce((s, o) => s + o.total, 0) };
  });

  return (
    <div className="pb-24 md:pb-12 max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-foreground/50">{store.name}</p>
        </div>
        <Button size="sm" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}><Plus size={16} /> Produk</Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => navigate('/seller/vouchers')} className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-pill border border-border text-xs font-semibold hover:border-primary"><Ticket size={14} /> Voucher</button>
        <button onClick={() => navigate('/seller/withdrawal')} className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-pill border border-border text-xs font-semibold hover:border-primary"><Wallet size={14} /> Tarik Saldo</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {(['overview', 'products', 'orders', 'store', 'payment'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('shrink-0 px-4 h-9 rounded-pill text-xs font-semibold transition-colors', tab === t ? 'bg-primary text-white' : 'border border-border')}>
            {t === 'overview' ? 'Ringkasan' : t === 'products' ? 'Produk' : t === 'orders' ? 'Pesanan' : t === 'store' ? 'Toko' : 'Pembayaran'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Pendapatan" value={formatRupiah(revenue)} />
            <StatCard icon={ShoppingBag} label="Pesanan" value={String(orders?.length || 0)} />
            <StatCard icon={Package} label="Produk" value={String(products.length)} />
            <StatCard icon={TrendingUp} label="Selesai" value={String(completedOrders)} />
          </div>
          <div className="p-4 rounded-card border border-border">
            <p className="text-sm font-bold mb-3">Pendapatan 7 hari</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#11111160' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#11111160' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: '1px solid #EBEBEB', fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#F26B3A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-2">
          {products.length === 0 ? (
            <EmptyState icon={<Package size={24} />} title="Belum ada produk" action={<Button onClick={() => { setEditingProduct(null); setShowProductModal(true); }}><Plus size={16} /> Tambah produk</Button>} />
          ) : (
            products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-card border border-border">
                <img src={p.images?.[0] || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=200'} alt="" className="w-14 h-14 rounded-btn border border-border object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                  <p className="text-xs text-foreground/50">{formatRupiah(p.price)} • Stok: {p.stock} • {p.sold_count} terjual</p>
                </div>
                <button onClick={async () => { await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id); loadProducts(); }} className={cn('w-8 h-8 flex items-center justify-center rounded-btn', p.is_active ? 'text-success' : 'text-foreground/30')}><Power size={16} /></button>
                <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-btn text-foreground/60 hover:bg-muted"><Edit2 size={16} /></button>
                <button onClick={async () => { if (confirm('Hapus produk?')) { await supabase.from('products').delete().eq('id', p.id); loadProducts(); toast('Produk dihapus'); } }} className="w-8 h-8 flex items-center justify-center rounded-btn text-error hover:bg-error/10"><Trash2 size={16} /></button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-2">
          {(!ordersLocal || ordersLocal.length === 0) ? (
            <EmptyState icon={<ShoppingBag size={24} />} title="Belum ada pesanan" />
          ) : (
            ordersLocal.map((o) => <OrderRow key={o.id} order={o} store={store} onUpdate={async (status) => {
              const { error } = await supabase.from('orders').update({ status }).eq('id', o.id);
              if (!error) {
                toast('Status diperbarui');
                // Notify buyer
                await supabase.from('notifications').insert({
                  user_id: o.buyer_id, type: 'order_status', title: 'Status pesanan diperbarui',
                  body: `Pesanan kamu ${status}`, data: { order_id: o.id },
                });
                refetchOrders();
              } else { toast('Gagal update', 'error'); }
            }} />)
          )}
        </div>
      )}

      {tab === 'store' && <StoreSettings store={store} onUpdated={() => window.location.reload()} />}

      {tab === 'payment' && <PaymentSettings store={store} userId={user!.id} />}

      <ProductModal open={showProductModal} onClose={() => { setShowProductModal(false); setEditingProduct(null); }} storeId={store.id} categories={categories || []} product={editingProduct} onSaved={() => { setShowProductModal(false); setEditingProduct(null); loadProducts(); }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-card border border-border">
      <div className="w-8 h-8 rounded-btn bg-accent-soft flex items-center justify-center mb-2"><Icon size={16} className="text-primary" /></div>
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-lg font-bold tracking-tight">{value}</p>
    </motion.div>
  );
}

function OrderRow({ order, store, onUpdate }: { order: Order; store: any; onUpdate: (status: string) => void }) {
  const toast = useToast();
  const [showShipModal, setShowShipModal] = useState(false);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);

  const isPaid = order.status === 'paid';

  const callCourier = async () => {
    setShowShipModal(true);
    setLoadingCouriers(true);
    const { data } = await supabase.from('couriers').select('*, user:profiles(name, latitude, longitude)').eq('is_online', true).eq('status', 'approved');
    if (data && store?.latitude) {
      const sorted = data
        .filter((c: any) => c.user?.latitude)
        .map((c: any) => ({ ...c, distance: haversineKm(store.latitude, store.longitude, c.user.latitude, c.user.longitude) }))
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 5);
      setCouriers(sorted);
    } else {
      setCouriers(data || []);
    }
    setLoadingCouriers(false);
  };

  const assignCourier = async (courierId: string) => {
    const { error } = await supabase.from('orders').update({ courier_id: courierId, delivery_type: 'courier', status: 'shipping' }).eq('id', order.id);
    if (error) { toast('Gagal memanggil kurir', 'error'); return; }
    await supabase.from('deliveries').insert({ order_id: order.id, courier_id: courierId, status: 'to_seller', distance_km: 0 });
    // Notify courier
    await supabase.from('notifications').insert({ user_id: courierId, type: 'new_delivery', title: 'Pesanan baru', body: `Ada pesanan baru untukmu dari ${order.buyer_name}` });
    // Notify buyer
    await supabase.from('notifications').insert({ user_id: order.buyer_id, type: 'order_status', title: 'Kurir ditugaskan', body: 'Kurir sedang menuju toko untuk mengambil pesananmu' });
    toast('Kurir dipanggil');
    setShowShipModal(false);
    onUpdate('shipping');
  };

  const selfDeliver = async () => {
    const { error } = await supabase.from('orders').update({ delivery_type: 'seller_delivery', status: 'shipping' }).eq('id', order.id);
    if (error) { toast('Gagal', 'error'); return; }
    toast('Pengiriman sendiri dipilih');
    onUpdate('shipping');
  };

  const statuses = ['paid', 'accepted', 'preparing', 'shipping', 'completed', 'cancelled'];

  return (
    <div className="p-3 rounded-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground/50">{order.buyer_name}</span>
        <span className="text-xs font-bold text-primary">{formatRupiah(order.total)}</span>
      </div>
      <p className="text-sm font-medium line-clamp-1">{order.items?.[0]?.name}{order.items && order.items.length > 1 && ` +${order.items.length - 1}`}</p>
      <p className="text-[10px] text-foreground/40 mt-0.5">Pengiriman: {order.delivery_type === 'self_pickup' ? 'Ambil sendiri' : order.delivery_type === 'seller_delivery' ? 'Antar toko' : 'Kurir'} • {order.payment_method}</p>
      {isPaid && (
        <div className="flex gap-2 mt-2">
          <button onClick={callCourier} className="flex items-center gap-1 px-3 h-8 rounded-btn bg-primary text-white text-xs font-semibold"><Bike size={12} /> Panggil Kurir</button>
          <button onClick={selfDeliver} className="flex items-center gap-1 px-3 h-8 rounded-btn border border-border text-xs font-semibold"><Truck size={12} /> Antar Sendiri</button>
        </div>
      )}
      <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar">
        {statuses.map((s) => (
          <button key={s} onClick={() => onUpdate(s)} className={cn('shrink-0 px-2.5 py-1 rounded-pill text-[10px] font-semibold transition-colors', order.status === s ? 'bg-primary text-white' : 'border border-border text-foreground/50')}>{s}</button>
        ))}
      </div>
      <Modal open={showShipModal} onClose={() => setShowShipModal(false)} title="Pilih Kurir">
        {loadingCouriers ? <p className="text-sm text-foreground/50 py-4 text-center">Mencari kurir...</p> : couriers.length === 0 ? <EmptyState icon={<Bike size={24} />} title="Tidak ada kurir online" /> : (
          <div className="space-y-2">
            {couriers.map((c) => (
              <button key={c.id} onClick={() => assignCourier(c.user_id)} className="w-full flex items-center gap-3 p-3 rounded-btn border border-border hover:border-primary transition-colors text-left">
                <div className="w-10 h-10 rounded-pill bg-muted flex items-center justify-center"><Bike size={16} className="text-foreground/40" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.user?.name || 'Kurir'}</p>
                  <p className="text-xs text-foreground/50 flex items-center gap-1"><MapPin size={10} /> {c.distance ? `${c.distance.toFixed(1)} km` : 'Tidak diketahui'}</p>
                </div>
                <span className="text-xs font-bold text-primary">Pilih</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProductModal({ open, onClose, storeId, categories, product, onSaved }: any) {
  const toast = useToast();
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(String(product?.price || ''));
  const [originalPrice, setOriginalPrice] = useState(String(product?.original_price || ''));
  const [stock, setStock] = useState(String(product?.stock || '0'));
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [city, setCity] = useState(product?.city || '');
  const [isFlashSale, setIsFlashSale] = useState(product?.is_flash_sale || false);
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantGroups, setVariantGroups] = useState<{ name: string; options: { name: string; price: string; stock: string }[] }[]>([]);

  useEffect(() => {
    if (product?.id) {
      supabase.from('product_variants').select('*').eq('product_id', product.id).then(({ data }) => {
        if (data && data.length > 0) {
          setVariantsEnabled(true);
          const groups: Record<string, { name: string; price: string; stock: string }[]> = {};
          data.forEach((v: any) => {
            if (!groups[v.group_name]) groups[v.group_name] = [];
            groups[v.group_name].push({ name: v.option_name, price: String(v.price_modifier || 0), stock: String(v.stock || 0) });
          });
          setVariantGroups(Object.entries(groups).map(([name, options]) => ({ name, options })));
        }
      });
    }
  }, [product]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadImage(f, `products/${storeId}/${Date.now()}`)));
      setImages((imgs) => [...imgs, ...urls]);
    } catch { toast('Gagal unggah', 'error'); }
    setUploading(false);
  };

  const addGroup = () => setVariantGroups((g) => [...g, { name: '', options: [{ name: '', price: '0', stock: '0' }] }]);
  const removeGroup = (i: number) => setVariantGroups((g) => g.filter((_, idx) => idx !== i));
  const addOption = (i: number) => setVariantGroups((g) => g.map((grp, idx) => idx === i ? { ...grp, options: [...grp.options, { name: '', price: '0', stock: '0' }] } : grp));
  const removeOption = (i: number, j: number) => setVariantGroups((g) => g.map((grp, idx) => idx === i ? { ...grp, options: grp.options.filter((_, oj) => oj !== j) } : grp));

  const save = async () => {
    if (!name.trim() || !price) { toast('Lengkapi nama & harga', 'error'); return; }
    setSaving(true);
    const payload = {
      store_id: storeId, category_id: categoryId || null,
      name, slug: slugify(name) + '-' + Date.now().toString(36),
      description, price: Number(price), original_price: Number(originalPrice || 0),
      stock: Number(stock || 0), city, is_flash_sale: isFlashSale, images,
    };
    let productId = product?.id;
    if (product) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      if (error) { toast('Gagal simpan', 'error'); setSaving(false); return; }
      toast('Produk diperbarui');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) { toast('Gagal simpan', 'error'); setSaving(false); return; }
      productId = data.id;
      toast('Produk ditambahkan');
    }

    if (productId) {
      await supabase.from('product_variants').delete().eq('product_id', productId);
      if (variantsEnabled && variantGroups.length > 0) {
        const rows = variantGroups
          .filter((g) => g.name.trim())
          .flatMap((g) => g.options.filter((o) => o.name.trim()).map((o) => ({
            product_id: productId, group_name: g.name.trim(), option_name: o.name.trim(),
            price_modifier: Number(o.price || 0), stock: Number(o.stock || 0),
          })));
        if (rows.length > 0) await supabase.from('product_variants').insert(rows);
      }
    }

    onSaved();
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit Produk' : 'Tambah Produk'} size="lg">
      <div className="space-y-4">
        <div>
          <p className="label mb-2">Foto produk</p>
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-btn border border-border overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-pill bg-foreground/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X size={12} /></button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-btn border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              {uploading ? <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Upload size={18} className="text-foreground/40" />}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
            </label>
          </div>
        </div>
        <Input label="Nama produk" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Harga (Rp)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input label="Harga coret (Rp)" type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Stok" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          <Input label="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <p className="label mb-2">Kategori</p>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-11 rounded-btn border border-border bg-white px-3 text-sm font-medium focus:outline-none focus:border-primary">
            <option value="">Pilih kategori</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Textarea label="Deskripsi" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isFlashSale} onChange={(e) => setIsFlashSale(e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">Flash Sale</span>
        </label>

        {/* Variants section */}
        <div className="border-t border-border pt-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={variantsEnabled} onChange={(e) => { setVariantsEnabled(e.target.checked); if (!e.target.checked) setVariantGroups([]); }} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-bold">Varian Produk</span>
          </label>
          {variantsEnabled && (
            <div className="space-y-3">
              {variantGroups.map((grp, i) => (
                <div key={i} className="p-3 rounded-btn border border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <input placeholder="Nama grup (Ukuran, Topping...)" value={grp.name} onChange={(e) => setVariantGroups((g) => g.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} className="flex-1 h-9 rounded-btn border border-border px-3 text-sm" />
                    <button onClick={() => removeGroup(i)} className="w-8 h-8 flex items-center justify-center rounded-btn text-error hover:bg-error/10"><Trash2 size={14} /></button>
                  </div>
                  {grp.options.map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input placeholder="Pilihan" value={opt.name} onChange={(e) => setVariantGroups((g) => g.map((x, idx) => idx === i ? { ...x, options: x.options.map((o, oj) => oj === j ? { ...o, name: e.target.value } : o) } : x))} className="flex-1 h-8 rounded-btn border border-border px-2 text-xs" />
                      <input placeholder="+Harga" type="number" value={opt.price} onChange={(e) => setVariantGroups((g) => g.map((x, idx) => idx === i ? { ...x, options: x.options.map((o, oj) => oj === j ? { ...o, price: e.target.value } : o) } : x))} className="w-16 h-8 rounded-btn border border-border px-2 text-xs" />
                      <input placeholder="Stok" type="number" value={opt.stock} onChange={(e) => setVariantGroups((g) => g.map((x, idx) => idx === i ? { ...x, options: x.options.map((o, oj) => oj === j ? { ...o, stock: e.target.value } : o) } : x))} className="w-16 h-8 rounded-btn border border-border px-2 text-xs" />
                      <button onClick={() => removeOption(i, j)} className="text-foreground/30 hover:text-error"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => addOption(i)} className="flex items-center gap-1 px-2 h-8 rounded-btn border border-dashed border-border text-xs text-foreground/50 hover:border-primary"><Plus size={12} /> Tambah pilihan</button>
                </div>
              ))}
              <button onClick={addGroup} className="flex items-center gap-1 px-3 h-9 rounded-btn border border-dashed border-border text-xs font-semibold text-foreground/60 hover:border-primary"><Plus size={14} /> Tambah grup varian</button>
            </div>
          )}
        </div>

        <Button fullWidth size="lg" loading={saving} onClick={save}>Simpan</Button>
      </div>
    </Modal>
  );
}

function StoreModal({ open, onClose, userId, profile, onCreated }: any) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(profile?.city || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [latitude, setLatitude] = useState(profile?.latitude || null);
  const [longitude, setLongitude] = useState(profile?.longitude || null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast('Isi nama toko', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('stores').insert({
      seller_id: userId, name, slug: slugify(name) + '-' + Date.now().toString(36),
      description, city, address, latitude, longitude,
    });
    if (error) toast('Gagal buat toko: ' + error.message, 'error'); else { toast('Toko dibuat!'); onCreated(); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Toko">
      <div className="space-y-4">
        <Input label="Nama toko" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Deskripsi" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
        <Textarea label="Alamat (terisi dari profil)" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        <p className="text-xs text-foreground/40">Lokasi toko otomatis dari profil Anda. Ubah di halaman profil jika perlu.</p>
        <Button fullWidth size="lg" loading={saving} onClick={save}>Buat</Button>
      </div>
    </Modal>
  );
}

function StoreSettings({ store, onUpdated }: any) {
  const toast = useToast();
  const { profile } = useAuth();
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description || '');
  const [city, setCity] = useState(store.city || profile?.city || '');
  const [address, setAddress] = useState(store.address || profile?.address || '');
  const [logoUrl, setLogoUrl] = useState(store.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(store.banner_url || '');
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState({ price_per_km: 1000, minimum_fee: 3000, free_shipping_minimum: 0 });
  const [shippingSaving, setShippingSaving] = useState(false);
  const [qrisUrl, setQrisUrl] = useState(store.qris_image_url || '');
  const [qrisUploading, setQrisUploading] = useState(false);

  const uploadQris = async (file: File) => {
    setQrisUploading(true);
    try {
      const url = await uploadImage(file, `store-assets/${store.id}/qris_${Date.now()}`);
      const { error } = await supabase.from('stores').update({ qris_image_url: url }).eq('id', store.id);
      if (error) toast('Gagal simpan QRIS', 'error'); else { setQrisUrl(url); toast('QRIS disimpan'); }
    } catch { toast('Gagal unggah', 'error'); }
    setQrisUploading(false);
  };

  useEffect(() => {
    supabase.from('shipping_settings').select('*').eq('store_id', store.id).maybeSingle().then(({ data }) => {
      if (data) setShipping({ price_per_km: data.price_per_km, minimum_fee: data.minimum_fee, free_shipping_minimum: data.free_shipping_minimum });
    });
  }, [store.id]);

  const upload = async (file: File, type: 'logo' | 'banner') => {
    const url = await uploadImage(file, `stores/${store.id}/${type}`);
    if (type === 'logo') setLogoUrl(url); else setBannerUrl(url);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('stores').update({ name, description, city, address, logo_url: logoUrl, banner_url: bannerUrl }).eq('id', store.id);
    if (error) toast('Gagal simpan', 'error'); else { toast('Toko diperbarui'); onUpdated(); }
    setSaving(false);
  };

  const saveShipping = async () => {
    setShippingSaving(true);
    const { error } = await supabase.from('shipping_settings').upsert({
      store_id: store.id,
      price_per_km: Number(shipping.price_per_km),
      minimum_fee: Number(shipping.minimum_fee),
      free_shipping_minimum: Number(shipping.free_shipping_minimum),
    });
    if (error) toast('Gagal simpan ongkir', 'error'); else toast('Pengaturan ongkir disimpan');
    setShippingSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="label mb-2">Banner toko</p>
        <label className="block h-32 rounded-card border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary">
          {bannerUrl ? <img src={bannerUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-foreground/40"><Upload size={20} /></div>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'banner')} />
        </label>
      </div>
      <div>
        <p className="label mb-2">Logo toko</p>
        <label className="block w-20 h-20 rounded-btn border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary">
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-foreground/40"><Upload size={16} /></div>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'logo')} />
        </label>
      </div>
      <Input label="Nama toko" value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea label="Deskripsi" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input label="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
      <Textarea label="Alamat toko" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      <Button fullWidth size="lg" loading={saving} onClick={save}>Simpan Toko</Button>

      {/* QRIS upload (seller override) */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><QrCode size={14} /> QRIS Pribadi (Opsional)</p>
        <p className="text-xs text-foreground/40 mb-2">Upload QR QRIS sendiri. Kalau tidak ada, checkout akan gunakan QRIS admin.</p>
        {qrisUrl ? (
          <div className="flex items-center gap-3">
            <img src={qrisUrl} alt="QRIS" className="w-24 h-24 rounded-btn border border-border object-contain" />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('seller-qris-upload')?.click()}>Ganti</Button>
            <Button variant="outline" size="sm" onClick={async () => { await supabase.from('stores').update({ qris_image_url: null }).eq('id', store.id); setQrisUrl(''); toast('QRIS dihapus'); }}><Trash2 size={14} /></Button>
          </div>
        ) : (
          <label className="block w-32 h-32 rounded-btn border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary">
            {qrisUploading ? <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Upload size={20} className="text-foreground/40" />}
            <input id="seller-qris-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQris(e.target.files[0])} />
          </label>
        )}
      </div>

      {/* Shipping settings */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><Truck size={14} /> Pengaturan Ongkir</p>
        <div className="grid grid-cols-3 gap-2">
          <Input label="Per Km (Rp)" type="number" value={String(shipping.price_per_km)} onChange={(e) => setShipping((s) => ({ ...s, price_per_km: Number(e.target.value) }))} />
          <Input label="Min (Rp)" type="number" value={String(shipping.minimum_fee)} onChange={(e) => setShipping((s) => ({ ...s, minimum_fee: Number(e.target.value) }))} />
          <Input label="Gratis Min" type="number" value={String(shipping.free_shipping_minimum)} onChange={(e) => setShipping((s) => ({ ...s, free_shipping_minimum: Number(e.target.value) }))} />
        </div>
        <p className="text-xs text-foreground/40 mt-1">Formula: max(min_fee, jarak × per_km). Gratis jika total ≥ gratis min.</p>
        <Button variant="outline" fullWidth className="mt-2" loading={shippingSaving} onClick={saveShipping}>Simpan Ongkir</Button>
      </div>
    </div>
  );
}

function PaymentSettings({ store, userId }: { store: any; userId: string }) {
  const toast = useToast();
  const [qrisUrl, setQrisUrl] = useState(store.qris_image_url || '');
  const [uploading, setUploading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const loadAccounts = async () => {
    const { data } = await supabase.from('payment_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setAccounts(data || []);
  };

  useEffect(() => { loadAccounts(); }, [userId]);

  const uploadQris = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, `qris/${store.id}/${Date.now()}`);
      const { error } = await supabase.from('stores').update({ qris_image_url: url }).eq('id', store.id);
      if (error) toast('Gagal simpan QRIS', 'error'); else { setQrisUrl(url); toast('QRIS disimpan'); }
    } catch { toast('Gagal unggah', 'error'); }
    setUploading(false);
  };

  const setPrimary = async (id: string) => {
    await supabase.from('payment_accounts').update({ is_primary: false }).eq('user_id', userId);
    await supabase.from('payment_accounts').update({ is_primary: true }).eq('id', id);
    loadAccounts();
    toast('Rekening utama diubah');
  };

  const deleteAccount = async (id: string) => {
    await supabase.from('payment_accounts').delete().eq('id', id);
    loadAccounts();
    toast('Rekening dihapus');
  };

  return (
    <div className="space-y-4">
      {/* QRIS */}
      <div className="p-4 rounded-card border border-border">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><QrCode size={14} /> QRIS</p>
        {qrisUrl ? (
          <div className="flex items-center gap-3">
            <img src={qrisUrl} alt="QRIS" className="w-24 h-24 rounded-btn border border-border object-contain" />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('qris-upload')?.click()}>Ganti</Button>
          </div>
        ) : (
          <label className="block w-32 h-32 rounded-btn border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary">
            {uploading ? <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Upload size={20} className="text-foreground/40" />}
            <input id="qris-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQris(e.target.files[0])} />
          </label>
        )}
        <p className="text-xs text-foreground/40 mt-2">Upload foto QR QRIS untuk pembayaran</p>
      </div>

      {/* Bank accounts */}
      <div className="p-4 rounded-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold flex items-center gap-1.5"><CreditCard size={14} /> Rekening Bank/E-wallet</p>
          <Button size="sm" variant="outline" onClick={() => setShowAccountModal(true)}><Plus size={14} /> Tambah</Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-xs text-foreground/40">Belum ada rekening</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-btn border border-border">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.bank_name} • {a.account_number}</p>
                  <p className="text-xs text-foreground/50">a.n. {a.account_name}</p>
                </div>
                {a.is_primary && <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-success/10 text-success">Utama</span>}
                {!a.is_primary && <button onClick={() => setPrimary(a.id)} className="text-xs text-primary font-semibold">Jadikan Utama</button>}
                <button onClick={() => deleteAccount(a.id)} className="text-error"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AccountModal open={showAccountModal} onClose={() => setShowAccountModal(false)} userId={userId} onSaved={() => { setShowAccountModal(false); loadAccounts(); }} />
    </div>
  );
}

function AccountModal({ open, onClose, userId, onSaved }: any) {
  const toast = useToast();
  const [type, setType] = useState<'bank' | 'ewallet'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) { toast('Lengkapi semua field', 'error'); return; }
    setSaving(true);
    const { data: existing } = await supabase.from('payment_accounts').select('id').eq('user_id', userId);
    const { error } = await supabase.from('payment_accounts').insert({
      user_id: userId, type, bank_name: bankName, account_number: accountNumber, account_name: accountName,
      is_primary: !existing || existing.length === 0,
    });
    if (error) toast('Gagal tambah rekening', 'error'); else { toast('Rekening ditambahkan'); onSaved(); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Tambah Rekening">
      <div className="space-y-4">
        <div>
          <p className="label mb-2">Tipe</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType('bank')} className={cn('p-3 rounded-btn border-2 text-xs font-semibold', type === 'bank' ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>Bank</button>
            <button onClick={() => setType('ewallet')} className={cn('p-3 rounded-btn border-2 text-xs font-semibold', type === 'ewallet' ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>E-wallet</button>
          </div>
        </div>
        <Input label={type === 'bank' ? 'Nama Bank' : 'Nama E-wallet'} value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <Input label="Nomor Rekening" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <Input label="Nama Pemilik" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        <Button fullWidth size="lg" loading={saving} onClick={save}>Simpan</Button>
      </div>
    </Modal>
  );
}
