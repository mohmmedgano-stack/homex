import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, Banknote, RotateCcw } from 'lucide-react';

const SLIDE_THEMES = [
  { bg: 'from-[#0f1e36] to-[#1d3a6b]', tag: 'bg-gold text-ink', accent: 'text-gold-hi' },
  { bg: 'from-[#9b1c1c] to-[#e02424]', tag: 'bg-white text-sale', accent: 'text-white' },
  { bg: 'from-[#065f46] to-[#0e9f6e]', tag: 'bg-gold-hi text-ink', accent: 'text-gold-hi' },
];

export const HeroBanner: React.FC = () => {
  const { products, categories, setSelectedCategory, setSelectedProduct } = useStore();

  // Slides = the biggest discounts in the store, so the banners always match real products/prices
  const slides = [...products]
    .filter((p) => p.originalPrice && p.originalPrice > p.price && p.stock > 0)
    .sort((a, b) => (b.originalPrice! - b.price) / b.originalPrice! - (a.originalPrice! - a.price) / a.originalPrice!)
    .slice(0, 3);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (d: number) => setIndex((i) => (i + d + slides.length) % slides.length);

  const scrollToCatalog = (catId?: string) => {
    setSelectedCategory((catId as any) || 'all');
    document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tiles = categories.filter((c) => products.some((p) => p.category === c.id));
  const colsFor: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6' };

  const sideDeals = slides.length ? products.filter((p) => !slides.includes(p) && p.isFeatured).slice(0, 2) : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Offers carousel + side banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-2 rounded-2xl overflow-hidden h-[230px] min-[400px]:h-[260px] sm:h-[340px]">
          {slides.map((p, i) => {
            const th = SLIDE_THEMES[i % SLIDE_THEMES.length];
            const pct = Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100);
            return (
              <div
                key={p.id}
                className={`absolute inset-0 bg-gradient-to-l ${th.bg} transition-opacity duration-700 ${
                  i === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                aria-hidden={i !== index}
              >
                <div className="h-full grid grid-cols-[1.15fr_1fr] items-center">
                  <div className="p-5 sm:p-10 sm:pr-16 text-white space-y-2 sm:space-y-4">
                    <span className={`inline-block text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full ${th.tag}`}>
                      خصم {pct}%
                    </span>
                    <h2 className="text-lg min-[400px]:text-xl sm:text-3xl font-extrabold leading-snug line-clamp-3">{p.name}</h2>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`price text-2xl sm:text-4xl font-black ${th.accent}`}>
                        {p.price.toLocaleString('en-US')} <span className="text-base sm:text-lg">ج.م</span>
                      </span>
                      <span className="price text-sm sm:text-base text-white/70 line-through">
                        {p.originalPrice!.toLocaleString('en-US')}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className="btn-gold h-10 sm:h-12 px-5 sm:px-8 rounded-xl text-sm sm:text-base font-extrabold shadow-lg"
                      tabIndex={i === index ? 0 : -1}
                    >
                      اطلب دلوقتي
                    </button>
                  </div>
                  <div className="h-full p-3 sm:p-6 flex items-center">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full max-h-[85%] object-cover rounded-2xl shadow-2xl ring-4 ring-white/15"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-ink items-center justify-center shadow"
                aria-label="العرض السابق"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => go(1)}
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-ink items-center justify-center shadow"
                aria-label="العرض التالي"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-gold-hi' : 'w-2 bg-white/60'}`}
                    aria-label={`العرض ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side banners (desktop) */}
        <div className="hidden lg:grid grid-rows-2 gap-4">
          {sideDeals.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className={`relative rounded-2xl overflow-hidden text-right ${i === 0 ? 'bg-gold-hi' : 'bg-ink'}`}
            >
              <img src={p.image} alt="" className="absolute left-0 top-0 h-full w-1/2 object-cover" />
              <div className={`relative w-1/2 mr-0 p-5 h-full flex flex-col justify-center ${i === 0 ? 'text-ink' : 'text-white'}`}>
                <span className="text-xs font-bold opacity-80">{i === 0 ? 'الأكثر مبيعاً' : 'وصل جديد'}</span>
                <span className="font-extrabold leading-snug line-clamp-2 mt-1">{p.name}</span>
                <span className="price font-black text-xl mt-2">{p.price.toLocaleString('en-US')} ج.م</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Service strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-2xl border border-line divide-line [&>*]:border-line">
        {[
          { Icon: Banknote, t: 'الدفع عند الاستلام', s: 'ادفع بعد ما تستلم', c: 'text-save bg-save/10' },
          { Icon: Truck, t: 'توصيل لحد البيت', s: 'لكل المحافظات', c: 'text-ink bg-ink/5' },
          { Icon: ShieldCheck, t: 'ضمان على كل جهاز', s: 'ضمان الوكيل', c: 'text-gold-deep bg-gold/15' },
          { Icon: RotateCcw, t: 'استبدال سهل', s: 'لو فيه عيب صناعة', c: 'text-sale bg-sale/10' },
        ].map(({ Icon, t, s, c }, i) => (
          <div
            key={t}
            className={`flex items-center gap-3 p-3 sm:p-4 ${i % 2 === 1 ? 'border-r' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${
              i === 2 ? 'lg:border-r' : ''
            }`}
          >
            <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 ${c}`}>
              <Icon className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] sm:text-sm font-extrabold text-ink leading-tight">{t}</span>
              <span className="block text-[11px] sm:text-xs text-steel mt-0.5">{s}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Category tiles — "كل أساسيات بيتك" */}
      <section>
        <div className="flex items-end justify-between mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink">كل أساسيات بيتك عندنا أسهل</h2>
          <button onClick={() => scrollToCatalog()} className="text-sm font-bold text-gold-deep hover:underline shrink-0">
            عرض الكل
          </button>
        </div>
        <div className={`grid grid-cols-3 ${colsFor[tiles.length] || 'sm:grid-cols-6'} gap-2.5 sm:gap-4`}>
          {tiles.map((cat) => {
            const items = products.filter((p) => p.category === cat.id);
            const cover = items[0];
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCatalog(cat.id)}
                className="group bg-white rounded-xl border border-line overflow-hidden hover:border-gold hover:shadow-md transition text-center"
              >
                <span className="block aspect-square bg-shelf overflow-hidden">
                  {cover && (
                    <img src={cover.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </span>
                <span className="block px-1.5 py-2 sm:py-2.5 text-[12px] sm:text-sm font-bold text-ink leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
