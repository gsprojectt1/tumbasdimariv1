import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { formatRupiah, cn, timeAgo } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Wallet, ArrowLeft, Clock, Check, X, Loader2, Plus } from 'lucide-react';
import type { Withdrawal } from '../lib/types';

const METHODS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO', 'Dana'];
const MIN_WITHDRAWAL = 50000;

export function WithdrawalPage({ role }: { role: 'seller' | 'courier' }) {
  const { user, profile } = useAuth();
  const { navigate, back } = useRouter();
  const toast = useToast();
  const [balance, setBalance] = useState(0);
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (profile?.role !== role) { navigate('/'); return; }
  }, [profile, role, navigate]);

  const load = async () => {
    if (!user) return;
    const table = role === 'seller' ? 'seller_balance' : 'courier_balance';
    const { data: bal } = await supabase.from(table).select('*').eq('user_id', user.id).maybeSingle();
    if (bal) { setBalance(bal.balance); setBalanceId(bal.id); }
    else {
      const { data: newBal } = await supabase.from(table).insert({ user_id: user.id, balance: 0 }).select().single();
      if (newBal) { setBalance(0); setBalanceId(newBal.id); }
    }
    const { data: w } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setWithdrawals((w || []) as Withdrawal[]);
    const { data: accs } = await supabase.from('payment_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAccounts(accs || []);
    if (accs && accs.length > 0) {
      const primary = accs.find((a) => a.is_primary) || accs[0];
      setSelectedAccountId(primary.id);
      setMethod(primary.bank_name);
      setAccountNumber(primary.account_number);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  if (profile?.role !== role) return null;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt < MIN_WITHDRAWAL) { toast(`Minimum tarik ${formatRupiah(MIN_WITHDRAWAL)}`, 'error'); return; }
    if (amt > balance) { toast('Saldo tidak cukup', 'error'); return; }
    if (!accountNumber.trim()) { toast('Pilih rekening atau isi nomor', 'error'); return; }
    setSubmitting(true);
    const { error: wError } = await supabase.from('withdrawals').insert({
      user_id: user!.id, role, amount: amt, method, account_number: accountNumber.trim(), status: 'pending',
    });
    if (wError) { toast('Gagal mengajukan penarikan', 'error'); setSubmitting(false); return; }
    const table = role === 'seller' ? 'seller_balance' : 'courier_balance';
    await supabase.from(table).update({ balance: balance - amt, updated_at: new Date().toISOString() }).eq('id', balanceId);
    toast('Pengajuan penarikan berhasil');
    setAmount(''); setAccountNumber('');
    load();
    setSubmitting(false);
  };

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'text-warning bg-warning/10', icon: Clock, label: 'Menunggu' },
    processing: { color: 'text-primary bg-accent-soft', icon: Loader2, label: 'Diproses' },
    completed: { color: 'text-success bg-success/10', icon: Check, label: 'Selesai' },
    rejected: { color: 'text-error bg-error/10', icon: X, label: 'Ditolak' },
  };

  return (
    <div className="pb-24 md:pb-12 max-w-2xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={back} className="text-foreground/60 hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Tarik Saldo</h1>
      </div>

      {/* Balance card */}
      <div className="p-5 rounded-card bg-gradient-to-br from-primary to-primary-600 text-white mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} />
          <p className="text-xs font-medium opacity-80">Saldo tersedia</p>
        </div>
        <p className="text-2xl font-bold tracking-tight">{formatRupiah(balance)}</p>
      </div>

      {/* Withdrawal form */}
      <div className="p-4 rounded-card border border-border mb-4">
        <h2 className="text-sm font-bold mb-3">Ajukan Penarikan</h2>
        <div className="space-y-3">
          <Input label="Nominal (min. Rp50.000)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
          <div>
            <p className="label mb-2">Rekening tersimpan</p>
            {accounts.length > 0 ? (
              <select value={selectedAccountId} onChange={(e) => {
                setSelectedAccountId(e.target.value);
                const acc = accounts.find((a) => a.id === e.target.value);
                if (acc) { setMethod(acc.bank_name); setAccountNumber(acc.account_number); }
              }} className="w-full h-11 rounded-btn border border-border bg-white px-3 text-sm font-medium focus:outline-none focus:border-primary">
                <option value="">Pilih rekening</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank_name} • {a.account_number} {a.is_primary ? '(Utama)' : ''}</option>)}
              </select>
            ) : (
              <p className="text-xs text-foreground/40">Belum ada rekening tersimpan. {role === 'seller' ? 'Tambah di Pengaturan Pembayaran.' : 'Tambah di pengaturan.'}</p>
            )}
          </div>
          <div>
            <p className="label mb-2">Atau pilih metode lain</p>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={cn('p-2 rounded-btn border-2 text-[11px] font-semibold', method === m ? 'border-primary bg-accent-soft text-primary' : 'border-border')}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Input label="Nomor rekening / akun" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" />
          <Button fullWidth size="lg" loading={submitting} onClick={submit}>Ajukan Penarikan</Button>
        </div>
      </div>

      {/* History */}
      <h2 className="text-sm font-bold mb-3">Riwayat Penarikan</h2>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-card border border-border skeleton" />)}</div>
      ) : withdrawals.length === 0 ? (
        <EmptyState icon={<Wallet size={24} />} title="Belum ada penarikan" />
      ) : (
        <div className="space-y-2">
          {withdrawals.map((w) => {
            const sc = statusConfig[w.status] || statusConfig.pending;
            return (
              <div key={w.id} className="p-3 rounded-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{formatRupiah(w.amount)}</span>
                  <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold', sc.color)}>
                    <sc.icon size={10} /> {sc.label}
                  </span>
                </div>
                <p className="text-xs text-foreground/50 mt-1">{w.method} • {w.account_number}</p>
                <p className="text-[10px] text-foreground/30 mt-0.5">{timeAgo(w.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
