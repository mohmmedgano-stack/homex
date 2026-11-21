import React, { useEffect, useState } from 'react';
import { api, money, thumb } from '../../lib/api';
import { Card, Stat, Spinner, StatusBadge, Empty, Button, CountUp } from '../ui';
import { AlertTriangle, ArrowUpLeft, Plus, ShoppingBag, Wallet, Truck, Boxes, ExternalLink } from 'lucide-react';

const DAYS = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** Progress ring that fills up, with product photos orbiting around it */
const Ring: React.FC<{ pct: number; photos: string[] }> = ({ pct, photos }) => {
  const R = 54, C = 2 * Math.PI * R;
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 350); return () => clearTimeout(t); }, []);
  return (
    <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0" style={{ ['--r' as any]: 'clamp(70px, 11vw, 88px)' }}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="9" />
        <circle cx="64" cy="64" r={R} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct / 100) : C} style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="price text-3xl sm:text-4xl font-black"><CountUp text={`${pct}%`} ms={1600} /></span>
        <span className="text-[11px] text-white/80 font-bold">اتسلّم</span>
      </div>
      {photos.slice(0, 5).map((src, i) => (
        <img key={src} src={thumb(src)} alt="" className="ag-orb object-cover bg-white border-2 border-white shadow-lg"
          style={{ ['--a' as any]: `${-150 + i * 62}deg`, ['--i' as any]: i }} />
      ))}
    </div>
  );
};

