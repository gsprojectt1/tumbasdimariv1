import { useState, useMemo, useEffect } from 'react';
import { useCart } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { formatRupiah, haversineKm, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/EmptyState';
import { Minus, Plus, Trash2, ShoppingBag, Tag, Truck, MapPin, Check, X, Store as StoreIcon, BadgeCheck } from 'lucide-react';

export function CartPage() {
  const { user, profile } = useAuth();
  const { data: cart, isLoading, refetch } = useCart();
  const { path, navigate } = useRouter();
  const toast = useToast();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [autoVouchers, setAutoVouchers] = useState<any[]>([]);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'transfer' | 'cod' | 'self_pickup'>('qris');
  const [deliveryType, setDeliveryType] = useState<'courier' | 'self_pickup'>('courier');
  const [shippingSettings, setShippingSettings] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [sellerAccount, setSellerAccount] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>({});

  const isBuyNow = path.includes('mode=buynow');

  useEffect(() => {
    if (isBuyNow) {
      const raw = localStorage.getItem('buy_now_item');
      if (raw) {
        setBuyNowItem(JSON.parse(raw));
        setCheckoutMode(true);
      }
    }
  }, [isBuyNow]);

  const items = isBuyNow && buyNowItem
    ? [{ id: 'buynow', product_id: buyNowItem.product_id, store_id: buyNowItem.store_id, quantity: buyNowItem.quantity, variant: buyNowItem.variant, variant_selected: buyNowItem.variant_selected, unit_price: buyNowItem.unit_price, product: buyNowItem.product, store: buyNowItem.product?.store }]
    : (cart || []);

  const grouped = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((item: any) => {
      if (!map.has(item.store_id)) map.set(item.store_id, { store_id: item.store_id, store: item.store, items: [] });
      map.get(item.store_id).items.push(item);
    });
    return Array.from(map.values());
  }, [items]);

  const subtotal = items.reduce((sum: number, i: any) => sum + (i.unit_price || i.product?.price || 0) * i.quantity, 0);
  const storeId = grouped[0]?.store_id;
  const storeInfo = grouped[0]?.store;

  // Fetch shipping settings + store + auto vouchers when checkout
  useEffect(() => {
    if (!checkoutMode || !storeId) return;
    supabase.from('shipping_settings').select('*').eq('store_id', storeId).maybeSingle().then(({ data }) => {
      setShippingSettings(data || { price_per_km: 1000, minimum_fee: 3000, free_shipping_minimum: 0 });
    });
    supabase.from('stores').select('*').eq('id', storeId).maybeSingle().then(({ data }) => setStoreData(data));
    // Fetch auto-apply vouchers (specific_product, free_shipping, combo)
    supabase.from('vouchers').select('*').eq('store_id', storeId).eq('is_active', true).in('type', ['specific_product', 'free_shipping', 'combo']).then(({ data }) => {
      setAutoVouchers(data || []);
    });
    // Fetch seller's primary payment account
    if (storeInfo?.seller_id) {
      supabase.from('payment_accounts').select('*').eq('user_id', storeInfo.seller_id).eq('is_primary', true).maybeSingle().then(({ data }) => setSellerAccount(data));
    }
    // Fetch app settings (admin QRIS, bank, e-wallet)
    supabase.from('app_settings').select('*').then(({ data }) => {
      const settings: any = {};
      (data || []).forEach((s: any) => { settings[s.key] = s.value; });
      setAppSettings(settings);
    });
  }, [checkoutMode, storeId, storeInfo?.seller_id]);

  // Calculate shipping
  const distanceKm = profile?.latitude && storeInfo?.latitude
    ? haversineKm(profile.latitude, profile.longitude, storeInfo.latitude, storeInfo.longitude)
    : 3;
  const ongkir = deliveryType === 'self_pickup' ? 0 : (() => {
    const settings = shippingSettings || { price_per_km: 1000, minimum_fee: 3000, free_shipping_minimum: 0 };
    if (settings.free_shipping_minimum > 0 && subtotal >= settings.free_shipping_minimum) return 0;
    return Math.max(settings.minimum_fee, Math.round(distanceKm * settings.price_per_km));
  })();

  // Auto-apply vouchers
  const autoDiscount = useMemo(() => {
    let discount = 0;
    const appliedAuto: any[] = [];
    const cartProductIds = items.map((i: any) => i.product_id);

    for (const v of autoVouchers) {
      if (subtotal < (v.min_spend || 0)) continue;
      if (v.type === 'specific_product') {
        const ids = v.applicable_product_ids || [];
        if (ids.some((id: string) => cartProductIds.includes(id))) {
          if (v.value_type === 'percent' || v.type === 'percent') {
            discount += Math.round((subtotal * v.value) / 100);
          } else {
            discount += v.value;
          }
          appliedAuto.push(v);
        }
      } else if (v.type === 'free_shipping') {
        if (ongkir > 0) { discount += ongkir; appliedAuto.push(v); }
      } else if (v.type === 'combo') {
        const comboIds = v.combo_products || [];
        if (comboIds.length >= 2 && comboIds.every((id: string) => cartProductIds.includes(id))) {
          discount += Math.round((subtotal * (v.combo_discount || 0)) / 100);
          appliedAuto.push(v);
        }
      }
    }
    return { discount, vouchers: appliedAuto };
  }, [autoVouchers, subtotal, ongkir, items]);

  // Manual voucher (percent/fixed only)
  const manualDiscount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (subtotal < (appliedVoucher.min_spend || 0)) return 0;
    if (appliedVoucher.type === 'percent') {
      const d = Math.round((subtotal * appliedVoucher.value) / 100);
      return Math.min(d, appliedVoucher.max_discount || d);
    }
    return Math.min(appliedVoucher.value, appliedVoucher.max_discount || appliedVoucher.value);
  }, [appliedVoucher, subtotal]);

  const totalDiscount = autoDiscount.discount + manualDiscount;
  const total = Math.max(0, subtotal + ongkir - totalDiscount);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from('cart_items').update({ quantity: qty }).eq('id', id);
    refetch();
  };

  const removeItem = async (id: string) => {
    await supabase.from('cart_items').delete().eq('id', id);
    refetch();
    toast('Item dihapus');
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setCheckingVoucher(true);
    const { data } = await supabase.from('vouchers').select('*').eq('code', voucherCode.toUpperCase()).eq('is_active', true).maybeSingle();
    if (data && (data.type === 'percent' || data.type === 'fixed')) {
      setAppliedVoucher(data);
      toast('Voucher diterapkan');
    } else {
      toast('Voucher tidak valid atau tipe otomatis', 'error');
    }
    setCheckingVoucher(false);
  };

  const placeOrder = async () => {
    if (!user || !profile) { navigate('/login'); return; }
    if (!profile.address && deliveryType === 'courier') { toast('Lengkapi alamat di profil dulu', 'error'); navigate('/profile'); return; }

    for (const group of grouped) {
      const orderSubtotal = group.items.reduce((s: number, i: any) => s + (i.unit_price || i.product?.price || 0) * i.quantity, 0);
      const orderOngkir = deliveryType === 'self_pickup' ? 0 : (() => {
        const settings = shippingSettings || { price_per_km: 1000, minimum_fee: 3000, free_shipping_minimum: 0 };
        if (settings.free_shipping_minimum > 0 && orderSubtotal >= settings.free_shipping_minimum) return 0;
        return Math.max(settings.minimum_fee, Math.round(distanceKm * settings.price_per_km));
      })();
      const orderTotal = Math.max(0, orderSubtotal + orderOngkir - totalDiscount);

      const { data: order, error } = await supabase.from('orders').insert({
        buyer_id: user.id,
        store_id: group.store_id,
        status: 'paid',
        subtotal: orderSubtotal,
        shipping_cost: orderOngkir,
        discount: totalDiscount,
        total: orderTotal,
        voucher_id: appliedVoucher?.id || null,
        buyer_latitude: profile.latitude,
        buyer_longitude: profile.longitude,
        buyer_address: profile.address,
        buyer_name: profile.name,
        buyer_phone: profile.phone,
        payment_method: paymentMethod,
        delivery_type: deliveryType,
      }).select().single();
      if (error) { toast('Gagal membuat pesanan: ' + error.message, 'error'); return; }

      await supabase.from('order_items').insert(
        group.items.map((i: any) => ({
          order_id: order.id,
          product_id: i.product_id,
          name: i.product?.name || '',
          price: i.unit_price || i.product?.price || 0,
          quantity: i.quantity,
          variant: i.variant,
          variant_selected: i.variant_selected || i.variant,
          image_url: i.product?.images?.[0] || '',
        }))
      );

      if (deliveryType === 'courier') {
        await supabase.from('deliveries').insert({ order_id: order.id, status: 'to_seller', distance_km: distanceKm });
      }

      await supabase.from('notifications').insert({
        user_id: group.store?.seller_id,
        type: 'order',
        title: 'Pesanan baru',
        body: `${profile.name} memesan ${group.items.length} produk`,
        data: { order_id: order.id },
      });

      for (const i of group.items) {
        if (i.id !== 'buynow') {
          await supabase.from('cart_items').delete().eq('id', i.id);
        }
      }
    }
    if (isBuyNow) {
      localStorage.removeItem('buy_now_item');
    }
    toast('Pesanan berhasil dibuat!');
    navigate('/orders');
  };

  if (isLoading) return <Spinner className="py-20" />;

  if (!isBuyNow && (!cart || cart.length === 0)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState
          icon={<ShoppingBag size={24} />}
          title="Keranjang kosong"
          description="Yuk mulai belanja produk favoritmu."
          action={<Button onClick={() => navigate('/')}>Mulai belanja</Button>}
        />
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-12 max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-4">{checkoutMode ? 'Checkout' : 'Keranjang'}</h1>

      {/* Address */}
      {checkoutMode && deliveryType === 'courier' && (
        <div className="flex items-start gap-3 p-4 rounded-card border border-border mb-4">
          <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">{profile?.name}</p>
            <p className="text-xs text-foreground/60">{profile?.phone}</p>
            <p className="text-xs text-foreground/60 mt-1">{profile?.address || 'Belum ada alamat'}</p>
          </div>
          <button onClick={() => navigate('/profile')} className="text-xs font-semibold text-primary">Ubah</button>
        </div>
      )}

      {/* Store address for self_pickup */}
      {checkoutMode && deliveryType === 'self_pickup' && storeData && (
        <div className="flex items-start gap-3 p-4 rounded-card border border-border mb-4 bg-accent-soft/30">
          <StoreIcon size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Ambil di Toko</p>
            <p className="text-xs text-foreground/60 mt-1">{storeData.name} • {storeData.city || ''}</p>
            <p className="text-xs text-foreground/60">{storeData.address || profile?.address || 'Alamat toko belum diset'}</p>
          </div>
        </div>
      )}

      {/* Cart items grouped by store */}
      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.store_id} className="rounded-card border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <StoreIcon size={14} className="text-foreground/60" />
              <span className="text-sm font-bold">{group.store?.name || 'Toko'}</span>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item: any) => (
                <div key={item.id} className="flex gap-3 p-4">
                  <img src={item.product?.images?.[0] || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=200'} alt="" className="w-16 h-16 rounded-btn border border-border object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{item.product?.name}</p>
                    {item.variant_selected && Object.keys(item.variant_selected).length > 0 && (
                      <p className="text-xs text-foreground/50 mt-0.5">{Object.entries(item.variant_selected).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-1">{formatRupiah(item.unit_price || item.product?.price || 0)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)} className="text-foreground/30 hover:text-error"><Trash2 size={16} /></button>
                    <div className="flex items-center border border-border rounded-btn">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delivery + Payment selectors */}
      {checkoutMode && (
        <div className="space-y-4 mb-4 mt-4">
          <div>
            <p className="label mb-2">Metode Pengiriman</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'courier', l: 'Kurir', icon: Truck, desc: 'Antar ke alamat' },
                { v: 'self_pickup', l: 'Ambil Sendiri', icon: StoreIcon, desc: 'Ambil di toko' },
              ] as const).map((d) => (
                <button key={d.v} onClick={() => setDeliveryType(d.v)} className={cn('flex flex-col items-center gap-1 p-3 rounded-btn border-2 text-xs font-semibold transition-colors', deliveryType === d.v ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>
                  <d.icon size={16} /> {d.l}
                  <span className="text-[10px] font-normal text-foreground/40">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label mb-2">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'qris', l: 'QRIS', desc: 'Scan QR code' },
                { v: 'transfer', l: 'Transfer Bank', desc: 'Rekening penjual' },
                { v: 'cod', l: 'Bayar di Tempat (COD)', desc: 'Bayar saat tiba' },
                { v: 'self_pickup', l: 'Bayar di Toko', desc: 'Bayar saat ambil' },
              ] as const).map((p) => {
                const disabled = (p.v === 'cod' && deliveryType === 'self_pickup') || (p.v === 'self_pickup' && deliveryType !== 'self_pickup');
                return (
                  <button key={p.v} onClick={() => !disabled && setPaymentMethod(p.v)} disabled={disabled} className={cn('flex flex-col items-start gap-0.5 p-3 rounded-btn border-2 text-left transition-colors disabled:opacity-30', paymentMethod === p.v ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>
                    <span className="text-xs font-bold">{p.l}</span>
                    <span className="text-[10px] text-foreground/40">{p.desc}</span>
                  </button>
                );
              })}
            </div>
            {paymentMethod === 'qris' && (
              <div className="mt-2 p-4 rounded-card border border-border flex flex-col items-center gap-2">
                {(() => {
                  const qrisUrl = storeData?.qris_image_url || appSettings.qris_image_url;
                  return qrisUrl ? (
                    <>
                      <div className="w-48 h-48 bg-white border-2 border-border rounded-btn overflow-hidden">
                        <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-xs font-semibold text-foreground/60">{storeData?.qris_image_url ? 'QRIS Penjual' : 'QRIS Admin'}</p>
                    </>
                  ) : (
                    <p className="text-xs text-foreground/50 py-4">QRIS belum dikonfigurasi admin, pilih metode lain</p>
                  );
                })()}
              </div>
            )}
            {paymentMethod === 'transfer' && (
              <div className="mt-2 p-3 rounded-card border border-border space-y-1">
                {sellerAccount ? (
                  <>
                    <p className="text-xs font-bold">{sellerAccount.bank_name} • {sellerAccount.account_number}</p>
                    <p className="text-xs text-foreground/60">a.n. {sellerAccount.account_name}</p>
                  </>
                ) : appSettings.bank_account_number ? (
                  <>
                    <p className="text-xs font-bold">{appSettings.bank_name} • {appSettings.bank_account_number}</p>
                    <p className="text-xs text-foreground/60">a.n. {appSettings.bank_account_name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold">BCA • 1234567890 (PT Tumbas)</p>
                    <p className="text-xs font-bold">Mandiri • 9876543210 (PT Tumbas)</p>
                  </>
                )}
                <p className="text-[10px] text-foreground/40">Transfer ke rekening di atas, konfirmasi via chat</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-applied vouchers */}
      {checkoutMode && autoDiscount.vouchers.length > 0 && (
        <div className="mt-4 p-3 rounded-card border border-success/20 bg-success/5">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck size={16} className="text-success" />
            <p className="text-xs font-bold text-success">Diskon Otomatis Diterapkan</p>
          </div>
          {autoDiscount.vouchers.map((v, i) => (
            <div key={i} className="text-xs text-foreground/60 flex items-center gap-1">
              <Tag size={12} className="text-success" />
              {v.type === 'free_shipping' ? 'Gratis Ongkir' : v.type === 'combo' ? `Kombo ${v.combo_discount}%` : v.description || v.code}
            </div>
          ))}
        </div>
      )}

      {/* Manual voucher (percent/fixed only) */}
      {checkoutMode && (
        <div className="mt-4 p-4 rounded-card border border-border">
          <p className="label mb-2">Voucher (Persentase/Nominal)</p>
          <div className="flex gap-2">
            <Input placeholder="Masukkan kode" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={applyVoucher} loading={checkingVoucher}>Cek</Button>
          </div>
          {appliedVoucher && (
            <div className="flex items-center gap-2 mt-2 text-success text-xs font-semibold">
              <Check size={14} /> {appliedVoucher.description || appliedVoucher.code}
              <button onClick={() => setAppliedVoucher(null)} className="ml-auto text-foreground/40"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 p-4 rounded-card border border-border space-y-2">
        <div className="flex justify-between text-sm"><span className="text-foreground/60">Subtotal</span><span className="font-semibold">{formatRupiah(subtotal)}</span></div>
        {checkoutMode && (
          <>
            <div className="flex justify-between text-sm"><span className="text-foreground/60 flex items-center gap-1"><Truck size={14} /> Ongkir {deliveryType === 'self_pickup' && '(Ambil Sendiri)'}</span><span className="font-semibold">{ongkir === 0 ? 'GRATIS' : formatRupiah(ongkir)}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between text-sm text-success"><span>Diskon</span><span className="font-semibold">-{formatRupiah(totalDiscount)}</span></div>}
          </>
        )}
        <div className="flex justify-between pt-2 border-t border-border"><span className="font-bold">Total</span><span className="font-bold text-lg">{formatRupiah(checkoutMode ? total : subtotal)}</span></div>
      </div>

      {/* Action */}
      <div className="mt-4">
        {checkoutMode ? (
          <Button fullWidth size="lg" onClick={placeOrder}>Bayar {formatRupiah(total)}</Button>
        ) : (
          <Button fullWidth size="lg" onClick={() => setCheckoutMode(true)}>Checkout</Button>
        )}
      </div>
    </div>
  );
}
