import React from 'react';
import { useStore } from '../context/StoreContext';
import { closeProductPage } from '../lib/nav';
import { Home, Layers, Heart, ShoppingBag, ShieldCheck, ArrowLeftRight } from 'lucide-react';

/**
 * Phones: a dark floating capsule (the header's colour). The section you're in grows into an orange pill with its
 * name; the others are icons only, with a count badge where it matters.
 */
export const MobileBottomNav: React.FC = () => {
  const {
    currentView, setCurrentView, cartCount, cartOpen, setCartOpen, wishlist, wishlistOpen, setWishlistOpen,
    setSelectedCategory, compareList, compareOpen, setCompareOpen, isAdminLoggedIn,
  } = useStore();
  const [atCatalog, setAtCatalog] = React.useState(false);

  // «الأقسام» lights up while the product list is on screen
  React.useEffect(() => {
    const el = document.getElementById('appliances-catalog-section');
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setAtCatalog(e.isIntersecting && e.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, [currentView]);

  const drawer = cartOpen ? 'cart' : wishlistOpen ? 'wish' : compareOpen ? 'compare' : '';
  const active = drawer || (currentView === 'admin' ? 'admin' : currentView === 'store' ? (atCatalog ? 'cats' : 'home') : '');

  const goHome = () => {
    if (/^\/(p|o|r)\//.test(location.pathname)) { location.href = '/'; return; }
    closeProductPage();
    setCurrentView('store');
    setSelectedCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goCats = () => {
    if (/^\/(p|o|r)\//.test(location.pathname)) { location.href = '/#catalog'; return; }
    closeProductPage();
    setCurrentView('store');
    setTimeout(() => document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  const items: { id: string; label: string; Icon: React.FC<any>; onClick: () => void; count?: number }[] = [
    { id: 'home', label: 'الرئيسية', Icon: Home, onClick: goHome },
    { id: 'cats', label: 'الأقسام', Icon: Layers, onClick: goCats },
    { id: 'wish', label: 'المفضلة', Icon: Heart, onClick: () => setWishlistOpen(true), count: wishlist.length },
    { id: 'cart', label: 'السلة', Icon: ShoppingBag, onClick: () => setCartOpen(true), count: cartCount },
    isAdminLoggedIn
      ? { id: 'admin', label: 'الأدمن', Icon: ShieldCheck, onClick: () => setCurrentView(currentView === 'admin' ? 'store' : 'admin') }
      : { id: 'compare', label: 'المقارنة', Icon: ArrowLeftRight, onClick: () => setCompareOpen(true), count: compareList.length },
  ];

  return (
    <nav aria-label="التنقل"
      className="mobile-bottom-nav md:hidden fixed inset-x-4 z-40 h-16 rounded-full bg-ink px-2 flex items-center justify-between ring-1 ring-white/10 shadow-[0_14px_30px_rgba(28,31,36,0.35)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
      {items.map(({ id, label, Icon, onClick, count }) => {
        const on = active === id;
        return (
          <button key={id} type="button" onClick={onClick} aria-label={label} aria-current={on ? 'page' : undefined}
            className={`relative h-12 rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${
              on ? 'bg-gold text-white px-4 shadow-[0_6px_16px_rgba(244,123,32,0.45)]' : 'text-[#9aa1ad] px-3 active:text-white'
            }`}>
            <Icon className={`w-[22px] h-[22px] shrink-0 ${id === 'wish' && count ? 'fill-current' : ''}`} strokeWidth={on ? 2.4 : 2} />
            <span className={`text-sm font-extrabold whitespace-nowrap overflow-hidden transition-all duration-300 ${on ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0'}`}>{label}</span>
            {!!count && !on && (
              <span className="absolute top-0.5 right-0.5 min-w-[19px] h-[19px] px-1 rounded-full bg-sale text-white text-[11px] font-bold leading-[19px] text-center price ring-2 ring-ink">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
