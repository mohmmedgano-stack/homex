import React, { useEffect, useRef, useState } from 'react';
import { useStore, HomeBanner } from '../context/StoreContext';
import { thumb } from '../lib/api';
import { ApplianceArt } from './ApplianceArt';
import { SplitWords, Magnet, GlowBlobs } from './fx/Effects';
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, Banknote, RotateCcw, Wrench } from 'lucide-react';

const SLIDE_THEMES = [
  { bg: 'from-[#1c1f24] to-[#3a414c]', tag: 'bg-gold text-white', accent: 'text-gold-hi', cta: 'btn-gold' },
  { bg: 'from-[#9b1c1c] to-[#e02424]', tag: 'bg-white text-sale', accent: 'text-white', cta: 'bg-white text-sale hover:bg-white/90' },
  { bg: 'from-[#c4580a] to-[#ff9142]', tag: 'bg-white text-gold-deep', accent: 'text-white', cta: 'bg-ink text-white hover:bg-ink-soft' },
];

export const HeroBanner: React.FC = () => {
  const { products, categories, setSelectedCategory, setSelectedProduct, settings, banners } = useStore();
  const isPhone = useIsPhone();

  const scrollToCatalog = (catId?: string) => {
    setSelectedCategory((catId as any) || 'all');
    document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const openLink = (link: string) => {
    if (link.startsWith('product:')) {
      const p = products.find((x) => String(x.id) === link.slice(8));
      if (p) setSelectedProduct(p);
    } else if (link.startsWith('category:')) scrollToCatalog(link.slice(9));
    else if (link.startsWith('/')) window.location.href = link;
    else if (link) window.open(link, '_blank', 'noopener');
  };

  const tiles = categories.filter((c) => products.some((p) => p.category === c.id));
  const colsFor: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6' };

  // One slider: HOMEX brand slide (switchable per device) → uploaded banners → products switched on «يظهر في البانر»
  const brandOn = (isPhone ? settings.brand_banner_mobile : settings.brand_banner_desktop) !== '0';
  const featured = products.filter((p) => p.isFeatured && p.stock > 0).slice(0, 5);
  const slides: Slide[] = [
    ...(brandOn ? [{ key: 'brand', node: <BrandSlide settings={settings} onShop={() => scrollToCatalog()} /> }] : []),
    ...banners.map((b) => ({ key: `b${b.id}`, label: b.title, onClick: b.link ? () => openLink(b.link) : undefined, node: <ImageSlide b={b} /> })),
    ...featured.map((p, i) => ({ key: `p${p.id}`, label: p.name, node: <ProductSlide p={p} theme={SLIDE_THEMES[i % SLIDE_THEMES.length]} onOpen={() => setSelectedProduct(p)} /> })),
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {slides.length > 0 && <Slider slides={slides} />}


      {/* Service strip */}
      <div data-reveal className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-2xl border border-line divide-line [&>*]:border-line">
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
      <section data-reveal>
        <div className="flex items-end justify-between mb-3 sm:mb-4">
          <div>
            <SplitWords as="h2" onScroll className="text-xl sm:text-2xl font-extrabold text-ink" text={settings.hero_title || 'كل أساسيات بيتك عندنا أسهل'} />
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

/** true on phones (< 640px), follows rotation/resizing */
function useIsPhone() {
  const q = '(max-width: 639px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

type Slide = { key: string; node: React.ReactNode; onClick?: () => void; label?: string };

/** Slider frame: 3:2 on phones, 3:1 on tablets/desktop (matches the banner artwork sizes). Swipe + autoplay. */
const Slider: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n, paused]);
  useEffect(() => { if (i >= n) setI(0); }, [n]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-ink aspect-[3/2] sm:aspect-[3/1] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
      aria-roledescription="carousel"
    >
      <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(${i * 100}%)` }}>
        {slides.map((s, k) => (
          <div
            key={s.key}
            className={`relative w-full h-full shrink-0 ${s.onClick ? 'cursor-pointer' : ''}`}
            onClick={s.onClick}
            role={s.onClick ? 'link' : undefined}
            aria-label={s.label}
            aria-hidden={k !== i}
            inert={k !== i ? true : undefined}
          >
            {s.node}
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button onClick={() => go(-1)} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 text-ink items-center justify-center shadow" aria-label="السابق">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => go(1)} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 text-ink items-center justify-center shadow" aria-label="التالي">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2.5 inset-x-0 z-10 flex justify-center gap-1.5">
            {slides.map((s, k) => (
              <button key={s.key} onClick={() => setI(k)} className={`h-2 rounded-full transition-all shadow ${k === i ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} aria-label={`شريحة ${k + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const BrandSlide: React.FC<{ settings: any; onShop: () => void }> = ({ settings, onShop }) => (
  <div className="absolute inset-0 bg-gradient-to-l from-[#131518] via-[#1c1f24] to-[#3a414c] text-white flex items-center">
    <GlowBlobs />
    <ApplianceArt className="absolute left-1 sm:left-6 lg:left-12 bottom-8 sm:bottom-5 w-[44%] sm:w-[46%] lg:w-[42%] max-h-[78%] sm:max-h-[86%]" />
    <div className="relative px-4 min-[400px]:px-5 sm:px-12 space-y-2 min-[400px]:space-y-2.5 sm:space-y-5 w-[58%] sm:w-[54%] lg:max-w-2xl">
      <img src={settings.logo || '/logo.webp'} width={600} height={167} alt={settings.store_name} className="h-6 min-[400px]:h-7 sm:h-10 lg:h-12 w-auto" />
      <SplitWords
        as="h2"
        delay={0.15}
        className="block text-base min-[400px]:text-xl sm:text-3xl lg:text-4xl font-extrabold leading-snug"
        text={settings.brand_title || 'أجهزة بيتك بضمان حقيقي، وسعر يريحك'}
      />
      <p className="text-[11px] min-[400px]:text-sm sm:text-base lg:text-lg text-white/80 leading-relaxed">
        {settings.brand_subtitle || 'شحن لكل محافظات مصر، وضمان ومراكز صيانة معتمدة'}
      </p>
      <Magnet strength={0.35}>
        <button onClick={onShop} className="btn-gold shiny-text justify-center h-8 min-[400px]:h-9 sm:h-12 px-4 min-[400px]:px-5 sm:px-8 rounded-xl text-sm sm:text-base font-extrabold shadow-lg shadow-gold/30">
          تسوق دلوقتي
        </button>
      </Magnet>
    </div>
  </div>
);

const ImageSlide: React.FC<{ b: HomeBanner }> = ({ b }) => (
  <picture>
    {b.imageMobile && <source media="(max-width: 639px)" srcSet={b.imageMobile} />}
    <img src={b.image} alt={b.title} loading="lazy" decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
  </picture>
);

const ProductSlide: React.FC<{ p: any; theme: (typeof SLIDE_THEMES)[number]; onOpen: () => void }> = ({ p, theme: th, onOpen }) => {
  const hasDisc = !!p.originalPrice && p.originalPrice > p.price;
  const pct = hasDisc ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  return (
    <div className={`absolute inset-0 bg-gradient-to-l ${th.bg}`}>
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
            {hasDisc && <span className="price text-sm sm:text-base text-white/70 line-through">{p.originalPrice.toLocaleString('en-US')}</span>}
          </div>
          <button onClick={onOpen} className={`${th.cta} shiny-text justify-center h-9 min-[360px]:h-10 sm:h-12 px-4 min-[360px]:px-5 sm:px-8 rounded-xl text-sm sm:text-base font-extrabold shadow-lg`}>
            اطلب دلوقتي
          </button>
        </div>
        <div className="h-full p-3 sm:p-6 flex items-center justify-center">
          <img src={thumb(p.image)} alt="" loading="lazy" decoding="async" className="h-[85%] aspect-square max-w-full object-cover rounded-2xl shadow-2xl ring-4 ring-white/15" />
        </div>
      </div>
    </div>
  );
};
