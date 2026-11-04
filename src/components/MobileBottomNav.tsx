import React from 'react';
import { useStore } from '../context/StoreContext';
import { Home, Layers, Heart, ShoppingBag, ShieldCheck, ArrowLeftRight } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    cartCount,
    setCartOpen,
    wishlist,
    setWishlistOpen,
    setSelectedCategory,
    compareList,
    setCompareOpen,
    isAdminLoggedIn
  } = useStore();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-2">
      <div className="flex items-center justify-around">
        
        {/* Home */}
        <button
          onClick={() => {
            if (location.pathname.startsWith('/p/')) { location.href = '/'; return; }
            setCurrentView('store');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            currentView === 'store' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        {/* Categories */}
        <button
          onClick={() => {
            setCurrentView('store');
            const el = document.getElementById('appliances-catalog-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">الأقسام</span>
        </button>

        {/* Wishlist */}
        <button
          onClick={() => setWishlistOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-500 hover:text-slate-800 transition-colors relative"
        >
          <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
          {wishlist.length > 0 && (
            <span className="absolute top-0 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
          <span className="text-[10px]">المفضلة</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setCartOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-500 hover:text-slate-800 transition-colors relative"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">السلة</span>
        </button>

        {/* 5th Button: Compare for Customer OR Admin if logged in */}
        {isAdminLoggedIn ? (
          <button
            onClick={() => setCurrentView(currentView === 'admin' ? 'store' : 'admin')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
              currentView === 'admin' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 ${currentView === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="text-[10px]">لوحة الأدمن</span>
          </button>
        ) : (
          <button
            onClick={() => setCompareOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-500 hover:text-slate-800 transition-colors relative"
          >
            <ArrowLeftRight className="w-5 h-5 text-slate-600" />
            {compareList.length > 0 && (
              <span className="absolute top-0 right-1.5 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareList.length}
              </span>
            )}
            <span className="text-[10px]">المقارنة</span>
          </button>
        )}
      </div>
    </div>
  );
};
