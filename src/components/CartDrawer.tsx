import { useScrollLock } from './fx/useScrollLock';
import React, { useState } from 'react';
import { thumb } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowLeft, 
  Tag, 
  Truck, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { 
    cartOpen, 
    setCartOpen, 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    cartTotal, 
    cartCount,
    setCurrentView,
    settings,
  } = useStore();

  useScrollLock(cartOpen, () => setCartOpen(false));
  if (!cartOpen) return null;

  // Same rules as the server (dashboard → store settings)
  const FREE_SHIPPING_THRESHOLD = Number(settings.free_shipping_over) || 0;
  const progressToFreeShipping = FREE_SHIPPING_THRESHOLD ? Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100) : 0;
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD ? Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal) : 0;

  const discountAmount = 0;
  const shippingFee = cartTotal === 0 || (FREE_SHIPPING_THRESHOLD > 0 && cartTotal >= FREE_SHIPPING_THRESHOLD) ? 0 : Number(settings.shipping_fee) || 0;
  const finalTotal = Math.max(0, cartTotal + shippingFee);

  const handleProceedToCheckout = () => {
    setCartOpen(false);
    setCurrentView('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <button type="button" tabIndex={-1} aria-label="إغلاق"
        className="absolute inset-0 w-full h-full cursor-pointer bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setCartOpen(false)}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col text-right">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                سلة التسوق ({cartCount})
              </h2>
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress (only when the store offers it) */}
          {FREE_SHIPPING_THRESHOLD > 0 && cart.length > 0 && (
          <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-100 text-xs text-amber-900">
            {remainingForFreeShipping > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-700" />
                    أضف بـ <strong className="font-mono">{remainingForFreeShipping.toLocaleString()} ج.م</strong> إضافية للشحن المجاني!
                  </span>
                  <span>%{Math.round(progressToFreeShipping)}</span>
                </div>
                <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-600 rounded-full transition-all duration-300" 
                    style={{ width: `${progressToFreeShipping}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>طلبك عليه شحن مجاني</span>
              </div>
            )}
          </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">السلة فارغة حالياً</h3>
                  <p className="text-xs text-slate-500 mt-1">تصفح أحدث الأجهزة المنزلية والكهربائية وأضف ما يناسبك</p>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 shadow-sm"
                >
                  استكشف الأجهزة الآن
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.key || item.product.id}
                  className="flex gap-3 p-3 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white shadow-xs"
                >
                  <img
                    src={thumb(item.product.image)}
                    alt={item.product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.key || item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {item.product.brand}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {(item.product.price * item.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">ج.م</span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.key || item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.key || item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white text-slate-700"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout button */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              
              {/* Price Calculations */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>إجمالي المنتجات:</span>
                  <span className="font-mono font-bold">{cartTotal.toLocaleString()} ج.م</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>خصم الكوبون:</span>
                    <span className="font-mono">- {discountAmount.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>تكلفة الشحن:</span>
                  <span className="font-mono font-bold">
                    {shippingFee === 0 ? 'مجاناً' : `${shippingFee} ج.م`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>المبلغ الإجمالي:</span>
                  <span className="font-mono text-amber-600">{finalTotal.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Proceed to checkout CTA */}
              <button
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>متابعة إتمام الطلب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