export const Overview: React.FC<{ go: (p: any) => void; name?: string }> = ({ go, name }) => {
  const [sum, setSum] = useState<any>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    api.get('admin/summary').then(setSum).catch(() => setSum(false));
    api.get('admin/orders').then((d) => setOrders(d.orders.slice(0, 8))).catch(() => setOrders([]));
    api.get('catalog').then((d: any) => setPhotos((d.products || []).map((p: any) => p.image).filter(Boolean))).catch(() => {});
  }, []);

  if (!sum) return <Spinner />;
  const pending = sum.orders.byStatus.pending || 0;
  const maxRev = Math.max(1, ...sum.days.map((d: any) => Number(d.rev)));
  const by = sum.orders.byStatus || {};
  const inWay = (by.confirmed || 0) + (by.shipped || 0);
  const totalMonth = Object.entries(by).filter(([k]) => k !== 'awaiting_payment').reduce((a, [, n]) => a + Number(n), 0);
  const settled = totalMonth - (by.cancelled || 0);
  const pct = settled > 0 ? Math.round(((by.delivered || 0) / settled) * 100) : 0;
  const now = new Date();
  const greet = now.getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - now.getDay() + i); return d; });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">{greet}{name ? ` يا ${name}` : ''}</h1>
          <p className="text-sm text-ink/60 mt-1">{DAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]} · {pending > 0 ? `${pending} طلب محتاج تأكيد` : 'مفيش طلبات مستنية تأكيد'}</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" className="glass h-10 px-4 rounded-full text-sm font-bold inline-flex items-center gap-2 text-ink"><ExternalLink className="w-4 h-4" /> المتجر</a>
          <button onClick={() => go('orders')} className="h-10 px-4 rounded-full text-sm font-bold inline-flex items-center gap-2 bg-ink text-white"><ShoppingBag className="w-4 h-4" /> الطلبات</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* hero */}
        <section className="ag-hero lift lg:col-span-2 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 min-w-0 w-full">
            <span className="chip inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-white" /> الشهر ده · {totalMonth} طلب</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mt-3">
              سلّمت <span className="price"><CountUp text={String(sum.deliveredCount)} /></span> طلب بقيمة <span className="price whitespace-nowrap"><CountUp text={money(sum.revenue)} /></span>
            </h2>
            <p className="text-sm text-white/85 mt-2">{sum.orders.pipelineCount > 0 ? `و${sum.orders.pipelineCount} طلب لسه في الطريق بقيمة ${money(sum.orders.pipelineValue)}.` : 'مفيش طلبات في الطريق دلوقتي.'}</p>
            <div className="grid grid-cols-3 gap-2 mt-4 max-w-sm">
              {[[pending, 'جديدة'], [inWay, 'في الطريق'], [`${pct}%`, 'نسبة التسليم']].map(([v, l]) => (
                <div key={l as string} className="border-r-2 border-white/30 pr-2.5">
                  <p className="price text-xl font-black"><CountUp text={String(v)} /></p>
                  <p className="text-[11px] text-white/80">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button onClick={() => go('orders')} className="h-10 px-4 rounded-full bg-white text-ink text-sm font-bold inline-flex items-center gap-1.5">افتح الطلبات <ArrowUpLeft className="w-4 h-4" /></button>
              <button onClick={() => go('products')} className="chip h-10 px-4 rounded-full text-sm font-bold inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> منتج جديد</button>
            </div>
          </div>
          <Ring pct={pct} photos={photos} />
        </section>

        {/* today */}
        <section className="glass lift rounded-3xl p-5 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex items-end gap-2">
              <span className="price text-5xl font-black text-gold-deep leading-none">{String(now.getDate()).padStart(2, '0')}</span>
              <span className="pb-1"><b className="block text-ink">{DAYS[now.getDay()]}</b><span className="text-xs text-ink/55">{MONTHS[now.getMonth()]} {now.getFullYear()}</span></span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-4 text-center">
            {week.map((d) => (
              <div key={d.toDateString()} className={`rounded-xl py-1.5 ${d.toDateString() === now.toDateString() ? 'bg-gold text-white shadow-md' : 'text-ink/70'}`}>
                <span className="block text-[10px] font-bold">{DAYS[d.getDay()].slice(0, 2)}</span>
                <span className="price block text-sm font-black">{d.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 flex-1">
            <button onClick={() => go('orders')} className="w-full text-right rounded-xl bg-white/60 p-3 flex items-center gap-3 hover:bg-white/80 transition">
              <span className="w-1 self-stretch rounded-full bg-gold" />
              <span className="flex-1"><b className="block text-sm text-ink">طلبات محتاجة تأكيد</b><span className="text-xs text-ink/55">كلّم العميل وأكّد</span></span>
              <span className="price text-lg font-black text-ink">{pending}</span>
            </button>
            <button onClick={() => go('products')} className="w-full text-right rounded-xl bg-white/60 p-3 flex items-center gap-3 hover:bg-white/80 transition">
              <span className={`w-1 self-stretch rounded-full ${sum.stock.low > 0 ? 'bg-sale' : 'bg-save'}`} />
              <span className="flex-1"><b className="block text-sm text-ink">منتجات قربت تخلص</b><span className="text-xs text-ink/55">باقي 5 قطع أو أقل</span></span>
              <span className="price text-lg font-black text-ink">{sum.stock.low}</span>
            </button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Wallet className="w-4 h-4" />} label="المبيعات (اتسلّمت)" value={money(sum.revenue)} sub={`${sum.deliveredCount} طلب`} />
        <Stat icon={<ArrowUpLeft className="w-4 h-4" />} label="صافي الربح" value={money(sum.netProfit)} tone={sum.netProfit >= 0 ? 'good' : 'bad'} sub="بعد التكلفة والمصاريف" />
        <Stat icon={<Truck className="w-4 h-4" />} label="طلبات لسه ماتسلمتش" value={money(sum.orders.pipelineValue)} sub={`${sum.orders.pipelineCount} طلب`} tone="brand" />
        <Stat icon={<Boxes className="w-4 h-4" />} label="قيمة المخزن بالتكلفة" value={money(Math.round(sum.stock.cost))} sub={`بسعر البيع ${money(Math.round(sum.stock.value))}`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        <Card title="المبيعات اليومية" className="lg:col-span-3">
          {sum.days.length === 0 ? (
            <Empty title="مفيش طلبات الشهر ده لسه" />
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto no-scrollbar" role="img" aria-label="رسم المبيعات اليومية">
              {sum.days.map((d: any) => (
                <div key={d.d} className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] text-steel opacity-0 group-hover:opacity-100 price">{Number(d.rev).toLocaleString('en-US')}</span>
                  <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-gold-deep to-[#ffad6e] origin-bottom animate-[ag-bar_.9s_cubic-bezier(.2,.8,.2,1)_backwards]" style={{ height: `${Math.max(2, (Number(d.rev) / maxRev) * 85)}%` }} title={`${d.d}: ${money(d.rev)}`} />
                  <span className="text-[10px] text-steel mt-1 price">{d.d.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="الأكثر مبيعاً" className="lg:col-span-2">
          {sum.topProducts.length === 0 ? (
            <Empty title="لسه مفيش مبيعات" />
          ) : (
            <ul className="divide-y divide-line">
              {sum.topProducts.map((p: any) => (
                <li key={p.name} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-ink line-clamp-1">{p.name}</span>
                  <span className="text-steel shrink-0 price">{p.qty} قطعة</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="آخر الطلبات" action={<Button variant="ghost" onClick={() => go('orders')}>كل الطلبات</Button>}>
        {!orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty title="مفيش طلبات لسه" text="أول ما عميل يطلب من الموقع هيظهر هنا." />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold text-ink truncate">{o.customer_name}</span>
                  <span className="block text-xs text-steel price">{o.code} · {o.created_at.slice(0, 16)}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="price font-bold text-sm">{money(o.total)}</span>
                  <StatusBadge s={o.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
