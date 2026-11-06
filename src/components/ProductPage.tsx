import React, { useEffect, useState } from 'react';
import { thumb, api } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';
import {
  ShoppingBag, Heart, ArrowLeftRight, ShieldCheck, Truck, RotateCcw, Zap, Plus, Minus, Share2, CheckCircle2, ChevronRight, Star,
} from 'lucide-react';

export const productPath = (p: Pick<Product, 'id'> & { slug?: string }) => `/product/${p.id}${p.slug ? `-${p.slug}` : ''}`;
export const productIdFromPath = (): string | null => {
  const m = location.pathname.match(/^\/product\/(\d+)(?:-[a-z0-9-]*)?\/?$/);
  return m ? m[1] : null;
};

type Review = { id: number; name: string; city: string; rating: number; comment: string; createdAt: string };

const Stars: React.FC<{ value: number; size?: string }> = ({ value, size = 'w-4 h-4' }) => (
  <span className="inline-flex" dir="ltr" aria-label={`${value} من 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-gold text-gold' : 'text-line'}`} />
    ))}
  </span>
);

/** Full product page at /product/ID-slug — shareable, used as ad landing page, and indexed by Google. */
export const ProductPage: React.FC<{ product: Product; onBack: () => void }> = ({ product, onBack }) => {
  const { products, categories, addToCart, isWishlisted, toggleWishlist, isInCompare, toggleCompare, setCurrentView, showToast, setSelectedCategory } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);
  const [reviews, setReviews] = useState<{ items: Review[]; avg: number; count: number } | null>(null);

  useEffect(() => {
    setQuantity(1);
    setActive(0);
    window.scrollTo({ top: 0 });
    document.title = `${product.name} | HOMEX`;
    setReviews(null);
    api.get('reviews', { product: product.id }).then(setReviews).catch(() => setReviews({ items: [], avg: 0, count: 0 }));
  }, [product.id]);

  const images = product.gallery && product.gallery.length ? product.gallery : [product.image];
  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const pct = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;
  const saved = hasDiscount ? product.originalPrice! - product.price : 0;
  const isOut = product.stock <= 0;
  const isWished = isWishlisted(product.id);
  const inCompare = isInCompare(product.id);
  const cat = categories.find((c) => c.id === product.category);
  const related = products.filter((p) => p.id !== product.id && p.category === product.category && p.stock > 0).slice(0, 8);
  const more = related.length < 4 ? products.filter((p) => p.id !== product.id && p.category !== product.category && p.stock > 0).slice(0, 8 - related.length) : [];

  const add = () => addToCart(product, quantity);
  const buyNow = () => {
    addToCart(product, quantity);
    setCurrentView('checkout');
  };
  const share = async () => {
    const url = location.origin + productPath(product as any);
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('اتنسخ رابط المنتج', 'success');
      }
    } catch { /* cancelled */ }
  };
  const toCategory = () => {
    onBack();
    setTimeout(() => {
      setSelectedCategory(product.category as any);
      document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const iconBtn = 'w-11 h-11 rounded-xl border border-line bg-white flex items-center justify-center text-steel hover:text-ink shrink-0';

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-28 md:pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-steel mb-3 sm:mb-5 overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="مسار الصفحة">
        <button onClick={onBack} className="flex items-center gap-1 font-bold text-ink hover:text-gold-deep shrink-0">
          <ChevronRight className="w-4 h-4" /> الرئيسية
        </button>
        {cat && (<><span>/</span><button onClick={toCategory} className="hover:text-ink shrink-0">{cat.name}</button></>)}
        <span>/</span>
        <span className="text-ink truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-5 md:gap-10 bg-white rounded-2xl border border-line p-3 sm:p-6">
        {/* Gallery */}
        <div className="space-y-3 md:sticky md:top-24 self-start">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-shelf border border-line">
            <img src={images[active] || product.image} alt={product.name} decoding="async" fetchPriority="high" className="w-full h-full object-cover" />
            {hasDiscount && <span className="absolute top-3 right-3 bg-sale text-white text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-md">خصم {pct}%</span>}
            {isOut && <span className="absolute inset-x-0 bottom-0 bg-ink/80 text-white text-sm font-bold text-center py-2">نفد من المخزن</span>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 shrink-0 ${active === i ? 'border-gold' : 'border-line opacity-70'}`}>
                  <img src={thumb(img)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            {product.brand && <span className="text-xs sm:text-sm font-extrabold text-gold-deep">{product.brand}</span>}
            <h1 className="text-xl sm:text-3xl font-extrabold text-ink leading-snug mt-1">{product.name}</h1>
            {reviews && reviews.count > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-steel">
                <Stars value={reviews.avg} /> <span className="price">{reviews.avg.toFixed(1)}</span> · {reviews.count} تقييم
              </a>
            )}
          </div>

          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
            <span className={`price text-3xl sm:text-4xl font-black ${hasDiscount ? 'text-sale' : 'text-ink'}`}>
              {product.price.toLocaleString('en-US')} <span className="text-lg">ج.م</span>
            </span>
            {hasDiscount && (
              <>
                <span className="price text-base text-steel line-through">{product.originalPrice!.toLocaleString('en-US')} ج.م</span>
                <span className="price text-sm font-bold text-save bg-save/10 px-2 py-0.5 rounded">وفّر {saved.toLocaleString('en-US')} ج.م</span>
              </>
            )}
          </div>

          {!isOut && product.stock <= 5 && <p className="text-sm font-bold text-sale">باقي {product.stock} قطع بس في المخزن</p>}

          {(product.wattage || product.capacity) && (
            <div className="flex flex-wrap gap-2">
              {product.wattage && <span className="inline-flex items-center gap-1 bg-ink text-white text-xs font-bold px-2.5 py-1 rounded-md"><Zap className="w-3.5 h-3.5 text-gold" /> {product.wattage}</span>}
              {product.capacity && <span className="bg-shelf text-ink text-xs font-bold px-2.5 py-1 rounded-md border border-line">{product.capacity}</span>}
            </div>
          )}

          {/* Buy (desktop/tablet) */}
          <div className="hidden md:block">
            {isOut ? (
              <p className="h-12 flex items-center justify-center rounded-xl bg-shelf text-steel font-bold">المنتج ده خلص حالياً</p>
            ) : (
              <div className="flex items-center gap-2">
                <QtyBox q={quantity} max={product.stock} set={setQuantity} />
                <button onClick={add} className="flex-1 h-12 rounded-xl border-2 border-ink text-ink font-extrabold flex items-center justify-center gap-1.5"><ShoppingBag className="w-4 h-4" /> أضف للسلة</button>
                <button onClick={buyNow} className="flex-1 h-12 rounded-xl btn-gold font-extrabold">اطلب دلوقتي</button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => toggleWishlist(product.id)} className={`${iconBtn} ${isWished ? '!border-sale !text-sale' : ''}`} aria-label="المفضلة"><Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} /></button>
            <button onClick={() => toggleCompare(product)} className={`${iconBtn} ${inCompare ? '!border-gold !text-gold-deep' : ''}`} aria-label="قارن"><ArrowLeftRight className="w-5 h-5" /></button>
            <button onClick={share} className={iconBtn} aria-label="مشاركة المنتج"><Share2 className="w-5 h-5" /></button>
          </div>

          <ul className="bg-shelf rounded-xl p-3 space-y-2 text-sm text-ink">
            {product.warranty && <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-save shrink-0" /> ضمان {product.warranty.replace(/^ضمان\s*/, '')}</li>}
            <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-gold-deep shrink-0" /> شحن لكل محافظات مصر</li>
            <li className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-steel shrink-0" /><a href="/p/returns" className="underline underline-offset-2">سياسة الاسترجاع والاستبدال</a></li>
          </ul>

          {product.description && (
            <section>
              <h2 className="text-base font-extrabold text-ink mb-1.5">عن المنتج</h2>
              <p className="text-sm sm:text-[15px] text-steel leading-relaxed whitespace-pre-line">{product.description}</p>
            </section>
          )}
          {product.features && product.features.length > 0 && (
            <section>
              <h2 className="text-base font-extrabold text-ink mb-2">المميزات</h2>
              <ul className="space-y-1.5 text-sm text-ink">
                {product.features.map((f, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-save shrink-0 mt-0.5" /> <span>{f}</span></li>)}
              </ul>
            </section>
          )}
          {product.specs && product.specs.length > 0 && (
            <section>
              <h2 className="text-base font-extrabold text-ink mb-2">المواصفات</h2>
              <dl className="rounded-xl border border-line overflow-hidden divide-y divide-line text-sm">
                {product.specs.map((s, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 py-2 px-3 even:bg-shelf">
                    <dt className="text-steel">{s.label}</dt><dd className="font-bold text-ink break-words">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviews && reviews.count > 0 && (
        <section id="reviews" className="mt-6 sm:mt-10 bg-white rounded-2xl border border-line p-4 sm:p-6 scroll-mt-24">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-ink">آراء العملاء</h2>
            <span className="flex items-center gap-2 text-sm text-steel"><Stars value={reviews.avg} /> <b className="price text-ink">{reviews.avg.toFixed(1)}</b> من 5 · {reviews.count} تقييم</span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {reviews.items.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink text-sm">{r.name}{r.city ? <span className="text-steel font-normal"> · {r.city}</span> : ''}</span>
                  <Stars value={r.rating} size="w-3.5 h-3.5" />
                </div>
                {r.comment && <p className="text-sm text-steel mt-2 leading-relaxed">{r.comment}</p>}
                <p className="text-[11px] text-save font-bold mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> اشترى المنتج فعلاً</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related */}
      {related.length + more.length > 0 && (
        <section className="mt-6 sm:mt-10">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink mb-3">{related.length ? 'منتجات من نفس القسم' : 'ممكن يعجبك كمان'}</h2>
          <div className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x pb-1">
            {[...related, ...more].map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-[44%] min-[480px]:w-[31%] md:w-[23%] lg:w-[18.5%]"><ProductCard product={p} compact /></div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky buy bar (phones) */}
      <div className="md:hidden fixed bottom-16 inset-x-0 z-30 bg-white border-t border-line px-3 py-2 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
        {isOut ? (
          <p className="h-11 flex items-center justify-center rounded-xl bg-shelf text-steel font-bold text-sm">المنتج ده خلص حالياً</p>
        ) : (
          <div className="flex items-center gap-2">
            <QtyBox q={quantity} max={product.stock} set={setQuantity} small />
            <button onClick={add} className="flex-1 min-w-0 h-11 rounded-xl border-2 border-ink text-ink font-extrabold text-sm flex items-center justify-center gap-1"><ShoppingBag className="w-4 h-4 shrink-0" /> <span className="truncate">للسلة</span></button>
            <button onClick={buyNow} className="flex-[1.4] min-w-0 h-11 rounded-xl btn-gold font-extrabold text-sm"><span className="truncate">اطلب دلوقتي</span></button>
          </div>
        )}
      </div>
    </main>
  );
};

const QtyBox: React.FC<{ q: number; max: number; set: (f: (q: number) => number) => void; small?: boolean }> = ({ q, max, set, small }) => (
  <div className={`flex items-center border border-line rounded-xl shrink-0 ${small ? 'h-11' : 'h-12'}`}>
    <button onClick={() => set((x) => Math.min(max, x + 1))} disabled={q >= max} className="w-9 h-full flex items-center justify-center disabled:opacity-30" aria-label="زوّد"><Plus className="w-4 h-4" /></button>
    <span className="price w-7 text-center font-bold">{q}</span>
    <button onClick={() => set((x) => Math.max(1, x - 1))} disabled={q <= 1} className="w-9 h-full flex items-center justify-center disabled:opacity-30" aria-label="قلّل"><Minus className="w-4 h-4" /></button>
  </div>
);
