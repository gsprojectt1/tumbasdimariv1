import { motion } from 'framer-motion';
import { Star, MapPin } from 'lucide-react';
import type { Product } from '../lib/types';
import { formatRupiah, formatNumber, discountPercent, cn } from '../lib/utils';
import { useRouter } from '../lib/router';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { navigate } = useRouter();
  const discount = discountPercent(product.price, product.original_price);
  const img = product.images?.[0] || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/product/${product.id}`)}
      className="group cursor-pointer rounded-card border border-border bg-white overflow-hidden transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-pill bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
        {product.is_flash_sale && (
          <span className="absolute top-2 right-2 rounded-pill bg-error px-2 py-0.5 text-[10px] font-bold text-white">
            FLASH
          </span>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-snug min-h-[2rem]">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-foreground tracking-tight">
            {formatRupiah(product.price)}
          </span>
        </div>
        {discount > 0 && (
          <span className="text-[11px] text-foreground/40 line-through">
            {formatRupiah(product.original_price)}
          </span>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <Star size={11} className="fill-warning text-warning" />
            <span className="text-[11px] font-medium text-foreground/60">
              {product.rating > 0 ? product.rating.toFixed(1) : 'Baru'}
            </span>
          </div>
          <span className="text-[11px] text-foreground/40">
            {product.sold_count > 0 ? `${formatNumber(product.sold_count)} terjual` : ''}
          </span>
        </div>
        {(product.city || (product as any).store?.city) && (
          <div className="flex items-center gap-1 pt-0.5">
            <MapPin size={10} className="text-foreground/30" />
            <span className="text-[11px] text-foreground/40">{product.city || (product as any).store?.city}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3', className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}
