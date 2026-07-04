import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Heart, MessageCircle, ShoppingCart, User, Bell } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useUnreadCounts } from '../lib/hooks';
import { cn } from '../lib/utils';

const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Cari', path: '/search' },
  { icon: Heart, label: 'Wishlist', path: '/wishlist' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: ShoppingCart, label: 'Keranjang', path: '/cart' },
  { icon: User, label: 'Profil', path: '/profile' },
];

export function BottomNav() {
  const { path, navigate } = useRouter();
  const { user } = useAuth();
  const { unreadChats, unreadNotifs, cartCount } = useUnreadCounts();
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(lastScroll === 0 || y < lastScroll || y < 100);
      setLastScroll(y);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScroll]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 md:hidden"
        >
          <div className="glass-nav flex items-center gap-1 rounded-pill border border-border px-2 py-2 shadow-nav">
            {items.map((item) => {
              const active = path === item.path || (item.path !== '/' && path.startsWith(item.path));
              const badge =
                item.path === '/chat' ? unreadChats :
                item.path === '/cart' ? cartCount : 0;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center w-11 h-11 rounded-pill transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-pill bg-accent-soft"
                      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                    />
                  )}
                  <item.icon
                    size={20}
                    className={cn('relative z-10 transition-colors', active ? 'text-primary' : 'text-foreground/50')}
                  />
                  {badge > 0 && (
                    <span className="absolute top-1 right-1.5 z-20 min-w-[16px] h-4 px-1 rounded-pill bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

export function TopBar({ title, showBack, right }: { title: string; showBack?: boolean; right?: React.ReactNode }) {
  const { back } = useRouter();
  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-border">
      <div className="flex items-center gap-3 px-4 h-14 max-w-5xl mx-auto">
        {showBack && (
          <button onClick={back} className="text-foreground hover:bg-muted rounded-btn p-1.5 -ml-1.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <h1 className="text-base font-bold tracking-tight flex-1 truncate">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function DesktopNav() {
  const { path, navigate } = useRouter();
  const { user, profile } = useAuth();
  const { unreadChats, unreadNotifs, cartCount } = useUnreadCounts();
  const [search, setSearch] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 glass-nav border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center gap-6 px-6 h-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-btn bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-lg font-bold tracking-tightest">Tumbas</span>
        </button>
        <form onSubmit={submitSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk, brand, kategori..."
              className="w-full h-10 rounded-btn border border-border bg-white pl-10 pr-4 text-sm font-medium placeholder:text-foreground/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </form>
        <nav className="flex items-center gap-1">
          <NavIcon icon={Bell} path="/notifications" badge={unreadNotifs} active={path === '/notifications'} navigate={navigate} />
          <NavIcon icon={MessageCircle} path="/chat" badge={unreadChats} active={path === '/chat'} navigate={navigate} />
          <NavIcon icon={Heart} path="/wishlist" active={path === '/wishlist'} navigate={navigate} />
          <NavIcon icon={ShoppingCart} path="/cart" badge={cartCount} active={path === '/cart'} navigate={navigate} />
          {user ? (
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-pill bg-muted overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-foreground/50">
                    {profile?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="ml-2 h-10 px-4 rounded-btn bg-primary text-white text-sm font-semibold">
              Masuk
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavIcon({ icon: Icon, path, badge, active, navigate }: any) {
  return (
    <button onClick={() => navigate(path)} className="relative w-10 h-10 flex items-center justify-center rounded-btn hover:bg-muted transition-colors">
      <Icon size={20} className={active ? 'text-primary' : 'text-foreground/60'} />
      {badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-pill bg-primary text-white text-[9px] font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
