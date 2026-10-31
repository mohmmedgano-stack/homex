import React from 'react';
import { useStore } from '../context/StoreContext';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';

export const WishlistDrawer: React.FC = () => {
  const { 
    wishlistOpen, 
    setWishlistOpen, 
    wishlist, 
    products, 
    toggleWishlist, 
    addToCart,
    setSelectedProduct 
  } = useStore();

  if (!wishlistOpen) return null;

  const wishedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-right">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                المنتجات المفضلة ({wishedProducts.length})
              </h2>
            </div>
            <button
              onClick={() => setWishlistOpen(false)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {wishedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-400 flex items-center justify-center">
                  <Heart className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">قائمة المفضلة فارغة</h3>
                  <p className="text-xs text-slate-500 mt-1">اضغط على أيقونة القلب على أي جهاز لحفظه والرجوع له لاحقاً</p>
                </div>
                <button
                  onClick={() => setWishlistOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800"
                >
                  تصفح المنتجات الآن
                </button>
              </div>
            ) : (
              wishedProducts.map((product) => (
                <div 
                  key={product.id}
                  className="flex gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 shadow-xs"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    onClick={() => {
                      setSelectedProduct(product);
                      setWishlistOpen(false);
                    }}
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 
                          onClick={() => {
                            setSelectedProduct(product);
                            setWishlistOpen(false);
                          }}
                          className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-amber-600"
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="إزالة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {product.brand}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {product.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">ج.م</span>
                      </div>

                      <button
                        onClick={() => addToCart(product, 1)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>نقل للسلة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
