import React from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  Heart, 
  ShoppingBag, 
  Scale, 
  Eye, 
  Star, 
  Zap, 
  Check, 
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { 
    addToCart, 
    cart, 
    isWishlisted, 
    toggleWishlist, 
    isInCompare, 
    toggleCompare,
    setSelectedProduct 
  } = useStore();

  const isCarted = cart.some(item => item.product.id === product.id);
  const cartItem = cart.find(item => item.product.id === product.id);
  const isWished = isWishlisted(product.id);
  const inCompare = isInCompare(product.id);

  // Discount calculation
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Top Media & Badges Container */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden cursor-pointer">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onClick={() => setSelectedProduct(product)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow-sm">
              خصم {discountPercent}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
              جديد وصل حديثاً
            </span>
          )}
          {product.wattage && (
            <span className="bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <Zap className="w-3 h-3 text-amber-400" />
              {product.wattage}
            </span>
          )}
        </div>

        {/* Capacity / Size Tag */}
        {product.capacity && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/60 shadow-xs">
              {product.capacity}
            </span>
          </div>
        )}

        {/* Quick action buttons (Wishlist, Compare, Quick View) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
              isWished 
                ? 'bg-rose-500 text-white' 
                : 'bg-white/90 hover:bg-white text-slate-600 hover:text-rose-500'
            }`}
            title={isWished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            aria-label="المفضلة"
          >
            <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
          </button>

          {/* Compare Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
              inCompare
                ? 'bg-amber-500 text-white'
                : 'bg-white/90 hover:bg-white text-slate-600 hover:text-amber-600'
            }`}
            title="مقارنة المواصفات"
            aria-label="مقارنة"
          >
            <Scale className="w-4 h-4" />
          </button>

          {/* Quick View Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProduct(product);
            }}
            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-md"
            title="معاينة سريعة"
            aria-label="معاينة سريعة"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Stock warning pill */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
              نفد من المخزون حالياً
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        
        <div>
          {/* Brand & 5-Star Average Rating */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
              {product.brand}
            </span>
            <div className="flex items-center gap-1 font-mono text-amber-500 font-bold" title={`متوسط التقييم: ${product.rating.toFixed(1)} من 5 نجوم (${product.reviewsCount} تقييم)`}>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.round(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-black text-slate-800 ml-0.5">{product.rating.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => setSelectedProduct(product)}
            className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Warranty tag */}
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{product.warranty}</span>
          </p>
        </div>

        {/* Price & Action Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          
          {/* Price container */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {product.price.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-600">ج.م</span>
            </div>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through font-mono block">
                {product.originalPrice!.toLocaleString()} ج.م
              </span>
            )}
          </div>

          {/* Add to cart action */}
          {isOutOfStock ? (
            <button
              disabled
              className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
            >
              غير متوفر
            </button>
          ) : (
            <button
              onClick={() => addToCart(product, 1)}
              className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                isCarted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold hover:shadow-md'
              }`}
            >
              {isCarted ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>بالسلة ({cartItem?.quantity})</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>أضف للسلة</span>
                </>
              )}
            </button>
          )}

        </div>

        {/* Low Stock Indicator */}
        {isLowStock && (
          <div className="text-[10px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
            <span>سارع بالشراء! متبقي فقط {product.stock} قطع في المخزن</span>
          </div>
        )}

      </div>
    </div>
  );
};
