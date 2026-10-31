import React from 'react';
import { useStore } from '../context/StoreContext';

// The hero is the store's aisle: every category as a shelf tile,
// photographed with a real product from that category.
export const HeroBanner: React.FC = () => {
  const { setSelectedCategory, products, categories } = useStore();

  const aisle = categories
    .map((cat) => {
      const items = products.filter((p) => p.category === cat.id);
      const cover = items.find((p) => p.isFeatured) || items[0];
      return { cat, count: items.length, cover };
    })
    .filter((t) => t.count > 0);

  const goToCatalog = (catId?: string) => {
    setSelectedCategory((catId as any) || 'all');
    document.getElementById('appliances-catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2 lg:pt-6">
      {/* Copy */}
      <div className="lg:col-span-5 space-y-6">
        <h1 className="text-[clamp(1.65rem,7.2vw,3rem)] leading-[1.3] sm:leading-[1.2] font-bold text-ink tracking-tight text-balance">
          كل أجهزة بيتك من مكان واحد، بسعر واضح وتوصيل لحد الباب
        </h1>
        <p className="text-[15px] sm:text-base text-steel leading-loose max-w-md">
          غلايات ومكاوي وخلاطات وكبة ومحضرات طعام. افحص الجهاز وانت بتستلمه، وادفع بعدها.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => goToCatalog()}
            className="h-12 px-7 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink-soft transition-colors"
          >
            تصفح كل المنتجات
          </button>
          <span className="text-sm text-steel">{products.length} منتج متاح الآن</span>
        </div>

        <dl className="grid grid-cols-1 min-[420px]:grid-cols-3 border-t border-line text-sm divide-y min-[420px]:divide-y-0 divide-line">
          <div className="py-3 min-[420px]:pt-5 min-[420px]:pb-0 min-[420px]:pl-3 flex min-[420px]:block items-baseline justify-between gap-3">
            <dt className="font-semibold text-ink">الدفع عند الاستلام</dt>
            <dd className="text-steel text-xs min-[420px]:mt-1">كاش أو تحويل</dd>
          </div>
          <div className="py-3 min-[420px]:pt-5 min-[420px]:pb-0 min-[420px]:px-3 min-[420px]:border-r border-line flex min-[420px]:block items-baseline justify-between gap-3">
            <dt className="font-semibold text-ink">معاينة قبل الدفع</dt>
            <dd className="text-steel text-xs min-[420px]:mt-1">افتح الكرتونة وجرّب</dd>
          </div>
          <div className="py-3 min-[420px]:pt-5 min-[420px]:pb-0 min-[420px]:pr-3 min-[420px]:border-r border-line flex min-[420px]:block items-baseline justify-between gap-3">
            <dt className="font-semibold text-ink">ضمان على كل جهاز</dt>
            <dd className="text-steel text-xs min-[420px]:mt-1">مكتوب على صفحة المنتج</dd>
          </div>
        </dl>
      </div>

      {/* The aisle */}
      <div className="lg:col-span-7 -mx-4 sm:mx-0">
        <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto no-scrollbar px-4 sm:px-0 snap-x">
          {aisle.map(({ cat, count, cover }, i) => {
            const rest = (aisle.length - 3) % 3; // tiles left over in the last row
            const isLast = i === aisle.length - 1 && aisle.length > 3;
            const fill = isLast && rest === 1 ? 'lg:col-span-3' : isLast && rest === 2 ? 'lg:col-span-2' : '';
            return (
            <button
              key={cat.id}
              onClick={() => goToCatalog(cat.id)}
              className={`group snap-start shrink-0 w-[44vw] sm:w-56 lg:w-auto text-right bg-shelf rounded-2xl overflow-hidden ${
                i === 0 ? 'lg:col-span-2 lg:row-span-2' : fill
              }`}
            >
              <div className={`relative ${i === 0 ? 'aspect-square lg:aspect-auto lg:h-full lg:min-h-[22rem]' : fill ? 'aspect-square lg:aspect-auto lg:h-full lg:min-h-[13rem]' : 'aspect-square'}`}>
                {cover && (
                  <img
                    src={cover.image}
                    alt={cat.name}
                    loading={i < 3 ? 'eager' : 'lazy'}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent">
                  <span className={`block text-white font-semibold ${i === 0 ? 'text-sm lg:text-xl' : 'text-sm'}`}>
                    {cat.name}
                  </span>
                  <span className="block text-white/75 text-xs mt-0.5">{count} منتج</span>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
