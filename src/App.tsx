import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CompareModal } from './components/CompareModal';
import { CheckoutView } from './components/CheckoutView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastContainer } from './components/Toast';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ProductCategory } from './types';
import { STORE_INFO } from './config/store';
import { 
  SlidersHorizontal, 
  Sparkles, 
  Phone, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  CreditCard,
  ChevronDown,
  Layers,
  ArrowUpDown,
  FilterX,
  Lock
} from 'lucide-react';

const StoreContent: React.FC = () => {
  const { 
    currentView, 
    products, 
    categories, 
    selectedCategory, 
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    setCurrentView,
    isAdminLoggedIn,
    setAdminLoginModalOpen
  } = useStore();

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under2k' | '2k-6k' | '6k-15k' | 'above15k'>('all');

  // Extract unique brands
  const brands = Array.from(new Set(products.map(p => p.brand)));

  // Filter products
  const filteredProducts = products.filter(p => {
    // Category match
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    // Search query match (name, description, brand, wattage, capacity)
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.wattage && p.wattage.toLowerCase().includes(q)) ||
      (p.capacity && p.capacity.toLowerCase().includes(q));

    // Brand match
    const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;

    // Price range match
    let matchesPrice = true;
    if (priceFilter === 'under2k') matchesPrice = p.price < 2000;
    else if (priceFilter === '2k-6k') matchesPrice = p.price >= 2000 && p.price <= 6000;
    else if (priceFilter === '6k-15k') matchesPrice = p.price > 6000 && p.price <= 15000;
    else if (priceFilter === 'above15k') matchesPrice = p.price > 15000;

    return matchesCategory && matchesSearch && matchesBrand && matchesPrice;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    // Default: featured first
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  const activeCategoryInfo = categories.find(c => c.id === selectedCategory);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setPriceFilter('all');
    setSearchQuery('');
    setSortBy('featured');
  };

  // If in admin view, render AdminLayout
  if (currentView === 'admin') {
    return <AdminLayout />;
  }

  const priceTiers = [
    { id: 'all', label: 'كل الأسعار' },
    { id: 'under2k', label: 'أقل من 2,000' },
    { id: '2k-6k', label: '2,000 إلى 6,000' },
    { id: '6k-15k', label: '6,000 إلى 15,000' },
    { id: 'above15k', label: 'أكتر من 15,000' },
  ] as const;

  const isFiltered = selectedCategory !== 'all' || selectedBrand !== 'all' || priceFilter !== 'all' || !!searchQuery;

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink pb-20 md:pb-0">
      <Navbar />

      {currentView === 'checkout' ? (
        <main className="flex-1">
          <CheckoutView />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-16 sm:space-y-24">
          {!searchQuery && selectedCategory === 'all' && <HeroBanner />}

          <section id="appliances-catalog-section" className="scroll-mt-40">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-ink">
                  {searchQuery
                    ? `نتايج البحث عن "${searchQuery}"`
                    : selectedCategory === 'all'
                    ? 'كل المنتجات'
                    : activeCategoryInfo?.name}
                </h2>
                <p className="text-sm text-steel mt-1.5">
                  {sortedProducts.length} منتج
                  {activeCategoryInfo && !searchQuery ? `، ${activeCategoryInfo.description}` : ''}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-steel">ترتيب حسب</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 bg-white text-ink rounded-lg px-3 border border-line focus:outline-hidden focus:border-ink cursor-pointer"
                >
                  <option value="featured">المميز</option>
                  <option value="price-asc">السعر من الأقل</option>
                  <option value="price-desc">السعر من الأعلى</option>
                  <option value="rating">الأعلى تقييماً</option>
                  <option value="newest">الأحدث</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-6 border-b border-line text-sm">
              {priceTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setPriceFilter(tier.id)}
                  className={`h-9 px-3.5 rounded-lg whitespace-nowrap transition-colors border ${
                    priceFilter === tier.id
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border-line hover:border-ink'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
              {isFiltered && (
                <button
                  onClick={resetAllFilters}
                  className="mr-auto h-9 px-2 whitespace-nowrap text-steel hover:text-ink underline underline-offset-4"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>

            {sortedProducts.length === 0 ? (
              <div className="py-20 text-center max-w-sm mx-auto">
                <h3 className="text-lg font-semibold text-ink">مفيش منتجات مطابقة</h3>
                <p className="text-sm text-steel mt-2 leading-relaxed">
                  جرّب كلمة بحث تانية أو امسح الفلاتر عشان تشوف كل المنتجات.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="mt-6 h-11 px-6 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink-soft"
                >
                  اعرض كل المنتجات
                </button>
              </div>
            ) : (
              <div className="pt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* How ordering works — a real sequence, so it is numbered */}
          <section className="border-t border-line pt-12">
            <h2 className="text-2xl font-bold text-ink">إزاي تطلب</h2>
            <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                ['اختار الجهاز', 'ضيفه للسلة، وتقدر تقارن بين أكتر من جهاز قبل ما تقرر.'],
                ['اكتب بياناتك', 'الاسم والعنوان ورقم الموبايل. هنكلمك نأكد الطلب.'],
                ['استلم وافحص وادفع', 'المندوب بيوصلك، تفتح الكرتونة وتجرب الجهاز، وبعدها تدفع.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="shrink-0 w-9 h-9 rounded-full border border-ink text-ink flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{title}</h3>
                    <p className="text-sm text-steel leading-relaxed mt-1.5">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </main>
      )}

      <ProductModal />
      <CartDrawer />
      <WishlistDrawer />
      <CompareModal />
      <AdminLoginModal />
      <ToastContainer />
      <MobileBottomNav />

      <footer className="bg-ink text-white/70 text-sm mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <img src="/logo.png" alt="HOMEX" className="h-9 w-auto" />
              <p className="leading-relaxed max-w-xs">أجهزة منزلية للمطبخ والبيت، بالدفع عند الاستلام.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">الأقسام</h4>
              <ul className="space-y-2.5">
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c.id);
                        document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white transition-colors"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">تواصل معانا</h4>
              <ul className="space-y-2.5">
                {STORE_INFO.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a href={`tel:${STORE_INFO.phone}`} dir="ltr" className="hover:text-white">{STORE_INFO.phone}</a>
                  </li>
                )}
                {STORE_INFO.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${STORE_INFO.email}`} className="hover:text-white">{STORE_INFO.email}</a>
                  </li>
                )}
                {STORE_INFO.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{STORE_INFO.address}</span>
                  </li>
                )}
                {STORE_INFO.hours && <li>{STORE_INFO.hours}</li>}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">الطلب والضمان</h4>
              <ul className="space-y-2.5">
                <li>الدفع عند الاستلام</li>
                <li>معاينة الجهاز قبل الدفع</li>
                <li>الضمان مكتوب على كل منتج</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <p>© {new Date().getFullYear()} HOMEX</p>
            {isAdminLoggedIn ? (
              <button onClick={() => setCurrentView('admin')} className="hover:text-white">لوحة التحكم</button>
            ) : (
              <button onClick={() => setAdminLoginModalOpen(true)} className="hover:text-white flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> دخول الإدارة
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreContent />
    </StoreProvider>
  );
}
