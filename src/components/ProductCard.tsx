import React from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Heart, Star, ShoppingCart, Check, Scale } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  compact?: boolean; // used in horizontal rails
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact }) => {
  const { addToCart, cart, isWishlisted, toggleWishlist, isInCompare, toggleCompare, setSelectedProduct } = useStore();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const isWished = isWishlisted(product.id);
  const inCompare = isInCompare(product.id);

  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const saving = hasDiscount ? product.originalPrice! - product.price : 0;
  const pct = hasDiscount ? Math.round((saving / product.originalPrice!) * 100) : 0;
  const isOut = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= 5;
  const brand = product.brand.replace(/\s*\(.*?\)\s*/g, '');

  return (
    <article className="group relative bg-white rounded-xl border border-line hover:border-gold hover:shadow-lg transition flex flex-col overflow-hidden h-full">
      {/* Image */}
      <div className="relative aspect-square bg-white overflow-hidden">
        <button onClick={() => setSelectedProduct(product)} className="absolute inset-0" aria-label={`تفاصيل ${product.name}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isOut ? 'opacity-40 grayscale' : ''}`}
          />
        </button>

        <div className="absolute top-2 right-2 flex flex-col items-start gap-1 pointer-events-none">
          {hasDiscount && !isOut && (
            <span className="bg-sale text-white text-xs font-extrabold px-2 py-0.5 rounded-md">خصم {pct}%</span>
          )}
          {product.isNewArrival && !isOut && (
            <span className="bg-ink text-white text-[11px] font-bold px-2 py-0.5 rounded-md">جديد</span>
          )}
          {isOut && <span className="bg-steel text-white text-xs font-bold px-2 py-0.5 rounded-md">نفد</span>}
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`w-8 h-8 rounded-full bg-white shadow flex items-center justify-center ${isWished ? 'text-sale' : 'text-steel hover:text-sale'}`}
            aria-pressed={isWished}
            aria-label={isWished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => toggleCompare(product)}
            className={`hidden sm:flex w-8 h-8 rounded-full bg-white shadow items-center justify-center ${inCompare ? 'text-gold-deep' : 'text-steel hover:text-ink'}`}
            aria-pressed={inCompare}
            aria-label="مقارنة"
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 sm:px-3.5 pt-2.5 pb-3 flex-1 flex flex-col border-t border-line">
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          <span className="font-bold text-gold-deep truncate">{brand}</span>
          {product.reviewsCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0 text-steel">
              <Star className="w-3.5 h-3.5 fill-gold text-gold" />
              <span className="font-bold text-ink">{product.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        <h3 className={`mt-1 font-bold text-ink leading-snug line-clamp-2 ${compact ? 'text-[13px] min-h-[2.5rem]' : 'text-[13px] sm:text-[15px] min-h-[2.5rem] sm:min-h-[2.75rem]'}`}>
          <button onClick={() => setSelectedProduct(product)} className="text-right hover:text-gold-deep">
            {product.name}
          </button>
        </h3>

        <div className="mt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`price font-black whitespace-nowrap ${hasDiscount ? 'text-sale' : 'text-ink'} text-lg sm:text-xl`}>
              {product.price.toLocaleString('en-US')} <span className="text-xs sm:text-sm font-bold">ج.م</span>
            </span>
            {hasDiscount && (
              <span className="price text-xs sm:text-sm text-steel line-through whitespace-nowrap">{product.originalPrice!.toLocaleString('en-US')}</span>
            )}
          </div>
          <p className={`text-[11px] sm:text-xs font-bold mt-0.5 min-h-4 ${isLow ? 'text-sale' : 'text-save'}`}>
            {isOut ? '' : isLow ? `باقي ${product.stock} قطع بس` : hasDiscount ? `وفّر ${saving.toLocaleString('en-US')} ج.م` : 'متوفر'}
          </p>
        </div>

        <div className="mt-auto pt-2.5">
          {isOut ? (
            <button disabled className="w-full h-10 rounded-lg bg-shelf text-steel text-sm font-bold cursor-not-allowed">
              غير متوفر
            </button>
          ) : cartItem ? (
            <button
              onClick={() => addToCart(product, 1)}
              className="w-full h-10 rounded-lg bg-save text-white text-[13px] sm:text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> في السلة ({cartItem.quantity})
            </button>
          ) : (
            <button
              onClick={() => addToCart(product, 1)}
              className="btn-gold w-full h-10 rounded-lg text-[13px] sm:text-sm font-extrabold flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" /> أضف للسلة
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
