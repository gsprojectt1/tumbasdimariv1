import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { formatRupiah, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Ticket, Plus, Trash2, Power, ArrowLeft, Truck, Package, Layers } from 'lucide-react';
import type { Voucher } from '../lib/types';

const voucherTypes = [
  { value: 'percent', label: 'Persentase', icon: Ticket },
  { value: 'fixed', label: 'Nominal', icon: Ticket },
  { value: 'free_shipping', label: 'Gratis Ongkir', icon: Truck },
  { value: 'combo', label: 'Kombo Produk', icon: Layers },
  { value: 'specific_product', label: 'Produk Tertentu', icon: Package },
];

export function SellerVouchersPage() {
  const { user, profile } = useAuth();
  const { data: store } = useStore();
  const { navigate, back } = useRouter();
  const toast = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'seller') { navigate('/'); return; }
  }, [profile, navigate]);

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from('vouchers').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
    setVouchers((data || []) as Voucher[]);
    setLoading(false);
  };

  useEffect(() => { if (store) load(); }, [store]);

  if (profile?.role !== 'seller') return null;
  if (!store) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;

  const toggleActive = async (v: Voucher) => {
    const { error } = await supabase.from('vouchers').update({ is_active: !v.is_active }).eq('id', v.id);
    if (error) toast('Gagal mengubah status', 'error');
    else { toast(v.is_active ? 'Voucher dinonaktifkan' : 'Voucher diaktifkan'); load(); }
  };

  const del = async (v: Voucher) => {
    if (!confirm('Hapus voucher?')) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', v.id);
    if (error) toast('Gagal hapus', 'error');
    else { toast('Voucher dihapus'); load(); }
  };

  const typeLabel = (t: string) => voucherTypes.find((v) => v.value === t)?.label || t;

  return (
    <div className="pb-24 md:pb-12 max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={back} className="text-foreground/60 hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Voucher</h1>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus size={16} /> Voucher</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-card border border-border skeleton" />)}</div>
      ) : vouchers.length === 0 ? (
        <EmptyState icon={<Ticket size={24} />} title="Belum ada voucher" description="Buat voucher diskon untuk pelanggan." action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> Buat voucher</Button>} />
      ) : (
        <div className="space-y-2">
          {vouchers.map((v) => (
            <div key={v.id} className="p-3 rounded-card border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wider">{v.code}</span>
                    <span className={cn('px-2 py-0.5 rounded-pill text-[10px] font-semibold', v.is_active ? 'bg-success/10 text-success' : 'bg-muted text-foreground/40')}>{v.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-accent-soft text-primary">{typeLabel(v.type)}</span>
                  </div>
                  <p className="text-xs text-foreground/50 mt-1">
                    {v.type === 'percent' && `${v.value}%`}
                    {v.type === 'fixed' && formatRupiah(v.value)}
                    {v.type === 'free_shipping' && 'Gratis ongkir'}
                    {v.type === 'combo' && `${v.combo_discount}% combo`}
                    {v.min_spend > 0 && ` • Min. ${formatRupiah(v.min_spend)}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/40">
                    <span>Kuota: {v.max_usage > 0 ? `${v.used_count}/${v.max_usage}` : '∞'}</span>
                    {v.end_date && <span>Berakhir: {new Date(v.end_date).toLocaleDateString('id-ID')}</span>}
                    {v.applicable_product_ids?.length > 0 && <span>Produk: {v.applicable_product_ids.length}</span>}
                    {v.combo_products?.length > 0 && <span>Kombo: {v.combo_products.length}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(v)} className={cn('w-8 h-8 flex items-center justify-center rounded-btn', v.is_active ? 'text-success' : 'text-foreground/30')}><Power size={16} /></button>
                  <button onClick={() => del(v)} className="w-8 h-8 flex items-center justify-center rounded-btn text-error hover:bg-error/10"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VoucherModal open={showModal} onClose={() => setShowModal(false)} storeId={store.id} onSaved={() => { setShowModal(false); load(); }} />
    </div>
  );
}

function VoucherModal({ open, onClose, storeId, onSaved }: { open: boolean; onClose: () => void; storeId: string; onSaved: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed' | 'free_shipping' | 'combo' | 'specific_product'>('percent');
  const [value, setValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comboDiscount, setComboDiscount] = useState('');
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [comboProducts, setComboProducts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('products').select('id, name').eq('store_id', storeId).eq('is_active', true).then(({ data }) => setStoreProducts(data || []));
    }
  }, [open, storeId]);

  const toggleProduct = (id: string, list: 'applicable' | 'combo') => {
    if (list === 'applicable') setSelectedProducts((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    else setComboProducts((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const save = async () => {
    if (!code.trim()) { toast('Isi kode voucher', 'error'); return; }
    if ((type === 'percent' || type === 'fixed' || type === 'specific_product') && !value) { toast('Isi nilai diskon', 'error'); return; }
    if (type === 'combo' && !comboDiscount) { toast('Isi diskon kombo', 'error'); return; }
    if (type === 'combo' && comboProducts.length < 2) { toast('Pilih minimal 2 produk untuk kombo', 'error'); return; }
    setSaving(true);
    const payload: any = {
      store_id: storeId, code: code.trim().toUpperCase(), type,
      value: Number(value || 0), min_spend: Number(minSpend || 0),
      max_usage: Number(maxUsage || 0),
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      valid_until: endDate ? new Date(endDate).toISOString() : null,
      is_active: true,
      applicable_product_ids: (type === 'percent' || type === 'fixed' || type === 'specific_product') ? selectedProducts : [],
      combo_products: type === 'combo' ? comboProducts : [],
      combo_discount: type === 'combo' ? Number(comboDiscount || 0) : 0,
    };
    const { error } = await supabase.from('vouchers').insert(payload);
    if (error) {
      if (error.code === '23505') toast('Kode voucher sudah ada', 'error');
      else toast('Gagal membuat voucher: ' + error.message, 'error');
    } else {
      toast('Voucher dibuat');
      setCode(''); setValue(''); setMinSpend(''); setMaxUsage(''); setStartDate(''); setEndDate(''); setComboDiscount(''); setSelectedProducts([]); setComboProducts([]);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Voucher" size="lg">
      <div className="space-y-4">
        <Input label="Kode voucher" placeholder="HEMAT10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <div>
          <p className="label mb-2">Tipe voucher</p>
          <div className="grid grid-cols-2 gap-2">
            {voucherTypes.map((t) => (
              <button key={t.value} onClick={() => setType(t.value as any)} className={cn('flex items-center gap-2 p-3 rounded-btn border-2 text-xs font-semibold transition-colors', type === t.value ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {(type === 'percent' || type === 'fixed') && (
          <Input label={type === 'percent' ? 'Nilai (%)' : 'Nilai (Rp)'} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        {type === 'combo' && (
          <Input label="Diskon kombo (%)" type="number" value={comboDiscount} onChange={(e) => setComboDiscount(e.target.value)} />
        )}

        <Input label="Minimum pembelian (Rp)" type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
        <Input label="Maksimum penggunaan (0 = tanpa batas)" type="number" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tanggal mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Tanggal berakhir" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {(type === 'percent' || type === 'fixed' || type === 'specific_product') && storeProducts.length > 0 && (
          <div>
            <p className="label mb-2">{type === 'specific_product' ? 'Produk yang berlaku' : 'Produk tertentu (opsional)'}</p>
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-btn border border-border">
              {storeProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id, 'applicable')} className="w-4 h-4 accent-primary" />
                  <span className="text-xs">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {type === 'combo' && storeProducts.length > 0 && (
          <div>
            <p className="label mb-2">Pilih produk kombo (min. 2)</p>
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-btn border border-border">
              {storeProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={comboProducts.includes(p.id)} onChange={() => toggleProduct(p.id, 'combo')} className="w-4 h-4 accent-primary" />
                  <span className="text-xs">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button fullWidth size="lg" loading={saving} onClick={save}>Simpan</Button>
      </div>
    </Modal>
  );
}
