import React, { useEffect, useState } from 'react';
import { thumb } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { X, ShoppingBag, Heart, ArrowLeftRight, ShieldCheck, Truck, RotateCcw, Zap, Plus, Minus, Share2, CheckCircle2 } from 'lucide-react';

/**
 * Product details — full-screen sheet on phones (sticky buy bar at the bottom),
 * centred dialog on tablets/desktop.
 */
export const ProductModal: React.FC = () => {
  const { selectedProduct, setSelectedProduct, addToCart, isWishlisted, toggleWishlist, isInCompare, toggleCompare, setCurrentView, showToast } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setQuantity(1);
    setActive(0);
    if (!selectedProduct) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedProduct(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedProduct?.id]);

  if (!selectedProduct) return null;
  const product = selectedProduct;
  const close = () => setSelectedProduct(null);

  const images = product.gallery && product.gallery.length ? product.gallery : [product.image];
  const hasDiscount = !!product.originalPrice && product.originalPrice > product.price;
  const pct = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;
  const saved = hasDiscount ? product.originalPrice! - product.price : 0;
  const isOut = product.stock <= 0;
  const isWished = isWishlisted(product.id);
  const inCompare = isInCompare(product.id);

  const add = () => addToCart(product, quantity);
  const buyNow = () => {
    addToCart(product, quantity);
    close();
    setCurrentView('checkout');
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('اتنسخ رابط المنتج', 'success');
      }
    } catch {
      /* user cancelled */
    }
  };

  const iconBtn = 'w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-steel hover:text-ink shrink-0';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 sm:p-6 flex sm:items-center justify-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="relative bg-white w-full sm:max-w-4xl sheet-h sm:h-auto sm:max-h-[92vh] sm:rounded-2xl flex flex-col overflow-hidden text-right shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-14 border-b border-line shrink-0">
          <button onClick={close} className={iconBtn} aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={share} className={iconBtn} aria-label="مشاركة المنتج">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => toggleCompare(product)} className={`${iconBtn} ${inCompare ? '!border-gold !text-gold-deep' : ''}`} aria-label="قارن">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button onClick={() => toggleWishlist(product.id)} className={`${iconBtn} ${isWished ? '!border-sale !text-sale' : ''}`} aria-label="المفضلة">
              <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid md:grid-cols-2 gap-5 md:gap-8 p-4 sm:p-6">
            {/* Images */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-shelf border border-line">
                <img src={images[active] || product.image} alt={product.name} decoding="async" className="w-full h-full object-cover" />
                {hasDiscount && (
                  <span className="absolute top-3 right-3 bg-sale text-white text-xs font-extrabold px-2.5 py-1 rounded-md">خصم {pct}%</span>
                )}
                {isOut && <span className="absolute inset-x-0 bottom-0 bg-ink/80 text-white text-sm font-bold text-center py-2">نفد من المخزن</span>}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${active === i ? 'border-gold' : 'border-line opacity-70'}`}
                      aria-label={`صورة ${i + 1}`}
                    >
                      <img src={thumb(img)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                {product.brand && <span className="text-xs font-extrabold text-gold-deep">{product.brand}</span>}
                <h1 className="text-lg sm:text-2xl font-extrabold text-ink leading-snug mt-1">{product.name}</h1>
              </div>

              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                <span className={`price text-2xl sm:text-3xl font-black ${hasDiscount ? 'text-sale' : 'text-ink'}`}>
                  {product.price.toLocaleString('en-US')} <span className="text-base">ج.م</span>
                </span>
                {hasDiscount && (
                  <>
                    <span className="price text-sm text-steel line-through">{product.originalPrice!.toLocaleString('en-US')} ج.م</span>
                    <span className="price text-sm font-bold text-save">وفّر {saved.toLocaleString('en-US')} ج.م</span>
                  </>
                )}
              </div>

              {(product.wattage || product.capacity) && (
                <div className="flex flex-wrap gap-2">
                  {product.wattage && (
                    <span className="inline-flex items-center gap-1 bg-ink text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      <Zap className="w-3.5 h-3.5 text-gold" /> {product.wattage}
                    </span>
                  )}
                  {product.capacity && <span className="bg-shelf text-ink text-xs font-bold px-2.5 py-1 rounded-md border border-line">{product.capacity}</span>}
                </div>
              )}

              <ul className="bg-shelf rounded-xl p-3 space-y-2 text-sm text-ink">
                {product.warranty && (
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-save shrink-0" /> ضمان {product.warranty.replace(/^ضمان\s*/, '')}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gold-deep shrink-0" /> شحن لكل محافظات مصر
                </li>
                <li className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-steel shrink-0" />
                  <a href="/p/returns" target="_blank" rel="noreferrer" className="underline underline-offset-2">سياسة الاسترجاع والاستبدال</a>
                </li>
              </ul>

              {product.description && (
                <section>
                  <h2 className="text-sm font-extrabold text-ink mb-1">عن المنتج</h2>
                  <p className="text-sm text-steel leading-relaxed whitespace-pre-line">{product.description}</p>
                </section>
              )}

              {product.features && product.features.length > 0 && (
                <section>
                  <h2 className="text-sm font-extrabold text-ink mb-2">المميزات</h2>
                  <ul className="space-y-1.5 text-sm text-ink">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-save shrink-0 mt-0.5" /> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {product.specs && product.specs.length > 0 && (
                <section>
                  <h2 className="text-sm font-extrabold text-ink mb-2">المواصفات</h2>
                  <dl className="rounded-xl border border-line overflow-hidden divide-y divide-line text-sm">
                    {product.specs.map((s, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 py-2 px-3 even:bg-shelf">
                        <dt className="text-steel">{s.label}</dt>
                        <dd className="font-bold text-ink break-words">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Sticky buy bar */}
        <div className="shrink-0 border-t border-line bg-white px-3 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isOut ? (
            <p className="h-12 flex items-center justify-center rounded-xl bg-shelf text-steel font-bold">المنتج ده خلص حالياً</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-line rounded-xl h-12 shrink-0">
                <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} disabled={quantity >= product.stock} className="w-9 h-full flex items-center justify-center disabled:opacity-30" aria-label="زوّد">
                  <Plus className="w-4 h-4" />
                </button>
                <span className="price w-7 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="w-9 h-full flex items-center justify-center disabled:opacity-30" aria-label="قلّل">
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              <button onClick={add} className="flex-1 min-w-0 h-12 rounded-xl border-2 border-ink text-ink font-extrabold text-sm flex items-center justify-center gap-1.5">
                <ShoppingBag className="w-4 h-4 shrink-0" /> <span className="truncate">أضف للسلة</span>
              </button>
              <button onClick={buyNow} className="flex-1 min-w-0 h-12 rounded-xl btn-gold font-extrabold text-sm">
                <span className="truncate">اطلب دلوقتي</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
