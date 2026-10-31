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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 pb-20 md:pb-0">
      
      {/* Top sticky Navbar */}
      <Navbar />

      {/* Main Body */}
      {currentView === 'checkout' ? (
        <main className="flex-1">
          <CheckoutView />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 sm:space-y-14">
          
          {/* Hero Banner with promotions and featured appliances */}
          <HeroBanner />

          {/* Catalog Section */}
          <section id="appliances-catalog-section" className="space-y-6 pt-4 scroll-mt-24">
            
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>كتالوج الأجهزة المنزلية الأصلية</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Cairo']">
                  {selectedCategory === 'all' ? 'جميع الأجهزة والمنتاجات' : activeCategoryInfo?.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {activeCategoryInfo ? activeCategoryInfo.description : 'اختر جهازك المفضل بضمان الوكيل وأفضل سعر في مصر'}
                </p>
              </div>

              {/* Sorting & Filter status */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  عرض {sortedProducts.length} من {products.length} جهاز
                </span>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white text-slate-800 text-xs rounded-xl px-3 py-2 pr-7 border border-slate-300 focus:outline-hidden focus:border-amber-500 shadow-xs font-semibold cursor-pointer"
                  >
                    <option value="featured">الأكثر تميزاً 🔥</option>
                    <option value="price-asc">السعر: من الأقل للأعلى</option>
                    <option value="price-desc">السعر: من الأعلى للأقل</option>
                    <option value="rating">الأعلى تقييماً ⭐</option>
                    <option value="newest">وصل حديثاً ✨</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Filter Controls: Categories, Brands, Price Tiers */}
            <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
              
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
                <span className="text-slate-400 font-bold shrink-0 ml-1">القسم:</span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل ({products.length})
                </button>
                {categories.map((c) => {
                  const count = products.filter(p => p.category === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                        selectedCategory === c.id
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Price Range Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-bold shrink-0 ml-1">السعر:</span>
                {[
                  { id: 'all', label: 'جميع الأسعار' },
                  { id: 'under2k', label: 'أقل من 2,000 ج.م' },
                  { id: '2k-6k', label: '2,000 - 6,000 ج.م' },
                  { id: '6k-15k', label: '6,000 - 15,000 ج.م' },
                  { id: 'above15k', label: 'أكثر من 15,000 ج.م' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setPriceFilter(tier.id as any)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      priceFilter === tier.id
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}

                {/* Reset button if filtered */}
                {(selectedCategory !== 'all' || selectedBrand !== 'all' || priceFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={resetAllFilters}
                    className="mr-auto text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-rose-50"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span>إلغاء الفلاتر</span>
                  </button>
                )}
              </div>

            </div>

            {/* Products Grid */}
            {sortedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">لم يتم العثور على أجهزة مطابقة للبحث</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  جرب تغيير كلمات البحث، أو اختر قسماً آخر، أو قم بإعادة ضبط الفلاتر للاطلاع على كل المنتجات.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 shadow-sm"
                >
                  عرض جميع الأجهزة المنزلية
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

          </section>

          {/* Quick Informational / FAQ Strip */}
          <section className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl p-6 sm:p-8 border border-amber-500/20 space-y-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                معلومات هامة لعملائنا
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-['Cairo']">
                لماذا يفضل الآلاف الشراء من متجر HOMEX؟
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-sm">أجهزة أصلية 100% بالضمان المعتمد</h4>
                <p className="text-slate-600 leading-relaxed">
                  جميع الشاشات، الغلايات، الخلاطات والأجهزة الكهربائية تأتي بختم وفاتورة ضريبية رسمية سارية لدى مراكز خدمة الوكلاء في كافة أنحاء الجمهورية.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-sm">معاينة وتشغيل قبل الدفع</h4>
                <p className="text-slate-600 leading-relaxed">
                  يصلك مندوب التوصيل حتى باب منزلك، ويحق لك فتح الكرتونة وفحص الجهاز والتأكد من سلامته التامة قبل سداد قيمة الفاتورة نقداً.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-sm">خدمة ما بعد البيع ودعم مستمر</h4>
                <p className="text-slate-600 leading-relaxed">
                  فريقنا متاح يومياً لمساعدتك في طريقة التشغيل الصحيحة وتفعيل الضمان وحل أي استفسار عبر الواتساب أو الهاتف مباشرة.
                </p>
              </div>
            </div>
          </section>

        </main>
      )}

      {/* Global Modals & Drawers */}
      <ProductModal />
      <CartDrawer />
      <WishlistDrawer />
      <CompareModal />
      <AdminLoginModal />
      <ToastContainer />
      <MobileBottomNav />

      {/* Modern Arabic Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* About */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="HOMEX" className="h-10 w-auto" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                وجهتك الأولى الموثوقة للأجهزة المنزلية والكهربائية العصرية بأفضل الأسعار وأقوى العروض وضمان معتمد.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300 font-semibold text-[11px]">مفتوح الآن لاستقبال الطلبات 24/7</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-white font-bold text-sm">أقسام الأجهزة</h4>
              <ul className="space-y-1.5">
                <li><button onClick={() => { setSelectedCategory('screens'); window.scrollTo({ top: 500, behavior: 'smooth' }); }} className="hover:text-amber-400 transition-colors">شاشات وتلفزيونات سمارت 4K</button></li>
                <li><button onClick={() => { setSelectedCategory('kettles'); window.scrollTo({ top: 500, behavior: 'smooth' }); }} className="hover:text-amber-400 transition-colors">غلايات وماكينات القهوة</button></li>
                <li><button onClick={() => { setSelectedCategory('blenders'); window.scrollTo({ top: 500, behavior: 'smooth' }); }} className="hover:text-amber-400 transition-colors">خلاطات ومحضرات طعام</button></li>
                <li><button onClick={() => { setSelectedCategory('cooking'); window.scrollTo({ top: 500, behavior: 'smooth' }); }} className="hover:text-amber-400 transition-colors">قلايات هوائية وميكروويف</button></li>
                <li><button onClick={() => { setSelectedCategory('cleaning'); window.scrollTo({ top: 500, behavior: 'smooth' }); }} className="hover:text-amber-400 transition-colors">مكانس ذكية ومكاوي بخار</button></li>
              </ul>
            </div>

            {/* Customer Service & Guarantee */}
            <div className="space-y-2.5">
              <h4 className="text-white font-bold text-sm">خدمة العملاء</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>الخط الساخن: 19999 / 01012345678</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono">support@modernhome.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>مصر - القاهرة، مدينة نصر & المعادي</span>
                </li>
              </ul>
            </div>

            {/* Safe & Discrete Portal Access */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm">ضمان وأمان التسوق</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                جميع الأجهزة مشمولة بالضمان المعتمد مع إمكانية الفحص الشامل والتشغيل قبل دفع الفاتورة.
              </p>
              
              {isAdminLoggedIn ? (
                <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>جلسة المشرف نشطة حالياً</span>
                  </div>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>فتح لوحة تحكم الإدارة</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={() => setAdminLoginModalOpen(true)}
                    className="text-slate-500 hover:text-slate-300 text-[11px] transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3 h-3 text-slate-600" />
                    <span>بوابة تسجيل دخول المشرفين</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} HOMEX للأجهزة المنزلية.  جميع الحقوق محفوظة.</p>
            <p className="text-amber-500/80 font-medium">تصميم فائق السرعة متوافق مع الهواتف الذكية وأجهزة الكمبيوتر</p>
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
