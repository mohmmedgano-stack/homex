import React from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Heart, Star, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, cart, isWishlisted, toggleWishlist, setSelectedProduct } = useStore();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const isWished = isWishlisted(product.id);

  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const brand = product.brand.replace(/\s*\(.*?\)\s*/g, '');

  return (
    <article className="group flex flex-col">
      {/* Shelf */}
      <div className="relative aspect-[4/5] bg-shelf rounded-2xl overflow-hidden">
        <button
          onClick={() => setSelectedProduct(product)}
          className="absolute inset-0 w-full h-full"
          aria-label={`عرض تفاصيل ${product.name}`}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.03] ${
              isOutOfStock ? 'opacity-50 grayscale' : ''
            }`}
          />
        </button>

        {hasDiscount && !isOutOfStock && (
          <span dir="ltr" className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-sale text-white text-xs font-semibold px-2 py-1 rounded-md pointer-events-none">
            −{discountPercent}%
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-3 right-3 bg-ink text-white text-xs font-semibold px-2 py-1 rounded-md pointer-events-none">
            نفد المخزون
          </span>
        )}

        <button
          onClick={() => toggleWishlist(product.id)}
          className={`absolute top-2 left-2 sm:top-3 sm:left-3 w-9 h-9 rounded-full flex items-center justify-center bg-white transition-colors ${
            isWished ? 'text-sale' : 'text-steel hover:text-ink'
          }`}
          aria-pressed={isWished}
          aria-label={isWished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Heart className={`w-[18px] h-[18px] ${isWished ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Details */}
      <div className="pt-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-steel">
          <span>{brand}</span>
          {product.reviewsCount > 0 && (
            <span className="flex items-center gap-1" title={`${product.reviewsCount} تقييم`}>
              <Star className="w-3.5 h-3.5 fill-gold text-gold" />
              <span className="text-ink font-medium">{product.rating.toFixed(1)}</span>
              <span>({product.reviewsCount})</span>
            </span>
          )}
        </div>

        <h3 className="mt-1.5 text-sm sm:text-[15px] leading-6 font-medium text-ink line-clamp-2 min-h-12">
          <button onClick={() => setSelectedProduct(product)} className="text-right hover:underline underline-offset-4 decoration-line">
            {product.name}
          </button>
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="price text-lg sm:text-xl font-bold text-ink whitespace-nowrap">
            {product.price.toLocaleString('en-US')}
            <span className="text-xs sm:text-sm font-medium mr-1">ج.م</span>
          </span>
          {hasDiscount && (
            <span className="price text-xs sm:text-sm text-steel line-through whitespace-nowrap">{product.originalPrice!.toLocaleString('en-US')}</span>
          )}
        </div>

        <p className={`text-xs mt-1 min-h-4 line-clamp-1 ${isLowStock ? 'text-sale' : 'text-steel'}`}>
          {isOutOfStock ? 'غير متاح حالياً' : isLowStock ? `باقي ${product.stock} قطع بس` : product.warranty}
        </p>

        <div className="mt-auto pt-3">
          {isOutOfStock ? (
            <button disabled className="w-full h-11 rounded-lg bg-shelf text-steel text-sm font-medium cursor-not-allowed">
              غير متاح
            </button>
          ) : cartItem ? (
            <button
              onClick={() => addToCart(product, 1)}
              className="w-full h-11 rounded-lg border border-ink text-ink text-sm font-semibold flex items-center justify-center gap-2 hover:bg-shelf transition-colors"
            >
              <Check className="w-4 h-4" />
              في السلة ({cartItem.quantity})
            </button>
          ) : (
            <button
              onClick={() => addToCart(product, 1)}
              className="w-full h-11 rounded-lg bg-ink text-white text-[13px] sm:text-sm font-semibold hover:bg-ink-soft transition-colors"
            >
              أضف للسلة
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
