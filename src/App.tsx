import React, { useEffect, useState } from 'react';
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
import { ProductCategory } from './types';
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
  Lock,
  MessageCircle
} from 'lucide-react';

// Counts down to midnight — today's deals refresh daily
const DealCountdown: React.FC = () => {
  const calc = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = left % 60;
  return (
    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
      <span className="hidden min-[400px]:inline opacity-90">بتخلص بعد</span>
      <span dir="ltr" className="price flex gap-1">
        {[h, m, sec].map((v, i) => (
          <span key={i} className="bg-white text-sale rounded px-1.5 py-0.5 font-black">{pad(v)}</span>
        ))}
      </span>
    </span>
  );
};

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
    settings,
  } = useStore();
  const STORE_INFO = settings;

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


  const priceTiers = [
    { id: 'all', label: 'كل الأسعار' },
    { id: 'under2k', label: 'أقل من 2,000' },
    { id: '2k-6k', label: '2,000 إلى 6,000' },
    { id: '6k-15k', label: '6,000 إلى 15,000' },
    { id: 'above15k', label: 'أكتر من 15,000' },
  ] as const;

  const discounted = [...products]
    .filter((p) => p.originalPrice && p.originalPrice > p.price && p.stock > 0)
    .sort((x, y) => (y.originalPrice! - y.price) / y.originalPrice! - (x.originalPrice! - x.price) / x.originalPrice!);
  const rails = [
    { title: 'عروض النهارده', head: 'bg-sale text-white', items: discounted.slice(0, 10), extra: <DealCountdown /> },
    { title: 'وصل حديثاً', head: 'bg-ink text-white', items: products.filter((p) => p.isNewArrival).slice(0, 10), extra: null },
    {
      title: 'أساسيات المطبخ',
      head: 'btn-gold',
      items: products.filter((p) => ['kettles', 'blenders', 'cooking'].includes(p.category)).slice(0, 10),
      extra: null,
    },
  ];

  const isFiltered = selectedCategory !== 'all' || selectedBrand !== 'all' || priceFilter !== 'all' || !!searchQuery;

  return (
    <div className="min-h-screen flex flex-col bg-page text-ink pb-20 md:pb-0">
      <Navbar />

      {currentView === 'checkout' ? (
        <main className="flex-1">
          <CheckoutView />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 sm:space-y-12">
          {!searchQuery && selectedCategory === 'all' && (
            <>
              <HeroBanner />

              {rails.map((rail) =>
                rail.items.length === 0 ? null : (
                  <section key={rail.title}>
                    <div className={`flex items-center justify-between rounded-t-xl px-4 h-12 ${rail.head}`}>
                      <h2 className="text-base sm:text-xl font-extrabold">{rail.title}</h2>
                      {rail.extra}
                    </div>
                    <div className="bg-white border border-t-0 border-line rounded-b-xl p-2.5 sm:p-4">
                      <div className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x">
                        {rail.items.map((p) => (
                          <div key={p.id} className="snap-start shrink-0 w-[44%] min-[480px]:w-[31%] md:w-[23%] lg:w-[18.5%]">
                            <ProductCard product={p} compact />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )
              )}

              {/* Brands */}
              {brands.length > 0 && (
              <section className="bg-white rounded-xl border border-line p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-extrabold text-ink mb-4">أشهر الماركات</h2>
                <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar">
                  {brands.map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setSelectedBrand(b);
                        document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`shrink-0 h-14 sm:h-16 px-5 sm:px-7 rounded-xl border-2 font-extrabold text-sm sm:text-base transition-colors ${
                        selectedBrand === b ? 'border-gold bg-amber-50 text-ink' : 'border-line text-ink hover:border-gold'
                      }`}
                    >
                      {b.replace(/\s*\(.*?\)\s*/g, '')}
                    </button>
                  ))}
                </div>
              </section>
              )}
            </>
          )}

          {/* Full catalog */}
          <section id="appliances-catalog-section" className="scroll-mt-44">
            <div className="bg-white rounded-xl border border-line p-3 sm:p-4 mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-2xl font-extrabold text-ink">
                  {searchQuery ? `نتايج البحث: ${searchQuery}` : selectedCategory === 'all' ? 'كل المنتجات' : activeCategoryInfo?.name}
                </h2>
                <p className="text-xs sm:text-sm text-steel mt-0.5">{sortedProducts.length} منتج</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {selectedBrand !== 'all' && (
                  <button onClick={() => setSelectedBrand('all')} className="h-10 px-3 rounded-lg bg-amber-50 border border-gold font-bold text-ink">
                    {selectedBrand.replace(/\s*\(.*?\)\s*/g, '')} ✕
                  </button>
                )}
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  className="h-10 bg-white text-ink rounded-lg px-2 border border-line font-bold focus:outline-hidden focus:border-gold"
                  aria-label="السعر"
                >
                  <option value="all">كل الأسعار</option>
                  <option value="under2k">أقل من 2,000</option>
                  <option value="2k-6k">2,000 - 6,000</option>
                  <option value="6k-15k">6,000 - 15,000</option>
                  <option value="above15k">أكتر من 15,000</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 bg-white text-ink rounded-lg px-2 border border-line font-bold focus:outline-hidden focus:border-gold"
                  aria-label="ترتيب"
                >
                  <option value="featured">المميز</option>
                  <option value="price-asc">الأقل سعراً</option>
                  <option value="price-desc">الأعلى سعراً</option>
                  <option value="rating">الأعلى تقييماً</option>
                  <option value="newest">الأحدث</option>
                </select>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-line py-16 text-center px-6">
                <h3 className="text-lg font-extrabold text-ink">مفيش منتجات مطابقة</h3>
                <p className="text-sm text-steel mt-2">جرّب كلمة بحث تانية أو امسح الفلاتر.</p>
                <button onClick={resetAllFilters} className="btn-gold mt-5 h-11 px-6 rounded-lg font-extrabold">
                  اعرض كل المنتجات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <ProductModal />
      <CartDrawer />
      <WishlistDrawer />
      <CompareModal />
      <ToastContainer />
      <MobileBottomNav />

      {STORE_INFO.whatsapp && (
        <a
          href={`https://wa.me/${STORE_INFO.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-6 left-4 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center"
          aria-label="كلمنا واتساب"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}

      <footer className="bg-ink text-white/75 text-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <img src={settings.logo || '/logo.png'} alt="HOMEX" className="h-10 w-auto" />
              <p className="leading-relaxed max-w-xs">كل أساسيات بيتك من أجهزة منزلية بأفضل سعر، مع التوصيل والدفع عند الاستلام.</p>
            </div>
            <div>
              <h4 className="text-gold-hi font-extrabold mb-4">الأقسام</h4>
              <ul className="space-y-2.5">
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c.id);
                        document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-gold-hi font-extrabold mb-4">خدمة العملاء</h4>
              <ul className="space-y-2.5">
                <li>الشحن والتوصيل</li>
                <li>الضمان والاستبدال</li>
                <li>طرق الدفع</li>
                <li>
                  <button onClick={() => setCurrentView('checkout')} className="hover:text-white">إتمام الطلب</button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-gold-hi font-extrabold mb-4">تواصل معانا</h4>
              <ul className="space-y-2.5">
                {STORE_INFO.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-gold-hi" />
                    <a href={`tel:${STORE_INFO.phone}`} dir="ltr" className="hover:text-white">{STORE_INFO.phone}</a>
                  </li>
                )}
                {STORE_INFO.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0 text-gold-hi" />
                    <a href={`mailto:${STORE_INFO.email}`} className="hover:text-white">{STORE_INFO.email}</a>
                  </li>
                )}
                {STORE_INFO.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gold-hi" />
                    <span>{STORE_INFO.address}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Truck className="w-4 h-4 shrink-0 text-gold-hi" /> توصيل لكل المحافظات
                </li>
                {(settings.facebook || settings.instagram || settings.tiktok) && (
                  <li className="flex gap-3 pt-2">
                    {settings.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-4">فيسبوك</a>}
                    {settings.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-4">إنستجرام</a>}
                    {settings.tiktok && <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-4">تيك توك</a>}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <p>© {new Date().getFullYear()} {settings.store_name}. كل الحقوق محفوظة.</p>
            <a href="/admin/" className="hover:text-white flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> دخول الإدارة
            </a>
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
