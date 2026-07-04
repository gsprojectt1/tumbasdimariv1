import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, QrCode, CreditCard, Upload, Save, Wallet } from 'lucide-react';

export function AdminSettingsPage() {
  const { user, profile } = useAuth();
  const { navigate, back } = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') { navigate('/'); return; }
    supabase.from('app_settings').select('*').then(({ data }) => {
      const s: Record<string, string> = {};
      (data || []).forEach((r: any) => { s[r.key] = r.value || ''; });
      setSettings(s);
      setLoading(false);
    });
  }, [profile, navigate]);

  if (profile?.role !== 'admin') return null;
  if (loading) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;

  const uploadQris = async (file: File) => {
    setUploadingQris(true);
    try {
      const url = await uploadImage(file, `app-assets/qris_${Date.now()}`);
      const { error } = await supabase.from('app_settings').upsert({ key: 'qris_image_url', value: url }, { onConflict: 'key' });
      if (error) toast('Gagal simpan QRIS', 'error');
      else { setSettings((s) => ({ ...s, qris_image_url: url })); toast('QRIS disimpan'); }
    } catch { toast('Gagal unggah', 'error'); }
    setUploadingQris(false);
  };

  const save = async () => {
    setSaving(true);
    const entries = Object.entries(settings).filter(([k]) => k !== 'qris_image_url');
    for (const [key, value] of entries) {
      await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
    }
    toast('Pengaturan disimpan');
    setSaving(false);
  };

  return (
    <div className="pb-24 md:pb-12 max-w-2xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={back} className="text-foreground/60 hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Pengaturan Pembayaran</h1>
      </div>

      {/* QRIS */}
      <div className="p-4 rounded-card border border-border mb-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><QrCode size={14} /> QRIS Global</p>
        {settings.qris_image_url ? (
          <div className="flex items-center gap-3">
            <img src={settings.qris_image_url} alt="QRIS" className="w-28 h-28 rounded-btn border border-border object-contain" />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('admin-qris-upload')?.click()}>Ganti</Button>
          </div>
        ) : (
          <label className="block w-28 h-28 rounded-btn border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary">
            {uploadingQris ? <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Upload size={20} className="text-foreground/40" />}
            <input id="admin-qris-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQris(e.target.files[0])} />
          </label>
        )}
      </div>

      {/* Bank */}
      <div className="p-4 rounded-card border border-border mb-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><CreditCard size={14} /> Rekening Bank</p>
        <div className="space-y-3">
          <Input label="Nama Bank" value={settings.bank_name || ''} onChange={(e) => setSettings((s) => ({ ...s, bank_name: e.target.value }))} />
          <Input label="Nomor Rekening" value={settings.bank_account_number || ''} onChange={(e) => setSettings((s) => ({ ...s, bank_account_number: e.target.value }))} />
          <Input label="Nama Pemilik" value={settings.bank_account_name || ''} onChange={(e) => setSettings((s) => ({ ...s, bank_account_name: e.target.value }))} />
        </div>
      </div>

      {/* E-wallets */}
      <div className="p-4 rounded-card border border-border mb-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><Wallet size={14} /> E-wallet</p>
        <div className="space-y-3">
          <Input label="GoPay" value={settings.gopay_number || ''} onChange={(e) => setSettings((s) => ({ ...s, gopay_number: e.target.value }))} />
          <Input label="OVO" value={settings.ovo_number || ''} onChange={(e) => setSettings((s) => ({ ...s, ovo_number: e.target.value }))} />
          <Input label="Dana" value={settings.dana_number || ''} onChange={(e) => setSettings((s) => ({ ...s, dana_number: e.target.value }))} />
        </div>
      </div>

      <Button fullWidth size="lg" loading={saving} onClick={save}><Save size={16} /> Simpan Pengaturan</Button>
    </div>
  );
}
