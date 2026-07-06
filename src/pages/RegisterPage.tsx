import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LocationPicker } from '../components/LocationPicker';
import type { Role } from '../lib/types';
import { Mail, Lock, User, Phone, Store, Bike, ShoppingBag, ArrowRight, ArrowLeft, Upload, Check, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Nama min 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Min 6 karakter'),
  phone: z.string().min(8, 'Nomor telepon tidak valid'),
});

const roles: { value: Role; label: string; desc: string; icon: any }[] = [
  { value: 'buyer', label: 'Pembeli', desc: 'Belanja produk favorit', icon: ShoppingBag },
  { value: 'seller', label: 'Penjual', desc: 'Buka toko & jual produk', icon: Store },
  { value: 'courier', label: 'Kurir', desc: 'Antar pesanan & dapat penghasilan', icon: Bike },
];

const courierDocs = [
  { type: 'ktp', label: 'Foto KTP' },
  { type: 'kk', label: 'Foto Kartu Keluarga' },
  { type: 'selfie_ktp', label: 'Selfie dengan KTP' },
  { type: 'vehicle', label: 'Foto Kendaraan' },
] as const;

export function RegisterPage() {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>('buyer');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'van'>('motorcycle');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const handleDocUpload = async (type: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('File harus berupa gambar', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran file maksimal 5MB', 'error');
      return;
    }
    setUploadingDoc(type);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${type}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('courier-docs')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from('courier-docs')
        .getPublicUrl(fileName);
      setDocs((d) => ({ ...d, [type]: data.publicUrl }));
      toast('Dokumen terunggah ✓');
    } catch (e: any) {
      toast('Gagal unggah: ' + (e.message || 'error'), 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  const onStep1Submit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await signUp(data.email, data.password, data.name, role);
      }
      setStep(2);
    } catch (e: any) {
      toast(e.message || 'Gagal daftar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!location) {
      toast('Pilih lokasi dulu', 'error');
      return;
    }
    if (role === 'courier') {
      if (!vehiclePlate.trim()) { toast('Isi plat kendaraan', 'error'); return; }
      if (Object.keys(docs).length < 4) { toast('Lengkapi semua dokumen', 'error'); return; }
    }
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        await supabase.from('profiles').update({
          phone: data.phone,
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          city: location.address.split(',').slice(-2, -1)[0]?.trim() || '',
        }).eq('id', session.session.user.id);

        if (role === 'courier') {
          const { data: courier } = await supabase.from('couriers').insert({
            user_id: session.session.user.id,
            vehicle_type: vehicleType,
            vehicle_plate: vehiclePlate,
          }).select().single();
          if (courier) {
            await supabase.from('courier_documents').insert(
              Object.entries(docs).map(([type, url]) => ({ courier_id: courier.id, type, url }))
            );
          }
        }
      }
      toast('Akun berhasil dibuat!');
      navigate('/');
    } catch (e: any) {
      toast(e.message || 'Gagal daftar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goToStep1 = () => setStep(1);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-btn bg-primary flex items-center justify-center">
            <span className="text-white font-bold">T</span>
          </div>
          <span className="text-xl font-bold tracking-tightest">Tumbas</span>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-pill transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Pilih peranmu</h1>
                <p className="text-sm text-foreground/50">Kamu bisa mengubahnya nanti di profil.</p>
              </div>
              <div className="space-y-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-card border-2 transition-all text-left ${
                      role === r.value ? 'border-primary bg-accent-soft' : 'border-border hover:border-foreground/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-btn flex items-center justify-center ${role === r.value ? 'bg-primary text-white' : 'bg-muted text-foreground/60'}`}>
                      <r.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{r.label}</p>
                      <p className="text-xs text-foreground/50">{r.desc}</p>
                    </div>
                    {role === r.value && <Check size={18} className="text-primary" />}
                  </button>
                ))}
              </div>
              <Button type="button" fullWidth size="lg" onClick={goToStep1}>
                Lanjut <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.form
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
              onSubmit={handleSubmit(onStep1Submit)}
            >
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Data diri</h1>
                <p className="text-sm text-foreground/50">Informasi dasar untuk akunmu.</p>
              </div>
              <Input label="Nama lengkap" placeholder="Nama kamu" icon={<User size={16} />} error={errors.name?.message} {...register('name')} />
              <Input label="Email" type="email" placeholder="nama@email.com" icon={<Mail size={16} />} error={errors.email?.message} {...register('email')} />
              <Input label="Password" type="password" placeholder="••••••••" icon={<Lock size={16} />} error={errors.password?.message} {...register('password')} />
              <Input label="Nomor telepon" placeholder="08xxxxxxxxxx" icon={<Phone size={16} />} error={errors.phone?.message} {...register('phone')} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}><ArrowLeft size={16} /></Button>
                <Button type="submit" fullWidth size="lg" loading={loading}>Lanjut <ArrowRight size={16} /></Button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Lokasi & verifikasi</h1>
                <p className="text-sm text-foreground/50">Untuk pengiriman & ongkir akurat.</p>
              </div>

              <LocationPicker onChange={(lat, lng, address) => setLocation({ lat, lng, address })} />

              {role === 'courier' && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <p className="label mb-2">Jenis kendaraan</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['motorcycle', 'car', 'van'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVehicleType(v)}
                          className={`p-3 rounded-btn border-2 text-xs font-semibold capitalize transition-all ${vehicleType === v ? 'border-primary bg-accent-soft text-primary' : 'border-border'}`}
                        >
                          {v === 'motorcycle' ? 'Motor' : v === 'car' ? 'Mobil' : 'Van'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Plat nomor kendaraan" placeholder="B 1234 ABC" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
                  <div className="space-y-2">
                    <p className="label">Dokumen kurir ({Object.keys(docs).length}/4 terunggah)</p>
                    {courierDocs.map((d) => (
                      <div key={d.type}>
                        <label className="flex items-center justify-between gap-3 p-3 rounded-btn border border-border cursor-pointer hover:border-primary transition-colors">
                          <span className="text-sm font-medium">{d.label}</span>
                          {docs[d.type] ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                              <Check size={14} /> Terunggah
                            </span>
                          ) : uploadingDoc === d.type ? (
                            <span className="flex items-center gap-1 text-primary text-xs">
                              <Loader2 size={14} className="animate-spin" /> Mengunggah...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-foreground/40 text-xs">
                              <Upload size={14} /> Unggah
                            </span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingDoc === d.type}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(d.type, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {docs[d.type] && (
                          <div className="mt-1 ml-3">
                            <img src={docs[d.type]} alt={d.label} className="w-16 h-16 rounded-btn border border-border object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft size={16} /></Button>
                <Button fullWidth size="lg" loading={loading} onClick={handleSubmit(onSubmit)}>
                  Daftar <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-foreground/50 mt-8">
          Sudah punya akun?{' '}
          <button onClick={() => navigate('/login')} className="text-primary font-semibold hover:underline">Masuk</button>
        </p>
      </div>
    </div>
  );
}
