import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  CreditCard, 
  ArrowLeft,
  Tv,
  Coffee,
  Blend,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { setSelectedCategory, setSelectedProduct, products } = useStore();

  const featuredKettle = products.find(p => p.id === 'prod-kettle-1');
  const featuredScreen = products.find(p => p.id === 'prod-screen-1');

  return (
    <div className="space-y-6">
      {/* Hero Showcase Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white shadow-2xl p-6 sm:p-10 lg:p-12 border border-slate-700/60">
        
        {/* Ambient subtle glow background */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-right">
            
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>موسم تخفيضات الأجهزة المنزلية الكبرى • خصومات تصل إلى 35%</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.2] font-['Cairo']">
              أجهزتك المنزلية والكهربائية <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 via-amber-300 to-amber-500">
                بأعلى جودة وضمان أصلي
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              اكتشف أحدث تشكيلة من كاتيل الشاي والقهوة، شاشات التلفزيون الذكية 4K، خلاطات ومحضرات الطعام، والقلايات الهوائية من كبرى الماركات العالمية (فيليبس، سامسونج، كينوود، شارب، براون).
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#appliances-catalog-section"
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
              >
                <span>تسوق العروض الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </a>

              {featuredScreen && (
                <button
                  onClick={() => setSelectedProduct(featuredScreen)}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl border border-white/20 transition-all text-sm backdrop-blur-xs flex items-center gap-2"
                >
                  <Tv className="w-4 h-4 text-amber-400" />
                  <span>عرض شاشات 4K الحصرية</span>
                </button>
              )}
            </div>

            {/* Micro assurances */}
            <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                منتجات أصلية 100%
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                توصيل خلال 24 - 48 ساعة
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                دفع عند الاستلام بعد المعاينة
              </span>
            </div>
          </div>

          {/* Visual Showcase (Featured Appliances Duo Cards) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* Kettle Card Promo */}
            <div 
              onClick={() => featuredKettle && setSelectedProduct(featuredKettle)}
              className="group cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80"
                  alt="كاتيل فيليبس زجاجي"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                  الأكثر طلباً 🔥
                </span>
                <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md">
                  2200 واط
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                كاتيل فيليبس إسنشال زجاجي
              </h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm sm:text-base font-extrabold text-amber-400 font-mono">1,350 ج.م</span>
                <span className="text-[11px] text-slate-400 line-through font-mono">1,750 ج.م</span>
              </div>
            </div>

            {/* Smart Screen Card Promo */}
            <div 
              onClick={() => featuredScreen && setSelectedProduct(featuredScreen)}
              className="group cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80"
                  alt="شاشة سامسونج سمارت"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <span className="absolute top-2 right-2 bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                  دقة 4K UHD
                </span>
                <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md">
                  55 بوصة
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                شاشة سامسونج كريستال الذكية
              </h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm sm:text-base font-extrabold text-amber-400 font-mono">19,499 ج.م</span>
                <span className="text-[11px] text-slate-400 line-through font-mono">22,999</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Feature Badges Strip (Value propositions) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">شحن سريع آمن</h3>
            <p className="text-[11px] text-slate-500">توصيل لباب منزلك مع فحص الجهاز</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">ضمان معتمد رسمي</h3>
            <p className="text-[11px] text-slate-500">ضمان وكيل حتى 3 سنوات</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">دفع عند الاستلام</h3>
            <p className="text-[11px] text-slate-500">أو فيزا وماستركارد بأمان تام</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">استرجاع واستبدال</h3>
            <p className="text-[11px] text-slate-500">خلال 14 يوم بكل سهولة ومرونة</p>
          </div>
        </div>

      </div>
    </div>
  );
};
