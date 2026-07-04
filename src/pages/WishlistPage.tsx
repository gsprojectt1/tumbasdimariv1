import { useWishlist } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Heart } from 'lucide-react';

export function WishlistPage() {
  const { user } = useAuth();
  const { data: wishlist, isLoading } = useWishlist();
  const { navigate } = useRouter();
  const toast = useToast();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState icon={<Heart size={24} />} title="Masuk dulu" description="Login untuk melihat wishlist." action={<Button onClick={() => navigate('/login')}>Masuk</Button>} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold tracking-tight mb-4">Wishlist</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const products = (wishlist || []).map((w) => w.product).filter(Boolean) as any[];

  return (
    <div className="pb-24 md:pb-12 max-w-6xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-4">Wishlist ({products.length})</h1>
      {products.length === 0 ? (
        <EmptyState icon={<Heart size={24} />} title="Wishlist kosong" description="Simpan produk favoritmu di sini." action={<Button onClick={() => navigate('/')}>Jelajahi produk</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
