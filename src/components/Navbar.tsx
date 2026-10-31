import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_INFO } from '../config/store';
import { ShoppingBag, Heart, Scale, Search, ShieldCheck, X, Menu, Phone } from 'lucide-react';

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
    isAdminLoggedIn,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const onSearch = (value: string) => {
    setSearchQuery(value);
    if (currentView !== 'store') setCurrentView('store');
  };

  const iconBtn =
    'relative w-10 h-10 rounded-lg flex items-center justify-center text-ink hover:bg-shelf transition-colors';
  const badge =
    'absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[11px] font-semibold flex items-center justify-center';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line">
      {/* Service line */}
      <div className="bg-ink text-white/80 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
          <span className="truncate">الدفع عند الاستلام مع معاينة الجهاز قبل الدفع</span>
          {STORE_INFO.phone && (
            <a href={`tel:${STORE_INFO.phone}`} className="hidden sm:flex items-center gap-1.5 hover:text-white shrink-0">
              <Phone className="w-3.5 h-3.5" />
              <span dir="ltr">{STORE_INFO.phone}</span>
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-4 lg:gap-8">
          <button
            onClick={() => {
              setCurrentView('store');
              setSelectedCategory('all');
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="shrink-0"
            aria-label="HOMEX، الصفحة الرئيسية"
          >
            <img src="/logo.png" alt="HOMEX" className="h-8 sm:h-10 w-auto" />
          </button>

          {/* Search (desktop) */}
          <div className="hidden lg:block flex-1 max-w-xl">
            <label className="relative block">
              <span className="sr-only">ابحث في المنتجات</span>
              <Search className="w-[18px] h-[18px] text-steel absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="ابحث عن كاتيل، مكواة، خلاط..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full h-11 bg-shelf text-ink placeholder-steel/80 text-sm rounded-lg pr-11 pl-10 border border-transparent focus:outline-hidden focus:bg-white focus:border-ink transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel hover:text-ink p-1"
                  aria-label="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className={`${iconBtn} lg:hidden`} aria-label="البحث">
              <Search className="w-5 h-5" />
            </button>

            <button onClick={() => setCompareOpen(true)} className={`${iconBtn} hidden sm:flex`} aria-label="المقارنة">
              <Scale className="w-5 h-5" />
              {compareList.length > 0 && <span className={badge}>{compareList.length}</span>}
            </button>

            <button onClick={() => setWishlistOpen(true)} className={`${iconBtn} hidden sm:flex`} aria-label="المفضلة">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && <span className={badge}>{wishlist.length}</span>}
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="h-10 pr-3 pl-3.5 rounded-lg bg-ink text-white flex items-center gap-2 hover:bg-ink-soft transition-colors"
              aria-label="سلة التسوق"
            >
              <span className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -left-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[11px] font-semibold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="price text-sm font-semibold hidden sm:inline">
                {cartTotal > 0 ? `${cartTotal.toLocaleString('en-US')} ج.م` : 'السلة'}
              </span>
            </button>

            {isAdminLoggedIn && (
              <button
                onClick={() => setCurrentView(currentView === 'admin' ? 'store' : 'admin')}
                className="hidden sm:flex h-10 px-3 rounded-lg border border-line text-ink text-sm font-medium items-center gap-2 hover:bg-shelf"
                title={currentAdmin?.name}
              >
                <ShieldCheck className="w-4 h-4" />
                {currentView === 'admin' ? 'المتجر' : 'لوحة التحكم'}
              </button>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`${iconBtn} sm:hidden`} aria-label="القائمة">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="lg:hidden pb-3">
            <label className="relative block">
              <span className="sr-only">ابحث في المنتجات</span>
              <Search className="w-[18px] h-[18px] text-steel absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="ابحث عن كاتيل، مكواة، خلاط..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                autoFocus
                className="w-full h-11 bg-shelf text-ink placeholder-steel/80 text-base rounded-lg pr-11 pl-4 border border-transparent focus:outline-hidden focus:bg-white focus:border-ink"
              />
            </label>
          </div>
        )}

        {/* Departments */}
        {currentView === 'store' && (
          <nav className="-mx-4 sm:mx-0 px-4 sm:px-0 flex items-center gap-6 overflow-x-auto no-scrollbar text-sm" aria-label="الأقسام">
            {[{ id: 'all', name: 'كل المنتجات' }, ...categories].map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`relative shrink-0 py-3 whitespace-nowrap transition-colors ${
                    active ? 'text-ink font-semibold' : 'text-steel hover:text-ink'
                  }`}
                  aria-current={active ? 'true' : undefined}
                >
                  {cat.name}
                  {active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gold rounded-full" />}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-line bg-white px-4 py-3 space-y-1">
          <button
            onClick={() => {
              setWishlistOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full h-12 flex items-center justify-between text-ink text-sm"
          >
            <span className="flex items-center gap-3">
              <Heart className="w-5 h-5" /> المفضلة
            </span>
            <span className="text-steel">{wishlist.length}</span>
          </button>
          <button
            onClick={() => {
              setCompareOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full h-12 flex items-center justify-between text-ink text-sm border-t border-line"
          >
            <span className="flex items-center gap-3">
              <Scale className="w-5 h-5" /> مقارنة الأجهزة
            </span>
            <span className="text-steel">{compareList.length}</span>
          </button>
          {isAdminLoggedIn && (
            <button
              onClick={() => {
                setCurrentView(currentView === 'admin' ? 'store' : 'admin');
                setMobileMenuOpen(false);
              }}
              className="w-full h-12 flex items-center gap-3 text-ink text-sm border-t border-line"
            >
              <ShieldCheck className="w-5 h-5" />
              {currentView === 'admin' ? 'الرجوع للمتجر' : 'لوحة التحكم'}
            </button>
          )}
        </div>
      )}
    </header>
  );
};
