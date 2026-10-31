import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShoppingBag, 
  Heart, 
  Scale, 
  Search, 
  ShieldCheck, 
  SlidersHorizontal, 
  Home, 
  PhoneCall, 
  X,
  Menu,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    cartCount, 
    cartTotal,
    setCartOpen, 
    wishlist, 
    setWishlistOpen,
    compareList,
    setCompareOpen,
    searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    setSelectedCategory,
    currentAdmin,
    isAdminLoggedIn
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top micro-bar for guarantees & quick contact */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              ضمان معتمد حتى 3 سنوات على جميع الأجهزة المنزلية
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">شحن سريع مجاني للطلبات فوق 5000 ج.م</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="tel:19999" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5" />
              خدمة العملاء: 19999
            </a>
            <span>|</span>
            <span>الدفع عند الاستلام متاح</span>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3 sm:gap-6">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('store');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-2.5 text-right group focus:outline-hidden"
            >
              <img src="/logo.png" alt="HOMEX" className="h-9 sm:h-11 w-auto group-hover:scale-105 transition-transform" />
              <p className="text-[11px] text-slate-500 hidden md:block border-r border-slate-200 pr-2.5">
                كاتيل • مكواة • خلاط • كبة • قلايات ومكانس
              </p>
            </button>
          </div>

          {/* Search bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-2 relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="ابحث عن كاتيل، شاشة 55 بوصة، خلاط، قلاية هوائية..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentView !== 'store') setCurrentView('store');
                }}
                className="w-full bg-slate-100/90 hover:bg-slate-100 text-slate-800 placeholder-slate-400 text-sm rounded-full pl-10 pr-12 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-3 focus:ring-amber-500/15 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Mobile Search Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-hidden"
              aria-label="البحث"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Compare items button */}
            <button
              onClick={() => setCompareOpen(true)}
              className="relative p-2 sm:px-3 sm:py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 focus:outline-hidden"
              title="مقارنة الأجهزة"
            >
              <Scale className="w-5 h-5 text-slate-600" />
              <span className="hidden xl:inline text-xs font-semibold">المقارنة</span>
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:top-1 sm:right-1 bg-amber-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => setWishlistOpen(true)}
              className="relative p-2 sm:px-3 sm:py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 focus:outline-hidden"
              title="المفضلة"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-600'}`} />
              <span className="hidden xl:inline text-xs font-semibold">المفضلة</span>
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:top-1 sm:right-1 bg-rose-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 transition-all flex items-center gap-2 focus:outline-hidden group shadow-xs"
              title="سلة التسوق"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-right hidden sm:block">
                <span className="block text-[11px] text-amber-700/80 leading-none">السلة</span>
                <span className="text-xs font-bold text-amber-950 font-mono">
                  {cartTotal > 0 ? `${cartTotal.toLocaleString()} ج.م` : 'فارغة'}
                </span>
              </div>
            </button>

            {/* Admin Dashboard Switcher Button (ONLY visible if admin is logged in) */}
            {isAdminLoggedIn ? (
              <button
                onClick={() => {
                  if (currentView === 'admin') {
                    setCurrentView('store');
                  } else {
                    setCurrentView('admin');
                  }
                }}
                className={`p-1.5 sm:px-3 sm:py-2 rounded-xl border transition-all flex items-center gap-2 focus:outline-hidden ${
                  currentView === 'admin'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                }`}
                title="لوحة تحكم الأدمن"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                  {currentAdmin?.avatar ? (
                    <img 
                      src={currentAdmin.avatar} 
                      alt={currentAdmin.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="text-right hidden sm:block leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">
                      {currentView === 'admin' ? 'الرجوع للمتجر' : 'لوحة الأدمن'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate max-w-[90px]">
                    {currentAdmin?.name || 'الأدمن'}
                  </span>
                </div>
              </button>
            ) : null}

            {/* Mobile Menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search expanded input */}
        {mobileSearchOpen && (
          <div className="lg:hidden pb-3 pt-1">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن أجهزة: كاتيل، شاشة، خلاط، قلاية..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentView !== 'store') setCurrentView('store');
                }}
                autoFocus
                className="w-full bg-slate-100 text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-9 pr-11 py-2.5 border border-slate-300 focus:outline-hidden focus:border-amber-500 focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categories Bar (Sub-navigation) */}
        {currentView === 'store' && (
          <div className="border-t border-slate-100 py-2.5 flex items-center justify-between overflow-x-auto no-scrollbar gap-2 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              جميع الأجهزة
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          {isAdminLoggedIn && (
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
              <div className="flex items-center gap-2">
                <img 
                  src={currentAdmin?.avatar} 
                  alt="Admin" 
                  className="w-9 h-9 rounded-full object-cover border border-slate-300" 
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentAdmin?.name}</p>
                  <p className="text-[10px] text-slate-500">{currentAdmin?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCurrentView(currentView === 'admin' ? 'store' : 'admin');
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold px-3 py-1.5 bg-slate-900 text-white rounded-lg"
              >
                {currentView === 'admin' ? 'عرض المتجر' : 'لوحة الأدمن'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-medium">
            <button
              onClick={() => {
                setCompareOpen(true);
                setMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Scale className="w-4 h-4 text-slate-600" />
              <span>المقارنة ({compareList.length})</span>
            </button>
            <button
              onClick={() => {
                setWishlistOpen(true);
                setMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>المفضلة ({wishlist.length})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
