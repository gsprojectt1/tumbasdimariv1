import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LocationPicker } from '../components/LocationPicker';
import { Modal } from '../components/ui/Modal';
import { useCourier } from '../lib/hooks';
import { User, MapPin, LogOut, Store, Bike, ShoppingBag, Package, Settings, Camera, Check, Clock, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { data: courier } = useCourier();
  const { navigate } = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto"><User size={28} className="text-foreground/30" /></div>
          <div>
            <h2 className="text-lg font-bold">Masuk ke akunmu</h2>
            <p className="text-sm text-foreground/50">Untuk mengakses profil & fitur lainnya</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/login')}>Masuk</Button>
            <Button variant="outline" onClick={() => navigate('/register')}>Daftar</Button>
          </div>
        </div>
      </div>
    );
  }

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, `avatars/${user.id}`);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      await refreshProfile();
      toast('Foto profil diperbarui');
    } catch { toast('Gagal unggah', 'error'); }
    setUploadingAvatar(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const updates: any = { name, phone };
    if (location) {
      updates.latitude = location.lat;
      updates.longitude = location.lng;
      updates.address = location.address;
      updates.city = location.address.split(',').slice(-2, -1)[0]?.trim() || '';
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) toast('Gagal simpan', 'error');
    else { toast('Profil diperbarui'); setEditing(false); await refreshProfile(); }
    setSaving(false);
  };

  const roleLabel = { buyer: 'Pembeli', seller: 'Penjual', courier: 'Kurir', admin: 'Admin' }[profile?.role || 'buyer'];
  const roleIcon = { buyer: ShoppingBag, seller: Store, courier: Bike, admin: Settings }[profile?.role || 'buyer'];

  return (
    <div className="pb-24 md:pb-12 max-w-2xl mx-auto px-4 md:px-6 py-4">
      {/* Profile header */}
      <div className="flex items-center gap-4 p-4 rounded-card border border-border mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-pill bg-muted overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-foreground/40">{profile?.name?.[0]?.toUpperCase()}</span>}
          </div>
          <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-pill bg-primary text-white flex items-center justify-center cursor-pointer">
            {uploadingAvatar ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={12} />}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">{profile?.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {(() => { const Icon = roleIcon; return <Icon size={12} className="text-primary" />; })()}
            <span className="text-xs font-semibold text-primary">{roleLabel}</span>
          </div>
          <p className="text-xs text-foreground/50 mt-1">{profile?.phone || 'No phone'}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs font-semibold text-primary">Edit</button>
      </div>

      {/* Courier status */}
      {profile?.role === 'courier' && courier && (
        <div className="p-4 rounded-card border border-border mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Status Verifikasi</p>
            {courier.status === 'approved' && <span className="flex items-center gap-1 text-success text-xs font-semibold"><Check size={14} /> Disetujui</span>}
            {courier.status === 'pending_verification' && <span className="flex items-center gap-1 text-warning text-xs font-semibold"><Clock size={14} /> Menunggu</span>}
            {courier.status === 'rejected' && <span className="flex items-center gap-1 text-error text-xs font-semibold"><XCircle size={14} /> Ditolak</span>}
          </div>
          <div className="mt-3 space-y-1 text-xs text-foreground/60">
            <p>Kendaraan: {courier.vehicle_type === 'motorcycle' ? 'Motor' : courier.vehicle_type === 'car' ? 'Mobil' : 'Van'} • {courier.vehicle_plate}</p>
            <p>Pengiriman: {courier.total_deliveries} • Rating: {courier.rating.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1">
        {profile?.role === 'buyer' && (
          <>
            <MenuItem icon={Package} label="Pesanan saya" onClick={() => navigate('/orders')} />
            <MenuItem icon={MapPin} label="Wishlist" onClick={() => navigate('/wishlist')} />
          </>
        )}
        {profile?.role === 'seller' && <MenuItem icon={Store} label="Dashboard Penjual" onClick={() => navigate('/seller')} />}
        {profile?.role === 'courier' && courier?.status === 'approved' && <MenuItem icon={Bike} label="Dashboard Kurir" onClick={() => navigate('/courier')} />}
        <MenuItem icon={Settings} label="Pengaturan" onClick={() => setEditing(true)} />
        <button onClick={async () => { await signOut(); navigate('/'); }} className="w-full flex items-center gap-3 p-4 rounded-card border border-border hover:border-error/30 transition-colors text-left mt-4">
          <LogOut size={18} className="text-error" />
          <span className="text-sm font-semibold text-error">Keluar</span>
        </button>
      </div>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Profil" size="lg">
        <div className="space-y-4">
          <Input label="Nama" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Nomor telepon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div>
            <p className="label mb-2">Lokasi</p>
            <LocationPicker
              initialLat={profile?.latitude || undefined}
              initialLng={profile?.longitude || undefined}
              initialAddress={profile?.address || undefined}
              onChange={(lat, lng, addr) => setLocation({ lat, lng, address: addr })}
            />
          </div>
          <Button fullWidth size="lg" loading={saving} onClick={saveProfile}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 rounded-card border border-border hover:border-foreground/20 transition-colors text-left">
      <Icon size={18} className="text-foreground/60" />
      <span className="text-sm font-semibold flex-1">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/30"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  );
}
