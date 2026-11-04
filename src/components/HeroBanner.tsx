import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { thumb } from '../lib/api';
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, Banknote, RotateCcw, Wrench } from 'lucide-react';

const SLIDE_THEMES = [
  { bg: 'from-[#1c1f24] to-[#3a414c]', tag: 'bg-gold text-white', accent: 'text-gold-hi', cta: 'btn-gold' },
  { bg: 'from-[#9b1c1c] to-[#e02424]', tag: 'bg-white text-sale', accent: 'text-white', cta: 'bg-white text-sale hover:bg-white/90' },
  { bg: 'from-[#c4580a] to-[#ff9142]', tag: 'bg-white text-gold-deep', accent: 'text-white', cta: 'bg-ink text-white hover:bg-ink-soft' },
];

export const HeroBanner: React.FC = () => {
  const { products, categories, setSelectedCategory, setSelectedProduct, settings } = useStore();

  // Banner = only products the owner switched on as «يظهر في البانر» (isFeatured) in the dashboard
  const featured = products.filter((p) => p.isFeatured && p.stock > 0);
  const slides = featured.slice(0, 3);

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

  const sideDeals = featured.slice(3, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Offers carousel + side banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`relative ${sideDeals.length ? 'lg:col-span-2' : 'lg:col-span-3'} rounded-2xl overflow-hidden h-[230px] min-[400px]:h-[260px] sm:h-[340px]`}>
          {slides.length === 0 && (
            // Brand banner — shown until the store has discounted products to feature
            <div className="absolute inset-0 bg-gradient-to-l from-[#131518] via-[#1c1f24] to-[#3a414c] text-white flex items-center">
              <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-gold/20" aria-hidden="true" />
              <div className="absolute left-24 -top-16 w-40 h-40 rounded-full bg-gold/10" aria-hidden="true" />
              <div className="relative p-6 sm:p-12 space-y-3 sm:space-y-5 max-w-2xl">
                <img src={settings.logo || '/logo.webp'} alt={settings.store_name} className="h-8 sm:h-12 w-auto" />
                <h2 className="text-2xl sm:text-4xl font-extrabold leading-snug">
                  {settings.hero_title || 'أجهزة بيتك بضمان حقيقي، وسعر يريحك'}
                </h2>
                <p className="text-sm sm:text-lg text-white/80">
                  {settings.hero_subtitle || 'شحن لكل محافظات مصر، وضمان ومراكز صيانة معتمدة'}
                </p>
                <button onClick={() => scrollToCatalog()} className="btn-gold h-11 sm:h-12 px-6 sm:px-8 rounded-xl text-sm sm:text-base font-extrabold shadow-lg">
                  تسوق دلوقتي
                </button>
              </div>
            </div>
          )}
          {slides.map((p, i) => {
            const th = SLIDE_THEMES[i % SLIDE_THEMES.length];
            const hasDisc = !!p.originalPrice && p.originalPrice > p.price;
            const pct = hasDisc ? Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100) : 0;
            return (
              <div
                key={p.id}
                className={`absolute inset-0 bg-gradient-to-l ${th.bg} transition-opacity duration-700 ${
                  i === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                aria-hidden={i !== index}
              >
                <div className="h-full grid grid-cols-[1.15fr_1fr] items-center">
                  <div className="p-4 min-[360px]:p-5 sm:p-10 sm:pr-16 text-white space-y-2 sm:space-y-4">
                    <span className={`inline-block text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full ${th.tag}`}>
                      {hasDisc ? `خصم ${pct}%` : p.isNewArrival ? 'وصل حديثاً' : 'الأكثر طلباً'}
                    </span>
                    <h2 className="text-base min-[360px]:text-lg min-[400px]:text-xl sm:text-3xl font-extrabold leading-snug line-clamp-2 sm:line-clamp-3">{p.name}</h2>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`price text-xl min-[360px]:text-2xl sm:text-4xl font-black ${th.accent}`}>
                        {p.price.toLocaleString('en-US')} <span className="text-base sm:text-lg">ج.م</span>
                      </span>
                      {hasDisc && (
                        <span className="price text-sm sm:text-base text-white/70 line-through">
                          {p.originalPrice!.toLocaleString('en-US')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className={`${th.cta} h-9 min-[360px]:h-10 sm:h-12 px-4 min-[360px]:px-5 sm:px-8 rounded-xl text-sm sm:text-base font-extrabold shadow-lg`}
                      tabIndex={i === index ? 0 : -1}
                    >
                      اطلب دلوقتي
                    </button>
                  </div>
                  <div className="h-full p-3 sm:p-6 flex items-center">
                    <img
                      src={thumb(p.image)}
                      alt=""
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
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
                    className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                    aria-label={`العرض ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side banners (desktop) */}
        {sideDeals.length > 0 && (
        <div className="hidden lg:grid grid-rows-2 gap-4">
          {sideDeals.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className={`relative rounded-2xl overflow-hidden text-right ${i === 0 ? 'bg-gold' : 'bg-ink'}`}
            >
              <img src={thumb(p.image)} alt="" loading="lazy" decoding="async" className="absolute left-0 top-0 h-full w-1/2 object-cover" />
              <div className={`relative w-1/2 mr-0 p-5 h-full flex flex-col justify-center text-white`}>
                <span className="text-xs font-bold opacity-80">{p.originalPrice && p.originalPrice > p.price ? `خصم ${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%` : 'اختيارنا ليك'}</span>
                <span className="font-extrabold leading-snug line-clamp-2 mt-1">{p.name}</span>
                <span className="price font-black text-xl mt-2">{p.price.toLocaleString('en-US')} ج.م</span>
              </div>
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Service strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-2xl border border-line divide-line [&>*]:border-line">
        {[
          { Icon: Wrench, t: 'مراكز صيانة معتمدة', s: 'في محافظات مصر', c: 'text-save bg-save/10' },
          { Icon: Truck, t: 'توصيل لحد البيت', s: 'لكل المحافظات', c: 'text-ink bg-ink/5' },
          { Icon: ShieldCheck, t: 'ضمان على كل جهاز', s: 'مدته مكتوبة على كل منتج', c: 'text-gold-deep bg-gold/15' },
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
      {tiles.length > 0 && (
      <section>
        <div className="flex items-end justify-between mb-3 sm:mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink">{settings.hero_title || 'كل أساسيات بيتك عندنا أسهل'}</h2>
            {settings.hero_subtitle && <p className="text-sm text-steel mt-1">{settings.hero_subtitle}</p>}
          </div>
          <button onClick={() => scrollToCatalog()} className="text-sm font-bold text-gold-deep hover:underline shrink-0">
            عرض الكل
          </button>
        </div>
        <div className={`grid grid-cols-3 ${colsFor[tiles.length] || 'sm:grid-cols-6'} gap-2.5 sm:gap-4`}>
          {tiles.map((cat) => {
            const items = products.filter((p) => p.category === cat.id);
            const cover = cat.image || items.find((p) => p.image)?.image;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCatalog(cat.id)}
                className="group bg-white rounded-xl border border-line overflow-hidden hover:border-gold hover:shadow-md transition text-center"
              >
                <span className="block aspect-square bg-shelf overflow-hidden">
                  {cover && (
                    <img src={thumb(cover)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </span>
                <span className="block px-1.5 py-2 sm:py-2.5 text-[12px] sm:text-sm font-bold text-ink leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>
      )}
    </div>
  );
};
