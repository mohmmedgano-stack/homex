import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { closeProductPage } from '../lib/nav';
import { ShoppingCart, Heart, ArrowLeftRight, Search, ShieldCheck, X, Menu, Phone, Truck, ChevronDown, LayoutGrid } from 'lucide-react';

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
    isAdminLoggedIn,
    setSortBy,
    settings,
  } = useStore();
  const logo = settings.logo || '/logo.webp';

  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [shopOpen, setShopOpen] = useState(false); // "تسوق الآن" dropdown
  const shopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) setShopOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // On a policy page (/p/...) the store lives at "/", so store actions go home first
  const leavePolicyPage = (hash = '') => {
    if (/^\/(p|o|r)\//.test(location.pathname)) {
      location.href = '/' + hash;
      return true;
    }
    closeProductPage();
    return false;
  };

  const toCatalog = (cat: string = 'all', sort?: any) => {
    if (leavePolicyPage('#catalog')) return;
    setCurrentView('store');
    setSelectedCategory(cat as any);
    if (sort) setSortBy(sort);
    setShopOpen(false);
    setMenuOpen(false);
    setTimeout(() => document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const toDealers = () => {
    if (leavePolicyPage('#dealers')) return;
    setCurrentView('store');
    setSelectedCategory('all');
    setSearchQuery('');
    setShopOpen(false);
    setMenuOpen(false);
    setTimeout(() => document.getElementById('dealers-section')?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const onSearch = (value: string) => {
    if (leavePolicyPage()) return;
    setSearchQuery(value);
    if (currentView !== 'store') setCurrentView('store');
  };

  const searchBox = (className = '') => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }}
      className={`flex h-11 sm:h-12 rounded-xl overflow-hidden border-2 border-transparent focus-within:border-gold bg-white ${className}`}
      role="search"
    >
      <input
        type="search"
        placeholder="بتدور على إيه؟ كاتيل، مكواة، خلاط..."
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        className="flex-1 min-w-0 px-4 text-[15px] text-ink placeholder-steel/80 focus:outline-hidden bg-transparent"
        aria-label="ابحث في المنتجات"
      />
      <button type="submit" className="btn-gold w-12 sm:w-14 flex items-center justify-center shrink-0" aria-label="بحث">
        <Search className="w-5 h-5" />
      </button>
    </form>
  );

  const counter = 'absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sale text-white text-[11px] font-bold flex items-center justify-center';

  return (
    <header className="sticky top-0 z-40 bg-ink shadow-md">
      {/* Top bar */}
      <div className="bg-ink-deep text-white/85 text-xs sm:text-[13px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 truncate">
            <Truck className="w-4 h-4 text-gold-hi shrink-0" />
            <span className="truncate">{settings.top_bar_text}</span>
          </span>
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 font-bold text-gold-hi shrink-0">
              <Phone className="w-4 h-4" />
              <span dir="ltr">{settings.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6 h-16 sm:h-20">
          <button onClick={() => setMenuOpen(true)} className="lg:hidden -mr-1 p-1.5 text-white" aria-label="القائمة">
            <Menu className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => {
              if (leavePolicyPage()) return;
              setCurrentView('store');
              setSelectedCategory('all');
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="shrink-0"
            aria-label="HOMEX الرئيسية"
          >
            <img src={logo} width={600} height={167} alt={settings.store_name} className="h-8 sm:h-11 w-auto" />
          </button>

          {searchBox('hidden md:flex flex-1 max-w-2xl mx-auto')}

          <div className="flex items-center gap-1 sm:gap-4 mr-auto md:mr-0">
            <button onClick={() => setCompareOpen(true)} className="hidden lg:flex flex-col items-center text-white hover:text-gold-hi" aria-label="المقارنة">
              <span className="relative">
                <ArrowLeftRight className="w-6 h-6" />
                {compareList.length > 0 && <span className={counter}>{compareList.length}</span>}
              </span>
              <span className="text-[11px] font-bold mt-0.5">المقارنة</span>
            </button>
            <button onClick={() => setWishlistOpen(true)} className="flex flex-col items-center text-white hover:text-gold-hi p-1.5 sm:p-0" aria-label="المفضلة">
              <span className="relative">
                <Heart className="w-6 h-6" />
                {wishlist.length > 0 && <span className={counter}>{wishlist.length}</span>}
              </span>
              <span className="hidden sm:block text-[11px] font-bold mt-0.5">المفضلة</span>
            </button>
            <button onClick={() => setCartOpen(true)} className="flex flex-col items-center text-white hover:text-gold-hi p-1.5 sm:p-0" aria-label="السلة">
              <span className="relative">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && <span className={counter}>{cartCount}</span>}
              </span>
              <span className="hidden sm:block price text-[11px] font-bold mt-0.5">
                {cartTotal > 0 ? `${cartTotal.toLocaleString('en-US')} ج.م` : 'السلة'}
              </span>
            </button>
            {isAdminLoggedIn && (
              <button
                onClick={() => setCurrentView(currentView === 'admin' ? 'store' : 'admin')}
                className="hidden sm:flex flex-col items-center text-white hover:text-gold-hi"
              >
                <ShieldCheck className="w-6 h-6" />
                <span className="text-[11px] font-bold mt-0.5">{currentView === 'admin' ? 'المتجر' : 'الإدارة'}</span>
              </button>
            )}
          </div>
        </div>

        {searchBox('md:hidden mb-3')}
      </div>

      {/* Navigation bar */}
      {currentView === 'store' && (
        <nav className="hidden lg:block bg-ink-soft border-t border-white/5" aria-label="القائمة الرئيسية">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 h-12 text-sm font-bold text-white">
            <div className="relative" ref={shopRef}>
              <button
                onClick={() => setShopOpen((o) => !o)}
                className="btn-gold h-12 px-5 flex items-center gap-2"
                aria-expanded={shopOpen}
              >
                <LayoutGrid className="w-4 h-4" />
                تسوق الآن
                <ChevronDown className={`w-4 h-4 transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
              </button>
              {shopOpen && (
                <div className="absolute top-full right-0 w-64 bg-white text-ink rounded-b-xl shadow-xl border border-line py-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toCatalog(c.id)}
                      className="w-full text-right px-4 py-2.5 hover:bg-shelf hover:text-gold-deep font-bold"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {[
              { label: 'الرئيسية', on: () => { if (leavePolicyPage()) return; setSelectedCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
              { label: 'كل المنتجات', on: () => toCatalog('all', 'featured') },
              { label: 'العروض', on: () => toCatalog('all', 'price-asc'), hot: true },
              { label: 'وصل حديثاً', on: () => toCatalog('all', 'newest') },
              { label: 'الأعلى تقييماً', on: () => toCatalog('all', 'rating') },
              { label: 'أقرب تاجر', on: () => toDealers() },
            ].map((l) => (
              <button key={l.label} onClick={l.on} className="h-12 px-4 hover:text-gold-hi transition-colors flex items-center gap-1.5">
                {l.label}
                {l.hot && <span className="text-[10px] bg-sale text-white px-1.5 py-0.5 rounded">خصومات</span>}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Mobile categories row */}
      {currentView === 'store' && (
        <div className="lg:hidden bg-ink border-t border-white/10">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
            {[{ id: 'all', name: 'الكل' }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => toCatalog(c.id)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-bold border transition-colors ${
                  selectedCategory === c.id ? 'bg-gold text-white border-gold' : 'bg-transparent text-white/85 border-white/20'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute top-0 right-0 bottom-0 w-[82%] max-w-xs bg-white shadow-2xl flex flex-col">
            <div className="bg-ink px-4 h-16 flex items-center justify-between">
              <img src={logo} width={600} height={167} alt={settings.store_name} className="h-8 w-auto" />
              <button onClick={() => setMenuOpen(false)} className="text-white p-1" aria-label="إغلاق">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <p className="px-4 pt-4 pb-2 text-xs font-bold text-steel">الأقسام</p>
              {categories.map((c) => (
                <button key={c.id} onClick={() => toCatalog(c.id)} className="w-full text-right px-4 h-12 border-b border-line font-bold text-ink">
                  {c.name}
                </button>
              ))}
              <p className="px-4 pt-5 pb-2 text-xs font-bold text-steel">تسوق</p>
              <button onClick={() => toCatalog('all', 'price-asc')} className="w-full text-right px-4 h-12 border-b border-line font-bold text-sale">العروض</button>
              <button onClick={() => toCatalog('all', 'newest')} className="w-full text-right px-4 h-12 border-b border-line font-bold text-ink">وصل حديثاً</button>
              <button onClick={toDealers} className="w-full text-right px-4 h-12 border-b border-line font-bold text-ink">اشتري من أقرب تاجر</button>
              <button onClick={() => { setCompareOpen(true); setMenuOpen(false); }} className="w-full text-right px-4 h-12 border-b border-line font-bold text-ink">
                مقارنة الأجهزة ({compareList.length})
              </button>
              {isAdminLoggedIn && (
                <button onClick={() => { setCurrentView('admin'); setMenuOpen(false); }} className="w-full text-right px-4 h-12 border-b border-line font-bold text-ink">
                  لوحة التحكم
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};
