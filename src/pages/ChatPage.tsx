import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { uploadImage, timeAgo, cn } from '../lib/utils';
import { useToast } from '../lib/toast';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { MessageCircle, Send, Image as ImageIcon, ArrowLeft, Store, Bike } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Conversation, Message } from '../lib/types';

export function ChatListPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchConvs = async () => {
    if (!user) return;
    setError(false);
    setLoading(true);
    const timeout = setTimeout(() => { setError(true); setLoading(false); }, 10000);
    try {
      let q = supabase.from('conversations').select('*, store:stores(*), buyer:profiles!conversations_buyer_id_fkey(*), product:products(*)');
      if (profile?.role === 'seller') {
        const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user.id).maybeSingle();
        if (store) q = q.eq('store_id', store.id);
        else { setConvs([]); setLoading(false); clearTimeout(timeout); return; }
      } else if (profile?.role === 'courier') {
        q = q.eq('courier_id', user.id);
      } else {
        q = q.eq('buyer_id', user.id);
      }
      const { data, error: qError } = await q.order('last_message_at', { ascending: false });
      if (qError) throw qError;
      setConvs((data || []) as Conversation[]);
    } catch (e) {
      setError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchConvs();

    const channel = supabase.channel('convs-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConvs();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConvs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile]);

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><EmptyState icon={<MessageCircle size={24} />} title="Masuk dulu" action={<Button onClick={() => navigate('/login')}>Masuk</Button>} /></div>;
  }

  return (
    <div className="pb-24 md:pb-12 max-w-2xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-4">Chat</h1>
      {error ? (
        <EmptyState icon={<MessageCircle size={24} />} title="Gagal memuat chat" description="Periksa koneksi Anda." action={<Button onClick={fetchConvs}>Coba lagi</Button>} />
      ) : loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-card border border-border skeleton" />)}</div>
      ) : convs.length === 0 ? (
        <EmptyState icon={<MessageCircle size={24} />} title="Belum ada chat" description="Mulai chat dengan penjual dari halaman produk." />
      ) : (
        <div className="space-y-2">
          {convs.map((c) => {
            const unread = profile?.role === 'seller' ? c.seller_unread : c.buyer_unread;
            const name = profile?.role === 'seller' ? c.buyer?.name : profile?.role === 'courier' ? c.buyer?.name : c.store?.name;
            const isCourierChat = !!c.courier_id;
            return (
              <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)} className="w-full flex items-center gap-3 p-3 rounded-card border border-border hover:border-foreground/20 transition-colors text-left">
                <div className="w-11 h-11 rounded-pill bg-muted flex items-center justify-center shrink-0">
                  {isCourierChat ? <Bike size={18} className="text-foreground/40" /> : c.store?.logo_url ? <img src={c.store.logo_url} alt="" className="w-full h-full rounded-pill object-cover" /> : <Store size={18} className="text-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{name}</p>
                    <span className="text-[11px] text-foreground/40 shrink-0">{timeAgo(c.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-foreground/50 truncate">{c.last_message || 'Mulai chat'}</p>
                </div>
                {unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-pill bg-primary text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChatConversationPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { navigate, back } = useRouter();
  const toast = useToast();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<any>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    let channel: any;
    let presenceChannel: any;

    (async () => {
      const timeout = setTimeout(() => { if (!cancelled) setLoadError(true); }, 10000);
      try {
        const { data: c, error: cErr } = await supabase.from('conversations').select('*, store:stores(*), buyer:profiles!conversations_buyer_id_fkey(*)').eq('id', id).maybeSingle();
        if (cErr) throw cErr;
        if (cancelled) return;
        setConv(c as Conversation | null);
        const { data: msgs, error: mErr } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
        if (mErr) throw mErr;
        if (cancelled) return;
        setMessages((msgs || []) as Message[]);
      // mark read
      if (profile?.role === 'seller') {
        await supabase.from('conversations').update({ seller_unread: 0 }).eq('id', id);
      } else {
        await supabase.from('conversations').update({ buyer_unread: 0 }).eq('id', id);
      }

      if (cancelled) return;

      // Realtime channel for new messages
      channel = supabase.channel(`chat-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((m) => {
            if (m.some((msg) => msg.id === newMsg.id)) return m;
            return [...m, newMsg];
          });
          if (newMsg.sender_id !== user.id) {
            if (profile?.role === 'seller') supabase.from('conversations').update({ seller_unread: 0 }).eq('id', id);
            else supabase.from('conversations').update({ buyer_unread: 0 }).eq('id', id);
            setOtherTyping(false);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, (payload) => {
          const updated = payload.new as any;
          if (updated.last_message === '__typing__' && updated.last_message_at) {
            const age = Date.now() - new Date(updated.last_message_at).getTime();
            if (age < 3000) setOtherTyping(true);
          } else {
            setOtherTyping(false);
          }
        })
        .subscribe();

      if (cancelled) return;

      // Presence channel for online status + typing
      presenceChannel = supabase.channel(`presence-${id}`, {
        config: { presence: { key: user.id } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const others = Object.keys(state).filter((k) => k !== user.id);
          setOtherOnline(others.length > 0);
        })
        .on('presence', { event: 'join' }, () => {
          setOtherOnline(true);
        })
        .on('presence', { event: 'leave' }, () => {
          const state = presenceChannel.presenceState();
          const others = Object.keys(state).filter((k) => k !== user.id);
          setOtherOnline(others.length > 0);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });
      } catch (e) {
        if (!cancelled) setLoadError(true);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, otherTyping]);

  const send = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    const body = input.trim();
    setInput('');
    isTypingRef.current = false;
    const { data: msg, error } = await supabase.from('messages').insert({
      conversation_id: id, sender_id: user.id, body,
    }).select().maybeSingle();
    if (!error && msg) {
      // Optimistic: add own message immediately
      setMessages((m) => m.some((x) => x.id === msg.id) ? m : [...m, msg as Message]);
      await supabase.from('conversations').update({
        last_message: body, last_message_at: new Date().toISOString(),
        buyer_unread: profile?.role === 'seller' ? (conv?.buyer_unread || 0) + 1 : 0,
        seller_unread: profile?.role === 'buyer' || profile?.role === 'courier' ? (conv?.seller_unread || 0) + 1 : 0,
      }).eq('id', id);
    } else {
      toast('Gagal kirim pesan', 'error');
    }
    setSending(false);
  };

  const onType = (val: string) => {
    setInput(val);
    if (!user) return;
    // Send typing indicator via conversations table
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      supabase.from('conversations').update({
        last_message: '__typing__',
        last_message_at: new Date().toISOString(),
      }).eq('id', id).then();
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      if (val.trim()) {
        supabase.from('conversations').update({
          last_message: val.trim(),
          last_message_at: new Date().toISOString(),
        }).eq('id', id).then();
      }
    }, 1500);
  };

  const sendImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `chat/${Date.now()}`);
      const { data: msg, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: user.id, image_url: url }).select().maybeSingle();
      if (!error && msg) {
        setMessages((m) => m.some((x) => x.id === msg.id) ? m : [...m, msg as Message]);
        await supabase.from('conversations').update({ last_message: '[Foto]', last_message_at: new Date().toISOString() }).eq('id', id);
      } else {
        toast('Gagal kirim foto', 'error');
      }
    } catch { toast('Gagal unggah foto', 'error'); }
    setUploading(false);
  };

  if (loadError) return <div className="py-20 text-center"><p className="text-foreground/50 mb-3">Gagal memuat chat</p><Button onClick={() => window.location.reload()}>Coba lagi</Button></div>;
  if (!conv) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;
  const otherName = profile?.role === 'seller' ? conv.buyer?.name : conv.store?.name;
  const isCourierChat = !!conv.courier_id;

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-border glass-nav sticky top-0 z-10">
        <button onClick={back} className="text-foreground/60 hover:text-foreground"><ArrowLeft size={20} /></button>
        <div className="w-9 h-9 rounded-pill bg-muted flex items-center justify-center">
          {isCourierChat ? <Bike size={16} className="text-foreground/40" /> : conv.store?.logo_url ? <img src={conv.store.logo_url} alt="" className="w-full h-full rounded-pill object-cover" /> : <Store size={16} className="text-foreground/40" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{otherName}</p>
          <p className={cn('text-[11px] flex items-center gap-1', otherOnline ? 'text-success' : 'text-foreground/40')}>
            <span className={cn('w-1.5 h-1.5 rounded-pill', otherOnline ? 'bg-success' : 'bg-foreground/30')} />
            {otherOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const prev = messages[i - 1];
          const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
          return (
            <div key={m.id}>
              {showTime && <p className="text-center text-[11px] text-foreground/30 my-2">{timeAgo(m.created_at)}</p>}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div className={cn('max-w-[75%] rounded-card px-3 py-2', mine ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
                  {m.image_url ? (
                    <img src={m.image_url} alt="" className="rounded-btn max-w-[200px] max-h-[200px] object-cover" />
                  ) : (
                    <p className="text-sm font-medium whitespace-pre-wrap">{m.body}</p>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-card px-3 py-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-pill bg-foreground/40" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border glass-nav">
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-10 h-10 flex items-center justify-center rounded-btn border border-border text-foreground/60 hover:border-primary">
            <ImageIcon size={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
          <input
            value={input}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ketik pesan..."
            className="flex-1 h-10 rounded-btn border border-border bg-white px-4 text-sm font-medium focus:outline-none focus:border-primary"
          />
          <button onClick={send} disabled={sending || !input.trim()} className="w-10 h-10 flex items-center justify-center rounded-btn bg-primary text-white disabled:opacity-50">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
